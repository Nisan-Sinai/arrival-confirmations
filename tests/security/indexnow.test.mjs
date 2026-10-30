import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  changedIndexNowUrls,
  publicIndexNowUrls,
  submitIndexNow,
} from '../../scripts/submit-indexnow.mjs';

const config = JSON.parse(readFileSync(new URL('../../config/indexnow.json', import.meta.url)));
const publicProof = config.ownershipFile.slice(1, -4);
const sha = 'a'.repeat(40);
const urls = publicIndexNowUrls();
function server(status = 200, release = sha, proof = publicProof) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/api/health')) return Response.json({ release });
    if (url.endsWith('.txt')) return new Response(proof);
    return new Response('', { status });
  };
  return { calls, fetcher };
}
test('publishes exactly the public bilingual sitemap routes and matching ownership proof', () => {
  const paths = JSON.parse(
    readFileSync(new URL('../../config/public-pages.json', import.meta.url)),
  );
  assert.equal(urls.length, 10);
  assert.equal(new Set(urls).size, 10);
  assert.equal(
    readFileSync(new URL(`../../public/${publicProof}.txt`, import.meta.url), 'utf8').trim(),
    publicProof,
  );
  for (const path of paths) assert(urls.includes(config.origin + path));
  assert(urls.includes(config.origin + '/en/guide'));
});
test('rejects private routes, encoded paths, queries, foreign origins and invalid keys', () => {
  for (const path of [
    '/api',
    '/e',
    '/invite',
    '/share',
    '/dashboard',
    '/admin',
    '/login',
    '/signup',
    '/auth',
    '/reset-password',
    '/forgot-password',
    '/en/invite',
    '/guide?token=abc',
    '/%65/',
    '//other.test',
  ])
    assert.throws(() => publicIndexNowUrls(config, [path]));
  assert.throws(() => publicIndexNowUrls({ ...config, origin: 'https://other.test' }));
  assert.throws(() => publicIndexNowUrls({ ...config, ownershipFile: 'bad' }));
  assert.throws(() => publicIndexNowUrls(config, []));
});
test('ignores private application and database changes and selects public content updates', () => {
  assert.deepEqual(
    changedIndexNowUrls([
      'supabase/migrations/x.sql',
      'features/admin/X.tsx',
      'app/api/assistant/route.ts',
      'app/(he)/dashboard/page.tsx',
    ]),
    [],
  );
  for (const file of [
    'features/layout/SiteFooter.tsx',
    'features/guide/content.ts',
    'features/og/ProductShareImage.tsx',
    'lib/social-image.ts',
    'config/dictionary/en.ts',
    'config/indexnow.json',
    'app/(he)/guide/page.tsx',
    'app/(en)/en/pricing/page.tsx',
    'lib/structuredData.ts',
  ])
    assert.deepEqual(changedIndexNowUrls([file]), urls);
  assert.deepEqual(changedIndexNowUrls([], true), urls);
});
test('sends nothing for a release without public changes', async () => {
  assert.deepEqual(
    await submitIndexNow([], undefined, () => {
      throw new Error('Unexpected network call');
    }),
    { count: 0, outcome: 'no_public_changes' },
  );
});
test('fails before any network access for a private URL, query, foreign host or missing SHA', async () => {
  const fetcher = () => {
    throw new Error('Unexpected network call');
  };
  for (const url of [
    `${config.origin}/invite/token`,
    `${config.origin}/guide?token=private`,
    'https://other.test/guide',
  ])
    await assert.rejects(submitIndexNow([url], sha, fetcher), /unapproved URLs/);
  await assert.rejects(submitIndexNow([urls[0]], '', fetcher), /release SHA/);
});
test('checks the exact production SHA before fetching a key or submitting', async () => {
  const s = server(200, 'b'.repeat(40));
  await assert.rejects(submitIndexNow(urls, sha, s.fetcher), /expected release/);
  assert.equal(s.calls.length, 1);
});
test('requires a reachable matching ownership key before making a notification', async () => {
  const s = server(200, sha, 'wrong-key');
  await assert.rejects(submitIndexNow(urls, sha, s.fetcher), /key file/);
  assert.equal(s.calls.length, 2);
  await assert.rejects(
    submitIndexNow(urls, sha, async () => new Response('', { status: 503 })),
    /expected release/,
  );
});
for (const status of [200, 202]) {
  test(`submits only to the official endpoint and distinguishes HTTP ${status}`, async () => {
    const s = server(status);
    const result = await submitIndexNow([...urls, urls[0]], sha, s.fetcher);
    assert.deepEqual(result, {
      count: 10,
      status,
      outcome: status === 200 ? 'key_validated' : 'pending_key_validation',
    });
    assert.equal(s.calls.length, 3);
    const post = s.calls[2];
    assert.equal(post.url, 'https://api.indexnow.org/indexnow');
    assert.equal(post.options.method, 'POST');
    const payload = JSON.parse(post.options.body);
    assert.deepEqual(payload.urlList, urls);
    assert.equal(payload.host, 'arrival-confirmations.vercel.app');
    assert.equal(payload.keyLocation, `${config.origin}/${publicProof}.txt`);
    for (const call of s.calls) {
      assert.equal(call.options.redirect, 'error');
      assert(call.options.signal instanceof AbortSignal);
    }
  });
}
test('reports rejection or rate limits without automatic retries', async () => {
  for (const status of [400, 403, 422, 429, 500]) {
    const s = server(status);
    await assert.rejects(submitIndexNow(urls, sha, s.fetcher), new RegExp(`HTTP ${status}`));
    assert.equal(s.calls.length, 3);
  }
});
test('runs notifications only after a successful main-branch production integrity push', () => {
  const workflow = readFileSync(
    new URL('../../.github/workflows/indexnow.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /workflows: \['Production integrity'\]/);
  assert.match(workflow, /branches: \[main\]/);
  assert.match(workflow, /conclusion == 'success'/);
  assert.match(workflow, /event == 'push'/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /secrets\.|issues: write|contents: write/);
});
