# Isolated 100/200 virtual-user HTTP load QA

## What it proves

`.github/workflows/load-test.yml` runs a **read-only** load benchmark against a **fresh, local production build** of the application. It tests 100 and 200 concurrent virtual clients. Every client makes three sequential GET requests across `/`, `/pricing`, `/api/health` (900 measured requests, plus three warmup requests). The report includes request count, failure count/error rate, p50/p95/p99 latency, throughput and a PASS/FAIL threshold for each stage.

This is an **HTTP rendering/read smoke load test**, _not_ a test of 100 or 200 concurrent RSVP writes, WhatsApp deliveries, Supabase tenancy concurrency, or real production capacity. Those need separate, explicitly authorized isolated database fixtures and rate-limit-aware tests. Do not interpret green results as a production capacity guarantee.

## Safety contract

- Never targets `vercel.app`, Supabase, a public domain, localhost DNS aliases, HTTPS or a configured remote origin: the harness accepts **only** `http://127.0.0.1:<port>/` with a nonprivileged port.
- Requests are **GET only** to three hardcoded public routes, with `redirect: manual`; redirects are not followed.
- GitHub Actions injects only fake Supabase credentials and **never passes production secrets** to the build or runtime.
- A container-local Next.js instance is launched and terminated in the same workflow step. No production database is provisioned or modified.
- The client has at most **200** in-flight virtual users, at most two load stages and five rounds each. Every request has a timeout.
- Harness tests cover external-target rejection, production execution guards, stage caps, failure thresholds, reporting and real local HTTP traffic.

## Running it

In GitHub Actions choose **Isolated HTTP load QA → Run workflow**. Also runs once per week and on PRs that change load-test files. Each run performs 6 fast safety tests before the HTTP load phases. It does not become a required branch protection check automatically.

For a local app already listening on 127.0.0.1:3000:

```bash
node --test tests/load/load-test.test.mjs
LOAD_USERS=100,200 LOAD_ROUNDS=3 node scripts/load-test.mjs
```

Defaults: 100/200 virtual users, 3 sequential requests each, request timeout 30 seconds, <=1% failed requests and p95 <=15 seconds per stage. These are a **starter baseline**, not a service-level objective validated against production telemetry. CI runner performance varies; calibrate thresholds from stable historical measurements.

The workflow uploads `artifacts/load-test-report.json` plus the local server log for 14 days. Inspect those artifacts and the GitHub job summary to compare regressions.
