import { readFileSync } from 'node:fs';

const baseUrl = (process.env.PRODUCTION_URL ?? 'https://arrival-confirmations.vercel.app').replace(
  /\/+$/,
  '',
);
const expectedSha = process.env.EXPECTED_SHA?.trim() ?? '';
const attempts = Number.parseInt(process.env.VERIFY_ATTEMPTS ?? '1', 10);
const intervalMs = Number.parseInt(process.env.VERIFY_INTERVAL_MS ?? '10000', 10);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'manual',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'User-Agent': 'arrival-confirmations-production-smoke/1.0',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  return response;
}

async function text(path, expectedStatus = 200) {
  const response = await request(path);
  const body = await response.text();
  assert(
    response.status === expectedStatus,
    `${path} returned ${response.status}; expected ${expectedStatus}`,
  );
  return { response, body };
}

async function verify() {
  const healthResponse = await request('/api/health');
  assert(healthResponse.status === 200, `/api/health returned ${healthResponse.status}`);
  assert(
    healthResponse.headers.get('cache-control')?.includes('no-store'),
    '/api/health must never be cached',
  );
  const health = await healthResponse.json();
  assert(health.status === 'ok', '/api/health did not report status=ok');
  assert(typeof health.release === 'string' && health.release.length > 0, 'Missing release SHA');
  if (expectedSha !== '') {
    assert(
      health.release === expectedSha,
      `Production serves ${health.release}; expected merged release ${expectedSha}`,
    );
  }

  const home = await text('/');
  assert(
    home.body.includes('Basic ב-99 ₪, Premium ב-199 ₪ או Pro ב-349 ₪'),
    'Landing page does not contain the current three-plan pricing copy',
  );
  assert(
    !home.body.includes('Basic ב-99 ₪ או Premium ב-199 ₪'),
    'Landing page still contains the obsolete two-plan pricing copy',
  );

  const requiredHeaders = {
    'content-security-policy': "frame-ancestors 'none'",
    'x-frame-options': 'DENY',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'strict-transport-security': 'max-age=',
  };
  for (const [header, expectedFragment] of Object.entries(requiredHeaders)) {
    const value = home.response.headers.get(header) ?? '';
    assert(value.includes(expectedFragment), `${header} is missing ${expectedFragment}`);
  }

  const signup = await text('/signup');
  assert(
    signup.body.includes('עד 10 אישורי הגעה לבדיקה'),
    'Signup page does not state the real trial limit',
  );
  assert(
    !signup.body.includes('בלי הגבלה על מספר האורחים'),
    'Signup page still makes the obsolete unlimited-guests claim',
  );

  const pricing = await text('/pricing');
  for (const value of ['Basic', 'Premium', 'Pro', '99', '199', '349']) {
    assert(pricing.body.includes(value), `/pricing is missing ${value}`);
  }

  const login = await text('/login');
  assert(login.body.includes('כניסה לחשבון'), '/login does not render the sign-in screen');

  const forgotPassword = await text('/forgot-password');
  assert(
    forgotPassword.body.includes('שחזור סיסמה'),
    '/forgot-password does not render the recovery screen',
  );

  const privacy = await text('/privacy');
  assert(privacy.body.includes('מדיניות פרטיות'), '/privacy does not render its heading');

  const accessibility = await text('/accessibility');
  assert(accessibility.body.includes('הצהרת נגישות'), '/accessibility does not render its heading');

  const notFound = await text('/qa-production-smoke-not-found', 404);
  assert(notFound.body.includes('לא נמצא'), 'The public 404 page is not localized to Hebrew');

  const robots = await text('/robots.txt');
  for (const path of ['/api/', '/invite', '/share/', '/e/', '/dashboard/', '/admin/']) {
    assert(robots.body.includes(`Disallow: ${path}`), `robots.txt does not disallow ${path}`);
  }

  const sitemap = await text('/sitemap.xml');
  for (const path of [
    '/',
    '/en',
    '/pricing',
    '/en/pricing',
    '/guide',
    '/en/guide',
    '/privacy',
    '/en/privacy',
    '/accessibility',
    '/en/accessibility',
  ]) {
    assert(sitemap.body.includes(`${baseUrl}${path}`), `sitemap.xml is missing ${path}`);
  }
  for (const path of ['/signup', '/login', '/dashboard', '/e/', '/invite', '/share/', '/api/']) {
    assert(!sitemap.body.includes(`${baseUrl}${path}`), `sitemap.xml exposes private path ${path}`);
  }

  for (const path of ['/guide', '/en/guide']) {
    const guide = await text(path);
    assert(guide.body.includes('application/ld+json'), `${path} is missing structured data`);
    assert(guide.body.includes(`${baseUrl}${path}`), `${path} is missing its canonical URL`);
  }
  for (const path of ['/llms.txt', '/llms-full.txt']) {
    const reference = await text(path);
    assert(
      reference.response.headers.get('content-type')?.includes('text/plain'),
      `${path} must be plain text`,
    );
    assert(reference.body.includes('Nisan Sinai Technologies'), `${path} is missing the publisher`);
    assert(
      !/https?:\/\/[^\s)]+\/(?:e|invite|share|dashboard|admin|api)\//.test(reference.body),
      `${path} exposes a private URL`,
    );
  }

  const indexNow = JSON.parse(readFileSync(new URL('../config/indexnow.json', import.meta.url)));
  const keyFile = await text(indexNow.ownershipFile);
  assert(
    keyFile.body.trim() === indexNow.ownershipFile.slice(1, -4),
    'IndexNow ownership file is missing or incorrect',
  );
  const bingFile = await text('/BingSiteAuth.xml');
  const bingExpected = readFileSync(new URL('../public/BingSiteAuth.xml', import.meta.url), 'utf8');
  assert(
    bingFile.body.trim() === bingExpected.trim(),
    'Bing ownership file is missing or incorrect',
  );

  // Every public page must publish its own social preview in both languages.
  for (const prefix of ['', '/en']) {
    for (const path of ['', '/pricing', '/guide', '/privacy', '/accessibility']) {
      const route = `${prefix}${path}` || '/';
      const page = await text(route);
      for (const tag of ['property="og:image"', 'name="twitter:image"']) {
        const image = page.body.match(new RegExp(`<meta ${tag} content="([^"]+)"`))?.[1];
        assert(image, `${route} is missing ${tag}`);
        const url = new URL(image.replace(/&amp;/g, '&'));
        assert(url.origin === baseUrl, `${route} social image must use the production origin`);
        if (prefix) assert(url.pathname === '/social-image/en', `${route} image must be English`);
      }
    }
  }
  for (const locale of ['he', 'en']) {
    const response = await request(`/social-image/${locale}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert(response.status === 200, `${locale} social image is unavailable`);
    assert(response.headers.get('content-type')?.includes('image/png'), 'Social image is not PNG');
    assert(
      bytes.byteLength > 10_000 && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a',
      'Social image is empty or invalid',
    );
    assert(
      bytes.readUInt32BE(16) === 1200 && bytes.readUInt32BE(20) === 630,
      'Social image has the wrong size',
    );
  }

  // The Hebrew home retains its file-based hashed image. Fetch the advertised URL
  // rather than assuming a special-file filename; this is what crawlers fetch.
  const ogImage = home.body
    .match(/property="og:image" content="([^"]+)"/)?.[1]
    ?.replace(/&amp;/g, '&');
  assert(typeof ogImage === 'string' && ogImage.length > 0, 'Landing page declares no og:image');
  const ogImageUrl = new URL(ogImage);
  const image = await request(`${ogImageUrl.pathname}${ogImageUrl.search}`);
  const imageBytes = Buffer.from(await image.arrayBuffer());
  assert(image.status === 200, `${ogImageUrl.pathname} returned ${image.status}`);
  assert(image.headers.get('content-type')?.includes('image/png'), 'og:image is not a PNG');
  assert(imageBytes.byteLength > 10_000, 'og:image appears blank or truncated');

  process.stdout.write(`Production verified: ${baseUrl} serves release ${health.release}\n`);
}

let lastError;
for (let attempt = 1; attempt <= Math.max(attempts, 1); attempt += 1) {
  try {
    await verify();
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`Production verification attempt ${attempt}/${attempts} failed:`, error.message);
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}

throw lastError;
