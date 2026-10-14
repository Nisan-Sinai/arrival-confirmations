#!/usr/bin/env node
/**
 * Bounded, GET-only load test of an isolated local Next.js instance.
 * Deliberately impossible to point at Vercel, Supabase or other remote hosts.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

export const PUBLIC_PATHS = Object.freeze(['/', '/pricing', '/api/health']);

export function assertLocalTarget(value) {
  const url = new URL(value);
  if (
    url.protocol !== 'http:' || url.hostname !== '127.0.0.1' ||
    !/^\d+$/.test(url.port) || Number(url.port) < 1024 ||
    url.pathname !== '/' || url.search || url.hash || url.username || url.password
  ) {
    throw new Error('Load tests must target http://127.0.0.1:<port>/ only; remote/production targets are forbidden.');
  }
  return url.origin;
}

export function parseStages(raw) {
  const parts = raw.split(',').map((x) => x.trim());
  if (!parts.length || parts.some((x) => !/^[1-9]\d*$/.test(x))) {
    throw new Error('LOAD_USERS must be a comma-separated list of positive integers');
  }
  const stages = parts.map(Number);
  if (stages.some((x) => x > 200) || new Set(stages).size !== stages.length || stages.length > 2) {
    throw new Error('Maximum 200 users per stage, two distinct stages');
  }
  return stages;
}

function boundedInteger(raw, label, min, max) {
  const value = Number(raw);
  if (!/^\d+$/.test(String(raw)) || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer in [${min}, ${max}]`);
  }
  return value;
}

export function percentile(sorted, fraction) {
  if (!sorted.length) return null;
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];
}

export function summarize(concurrency, rounds, observations, elapsedMs, maxErrorPercent, maxP95Ms) {
  const latencies = observations.filter((x) => x.success).map((x) => x.durationMs).sort((a, b) => a - b);
  const failures = observations.filter((x) => !x.success);
  const total = observations.length;
  const errorPercent = total ? (100 * failures.length) / total : 100;
  const p95 = percentile(latencies, .95);
  return {
    concurrency, rounds, requests: total, successes: latencies.length,
    failed: failures.length, errorPercent: +errorPercent.toFixed(2),
    elapsedMs: Math.round(elapsedMs), requestsPerSecond: +(total / (elapsedMs / 1000)).toFixed(2),
    p50Ms: percentile(latencies, .5), p95Ms: p95, p99Ms: percentile(latencies, .99),
    failureExamples: failures.slice(0, 5).map(({ path, error }) => ({ path, error })),
    passed: total === concurrency * rounds && errorPercent <= maxErrorPercent &&
      p95 !== null && p95 <= maxP95Ms,
  };
}

export async function runStage({ origin, concurrency, rounds, timeoutMs, maxErrorPercent, maxP95Ms }) {
  const observations = [];
  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async (_, user) => {
    for (let round = 0; round < rounds; round++) {
      const route = PUBLIC_PATHS[(user + round) % PUBLIC_PATHS.length];
      const requestStart = performance.now();
      try {
        const response = await fetch(origin + route, {
          method: 'GET', redirect: 'manual', cache: 'no-store',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'User-Agent': 'arrival-confirmations-local-load-qa/1.0' },
        });
        // Drain bodies so we measure full responses and do not leak connections.
        await response.arrayBuffer();
        const durationMs = Math.round(performance.now() - requestStart);
        observations.push({ success: response.status === 200, durationMs, path: route,
          error: response.status === 200 ? undefined : `HTTP ${response.status}` });
      } catch (error) {
        observations.push({ success: false, durationMs: Math.round(performance.now() - requestStart),
          path: route, error: error?.name === 'TimeoutError' ? 'request timeout' : String(error).slice(0, 140) });
      }
    }
  }));
  return summarize(concurrency, rounds, observations, performance.now() - started,
    maxErrorPercent, maxP95Ms);
}

export async function main(env = process.env) {
  if (env.VERCEL || env.VERCEL_ENV || env.NODE_ENV === 'production') {
    throw new Error('Refusing load tests in production/hosted process environments');
  }
  const origin = assertLocalTarget(env.LOAD_BASE_URL || 'http://127.0.0.1:3000');
  const stages = parseStages(env.LOAD_USERS || '100,200');
  const rounds = boundedInteger(env.LOAD_ROUNDS || '3', 'LOAD_ROUNDS', 1, 5);
  const timeoutMs = boundedInteger(env.LOAD_TIMEOUT_MS || '30000', 'LOAD_TIMEOUT_MS', 1000, 60000);
  const maxP95Ms = boundedInteger(env.LOAD_MAX_P95_MS || '15000', 'LOAD_MAX_P95_MS', 500, 60000);
  const maxErrorPercent = Number(env.LOAD_MAX_ERROR_PERCENT || '1');
  if (!Number.isFinite(maxErrorPercent) || maxErrorPercent < 0 || maxErrorPercent > 5) {
    throw new Error('LOAD_MAX_ERROR_PERCENT must be between 0 and 5');
  }
  // Warm up the local instance; fail before load if any public route is unavailable.
  for (const route of PUBLIC_PATHS) {
    const response = await fetch(origin + route, {
      method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs),
    });
    await response.arrayBuffer();
    if (response.status !== 200) throw new Error(`Warmup: ${route} returned HTTP ${response.status}`);
  }
  const results = [];
  for (const concurrency of stages) {
    const summary = await runStage({ origin, concurrency, rounds, timeoutMs, maxErrorPercent, maxP95Ms });
    results.push(summary);
    console.log(`Users=${concurrency} requests=${summary.requests} failures=${summary.failed} ` +
      `p95=${summary.p95Ms}ms p99=${summary.p99Ms}ms rate=${summary.requestsPerSecond}/s ` +
      `${summary.passed ? 'PASS' : 'FAIL'}`);
  }
  const report = { mode: 'local-read-only', target: origin, publicPaths: PUBLIC_PATHS,
    thresholds: { maxErrorPercent, maxP95Ms }, results };
  const reportPath = path.resolve(env.LOAD_REPORT_PATH || 'load-report.json');
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  if (results.some((x) => !x.passed)) throw new Error(`Load thresholds exceeded; see ${reportPath}`);
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
