#!/bin/bash
#
# Select the Node version this project requires, then install dependencies, so
# that Claude Code on the web sessions run `pnpm lint`, `pnpm typecheck`, the
# test suite and `pnpm build` on the same Node the CI and Vercel use.
#
# Why this exists: the web sandbox's default `node` is an older major than the
# one `package.json` "engines" (and `.nvmrc`) pin, so without this every command
# printed an "Unsupported engine" warning and ran on the wrong runtime.
#
# Web-only, idempotent, and non-interactive. Local development keeps whatever
# Node manager the developer already uses.
#
# `set -e` is deliberately NOT used: nvm is documented as incompatible with
# errexit/nounset, so the nvm section relaxes those and checks exit codes itself.
set -uo pipefail

# Only the remote (Claude Code on the web) sandbox needs this; a local checkout
# manages its own Node.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# Single source of truth: read the major from .nvmrc, falling back to 24.
node_version="24"
if [ -f "$project_dir/.nvmrc" ]; then
  node_version="$(tr -d '[:space:]' <"$project_dir/.nvmrc")"
fi

log() { printf '[session-start] %s\n' "$1" >&2; }
fail() {
  printf '[session-start] ERROR: %s\n' "$1" >&2
  exit 1
}

# Load nvm from wherever the image provides it.
export NVM_DIR="${NVM_DIR:-/opt/nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
  NVM_DIR="$HOME/.nvm"
fi

node_bin=""
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # nvm trips errexit/nounset, and sourcing it plainly would auto-`nvm use` the
  # .nvmrc version (not installed yet) and abort. `--no-use` loads it inert; the
  # explicit install/use below do the work.
  set +u
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh" --no-use >/dev/null 2>&1 || true
  log "installing and selecting Node ${node_version} via nvm"
  nvm install "$node_version" >&2 || fail "nvm install ${node_version} failed"
  nvm use "$node_version" >&2 || fail "nvm use ${node_version} failed"
  node_bin="$(dirname "$(nvm which "$node_version" 2>/dev/null)")"
  set -u
else
  log "nvm not found; using node on PATH ($(command -v node || echo none))"
  node_bin="$(dirname "$(command -v node 2>/dev/null || true)")"
fi

[ -n "$node_bin" ] && [ -x "$node_bin/node" ] || fail "could not locate a node binary"

# Persist the selected Node on PATH for the rest of the session so every later
# command in this session uses it.
export PATH="${node_bin}:$PATH"
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"${node_bin}:\$PATH\"" >>"$CLAUDE_ENV_FILE"
fi

actual_major="$(node -v | sed 's/^v//; s/\..*$//')"
if [ "$actual_major" != "$node_version" ]; then
  log "warning: expected Node ${node_version}, got $(node -v)"
fi
log "node $(node -v)"

# Activate the pinned pnpm (via corepack) and install dependencies. The store is
# content-addressable, so a repeat run on a cached container is cheap.
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@11.1.3 --activate >/dev/null 2>&1 || true
log "installing dependencies with pnpm $(pnpm -v 2>/dev/null || echo '?')"
pnpm install --frozen-lockfile >&2 || fail "pnpm install failed"

log "done (node $(node -v), pnpm $(pnpm -v))"
