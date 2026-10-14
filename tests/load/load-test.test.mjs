import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  assertLocalTarget,
  main,
  parseStages,
  percentile,
  runStage,
  summarize,
} from '../../scripts/load-test.mjs';

let server;
let origin;
let temp;
let counter = 0;
before(async () => {
  server = createServer((req, res) => {
    counter++;
    res.writeHead(req.url === '/broken' ? 503 : 200, { 'content-type': 'text/plain' });
    res.end('ok');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  temp = await mkdtemp(path.join(os.tmpdir(), 'arrival-load-test-'));
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(temp, { recursive: true, force: true });
});

test('refuses remote domains, production, https, DNS aliases, redirects, credentials, and paths', () => {
  for (const raw of [
    'https://arrival-confirmations.vercel.app',
    'http://arrival-confirmations.vercel.app',
    'http://localhost:3000',
    'https://127.0.0.1:3000',
    'http://127.0.0.1:3000/evil',
    'http://admin:pass@127.0.0.1:3000',
    'http://127.0.0.1',
    'http://127.0.0.1:80',
    'http://127.0.0.1:3000/?redirect=https://evil.example',
  ])
    assert.throws(() => assertLocalTarget(raw));
  assert.equal(assertLocalTarget(origin), origin);
});

test('caps concurrency and rejects malformed or duplicate stages', () => {
  assert.deepEqual(parseStages('100,200'), [100, 200]);
  for (const raw of ['0', '-1', '100,100', '201', '20,30,40', 'a,b', '1.5', '']) {
    assert.throws(() => parseStages(raw));
  }
});

test('reports percentile and failures; fails closed on missing responses', () => {
  assert.equal(percentile([10, 20, 30, 40], 0.95), 40);
  assert.equal(percentile([], 0.95), null);
  const good = summarize(
    2,
    1,
    [
      { success: true, durationMs: 40 },
      { success: true, durationMs: 70 },
    ],
    100,
    1,
    200,
  );
  assert.equal(good.passed, true);
  const missing = summarize(2, 1, [{ success: true, durationMs: 20 }], 100, 1, 200);
  assert.equal(missing.passed, false);
  const failed = summarize(
    2,
    1,
    [
      { success: true, durationMs: 20 },
      { success: false, path: '/', error: 'HTTP 500' },
    ],
    100,
    1,
    200,
  );
  assert.equal(failed.passed, false);
});

test('runs actual local HTTP traffic and writes machine-readable results', async () => {
  const reportFile = path.join(temp, 'load-report.json');
  const beforeCount = counter;
  const report = await main({
    LOAD_BASE_URL: origin,
    LOAD_USERS: '3,4',
    LOAD_ROUNDS: '2',
    LOAD_MAX_P95_MS: '10000',
    LOAD_REPORT_PATH: reportFile,
  });
  assert.equal(counter - beforeCount, 3 + 3 * 2 + 4 * 2);
  assert.equal(report.results.length, 2);
  assert.deepEqual(
    report.results.map((x) => x.concurrency),
    [3, 4],
  );
  assert.ok(report.results.every((x) => x.passed && x.failed === 0));
  assert.deepEqual(JSON.parse(await readFile(reportFile, 'utf8')), report);
});

test('rejects hosted execution before the first HTTP request', async () => {
  const beforeCount = counter;
  await assert.rejects(main({ LOAD_BASE_URL: origin, VERCEL_ENV: 'production' }));
  await assert.rejects(main({ LOAD_BASE_URL: origin, NODE_ENV: 'production' }));
  assert.equal(counter, beforeCount);
});

test('captures non-200 responses as failed and applies error threshold', async () => {
  // Inject an HTTP 503 on the tested health route using a dedicated test server.
  const bad = createServer((req, res) => {
    res.writeHead(req.url === '/api/health' ? 503 : 200);
    res.end('test');
  });
  await new Promise((resolve) => bad.listen(0, '127.0.0.1', resolve));
  try {
    const result = await runStage({
      origin: `http://127.0.0.1:${bad.address().port}`,
      concurrency: 9,
      rounds: 1,
      timeoutMs: 3000,
      maxErrorPercent: 0,
      maxP95Ms: 10000,
    });
    assert.equal(result.requests, 9);
    assert.equal(result.failed, 3);
    assert.equal(result.passed, false);
    assert.ok(result.failureExamples.some((e) => e.error === 'HTTP 503'));
  } finally {
    await new Promise((resolve) => bad.close(resolve));
  }
});
