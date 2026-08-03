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
    forgotPassword.body.includes('איפוס סיסמה'),
    '/forgot-password does not render the recovery screen',
  );

  const privacy = await text('/privacy');
  assert(privacy.body.includes('מדיניות פרטיות'), '/privacy does not render its heading');

  const accessibility = await text('/accessibility');
  assert(accessibility.body.includes('הצהרת נגישות'), '/accessibility does not render its heading');

  const notFound = await text('/qa-production-smoke-not-found', 404);
  assert(notFound.body.includes('לא נמצא'), 'The public 404 page is not localized to Hebrew');

  const robots = await text('/robots.txt');
  for (const path of ['/e/', '/dashboard/', '/admin/']) {
    assert(robots.body.includes(`Disallow: ${path}`), `robots.txt does not disallow ${path}`);
  }

  const sitemap = await text('/sitemap.xml');
  for (const path of ['/', '/pricing', '/privacy', '/accessibility']) {
    assert(sitemap.body.includes(`${baseUrl}${path}`), `sitemap.xml is missing ${path}`);
  }
  for (const path of ['/signup', '/login', '/dashboard', '/e/']) {
    assert(!sitemap.body.includes(`${baseUrl}${path}`), `sitemap.xml exposes private path ${path}`);
  }

  const image = await request('/opengraph-image');
  const imageBytes = Buffer.from(await image.arrayBuffer());
  assert(image.status === 200, `/opengraph-image returned ${image.status}`);
  assert(image.headers.get('content-type')?.includes('image/png'), '/opengraph-image is not a PNG');
  assert(imageBytes.byteLength > 10_000, '/opengraph-image appears blank or truncated');

  console.log(`Production verified: ${baseUrl} serves release ${health.release}`);
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
