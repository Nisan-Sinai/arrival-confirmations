# Dependency security gates

The central CI security job and the separate six-hour dependency watch both run
`pnpm test:dependency-audit && pnpm check:dependency-audit`. The gate reads the
unfiltered production and full `pnpm audit --json` reports. Registry errors,
invalid reports, inconsistent counts, and unknown findings fail the check.

Production must have **zero advisories and zero vulnerability counts**. There is
no production exception, including for an advisory accepted in development.

The previous global pnpm ignore for `GHSA-vfj7-8cjw-p6xm` has been removed. Until
**2026-11-04 at 00:00 UTC**, the full audit alone may accept exactly advisory
`1240992`, affecting `braces@3.0.3`, with one high count and no other findings.
Every finding must be marked `dev: true` and use exactly this path:

```text
.>eslint-config-next>@next/eslint-plugin-next>fast-glob>micromatch>braces
```

The root manifest must list `eslint-config-next` only in `devDependencies`.
This is a temporary development vulnerability, **not a clean full audit**. An
accepted finding produces a visible GitHub warning. At expiry it fails closed;
there is no automatic extension. pnpm must also report no published patched
version (`patched_versions: null`, `patched_versions_unpublished: true`). As of
2026-10-21 the patch is unpublished; a report that identifies an available fix
fails immediately. Once available, update and verify the dependency chain, then
remove the exception rather than adding an ignore or extending it.

Run the gate tests offline with `node --test tests/security/dependency-audit.test.mjs`.
To investigate a failure, inspect `pnpm audit --prod --json` and
`pnpm audit --json`; do not disable the production check or suppress new IDs.

## Optional release-age hardening

Renovate's release-age policy is unchanged. An explicit seven-day pnpm policy
for all transitive resolutions (`minimumReleaseAge: 10080`) is **not enabled in
this change**. pnpm 11.28.5 also verifies existing frozen lockfile entries against
that policy, and the current approved lock contains releases younger than seven
days. For example, Next 16.4.2 matures on 2026-10-22 at 20:43:50 UTC.

Recheck the complete lock against the proposed policy after that time before
enabling it. Do not bypass verification with `trustLockfile`, weaken strict age
checks, add broad exclusions, or downgrade working direct pins just to pass it.
