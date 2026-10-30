import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const settings = JSON.parse(readFileSync(new URL('../config/indexnow.json', import.meta.url)));
const pages = JSON.parse(readFileSync(new URL('../config/public-pages.json', import.meta.url)));
const productionOrigin = 'https://arrival-confirmations.vercel.app';
const endpoint = 'https://api.indexnow.org/indexnow';
const privatePath =
  /^\/(?:en\/)?(?:api|e|invite|share|dashboard|admin|auth|login|signup|forgot-password|reset-password)(?:\/|$)/;

/** The same route allowlist drives the sitemap. Never discover URLs in event data. */
export function publicIndexNowUrls(config = settings, publicPages = pages) {
  if (config.origin !== productionOrigin || !/^\/[a-f0-9]{32}\.txt$/.test(config.ownershipFile)) {
    throw new Error('Invalid public IndexNow configuration');
  }
  if (
    !Array.isArray(publicPages) ||
    publicPages.length === 0 ||
    publicPages.some(
      (path) =>
        typeof path !== 'string' ||
        !/^\/(?:[a-z]+(?:-[a-z]+)*)?$/.test(path) ||
        privatePath.test(path),
    )
  )
    throw new Error('Only public marketing routes may be submitted');
  return [
    ...new Set(
      publicPages.flatMap((path) => [
        `${config.origin}${path}`,
        `${config.origin}${path === '/' ? '/en' : `/en${path}`}`,
      ]),
    ),
  ];
}

/** Administrative changes do not ping search engines. Shared public copy affects all public pages. */
export function changedIndexNowUrls(files, allPublic = false) {
  const publicChange = files.some(
    (file) =>
      /^(?:features\/(?:landing|pricing|legal|guide)\/|features\/layout\/(?:RootDocument|SiteFooter|SiteHeader|BrandMark|LanguageSwitch)\.tsx$|config\/(?:dictionary\/|public-pages\.json$|indexnow\.json$)|app\/_lib\/plans\.ts$|app\/globals\.css$|lib\/(?:seo|structuredData)\.ts$)/.test(
        file,
      ) ||
      /^app\/\((?:he|en)\)\/(?:en\/)?(?:(?:pricing|guide|privacy|accessibility)\/)?page\.tsx$/.test(
        file,
      ),
  );
  return allPublic || publicChange ? publicIndexNowUrls() : [];
}

/** Verify the exact live release and ownership proof before notifying the official endpoint. */
export async function submitIndexNow(urls, expectedSha, fetcher = fetch) {
  const allowed = new Set(publicIndexNowUrls());
  if (!Array.isArray(urls) || urls.some((url) => !allowed.has(url))) {
    throw new Error('Refusing off-property, private or unapproved URLs');
  }
  const unique = [...new Set(urls)];
  if (unique.length === 0) return { count: 0, outcome: 'no_public_changes' };
  if (!/^[a-f0-9]{40}$/.test(expectedSha ?? ''))
    throw new Error('An exact production release SHA is required');
  const options = () => ({ redirect: 'error', signal: AbortSignal.timeout(20_000) });
  const health = await fetcher(`${productionOrigin}/api/health`, {
    ...options(),
    cache: 'no-store',
  });
  if (!health.ok || (await health.json()).release !== expectedSha) {
    throw new Error('Production does not serve the expected release; nothing submitted');
  }
  const key = settings.ownershipFile.slice(1, -4);
  const keyLocation = `${productionOrigin}${settings.ownershipFile}`;
  const proof = await fetcher(keyLocation, options());
  if (!proof.ok || (await proof.text()).trim() !== key) {
    throw new Error('Public IndexNow key file is missing or incorrect; nothing submitted');
  }
  const response = await fetcher(endpoint, {
    ...options(),
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(productionOrigin).host,
      key,
      keyLocation,
      urlList: unique,
    }),
  });
  if (![200, 202].includes(response.status)) {
    throw new Error(
      `IndexNow rejected the notification (HTTP ${response.status}); no automatic retry`,
    );
  }
  return {
    count: unique.length,
    status: response.status,
    outcome: response.status === 200 ? 'key_validated' : 'pending_key_validation',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const files = execFileSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD'], { encoding: 'utf8' })
    .trim()
    .split('\n');
  const urls = changedIndexNowUrls(files, process.env.INDEXNOW_ALL_PUBLIC === '1');
  try {
    const result = await submitIndexNow(urls, process.env.EXPECTED_SHA);
    process.stdout.write(
      `IndexNow: ${JSON.stringify(result)}. Notification acceptance does not confirm crawling or indexing.\n`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
