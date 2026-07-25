import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

/**
 * Without this, Turbopack walks up the filesystem looking for a lockfile and can
 * settle on one outside the project — a stray `package-lock.json` in the user's home
 * directory, for instance — which changes how modules resolve. Pinning the root here
 * makes the build identical on a developer machine, in CI, and on Vercel.
 */
const projectRoot = fileURLToPath(new URL('.', import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // A leaked stack trace is an information disclosure (§13).
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
};

export default nextConfig;
