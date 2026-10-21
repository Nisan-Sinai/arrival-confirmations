#!/usr/bin/env bash
set -euo pipefail

# The production build was compiled with the same non-secret CI placeholders.
export NEXT_PUBLIC_SUPABASE_URL=https://ci-placeholder.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${GITHUB_SHA:?CI commit SHA is required}"
export NEXT_PUBLIC_SITE_URL=http://localhost:3000
export SUPABASE_SERVICE_ROLE_KEY="$GITHUB_SHA"
export TOKEN_PEPPER="$GITHUB_SHA"
export IP_HASH_PEPPER="$GITHUB_SHA"

pnpm start &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
for attempt in {1..60}; do
  curl --fail --silent http://127.0.0.1:3000/ >/dev/null && break
  sleep 1
done
curl --fail --silent http://127.0.0.1:3000/ >/dev/null

export CHROME_PATH="$(node -e "console.log(require('@playwright/test').chromium.executablePath())")"
pnpm dlx lighthouse@12.8.2 http://127.0.0.1:3000/ --quiet --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" --output=json --output-path=lighthouse-home.json
pnpm dlx lighthouse@12.8.2 http://127.0.0.1:3000/pricing --quiet --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" --output=json --output-path=lighthouse-pricing.json
pnpm dlx lighthouse@12.8.2 http://127.0.0.1:3000/accessibility --quiet --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" --output=json --output-path=lighthouse-accessibility.json
node scripts/report-lighthouse.mjs
