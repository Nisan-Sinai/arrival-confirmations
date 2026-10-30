# Search and AI discovery

Public product: https://arrival-confirmations.vercel.app/

## Scope

- Hebrew and English landing, plans, guide, privacy and accessibility pages: ten canonical URLs, reciprocal hreflang and Hebrew x-default.
- `/llms.txt` and `/llms-full.txt` are static UTF-8 references generated from the same public dictionaries, plan catalogue and guide as the visible website. They do not query Supabase, sessions or invitations. Prices and features follow the catalogue at build time.
- `/guide` and `/en/guide` explain event preparation, WhatsApp sending, reply management, plan selection and privacy using implemented product features. Linked from the landing page and footer, with WebPage and BreadcrumbList JSON-LD.
- The publisher links to Nisan Sinai Technologies and uses the business website's stable `/#business` identity. The RSVP application has its own stable `/#application` identity. No invented reviews, customer counts, street address or outcomes.
- English Premium copy now matches Hebrew manual WhatsApp sending. The guide explains that central automatic sending requires platform activation; it is not promised for every event.
- Existing RTL/LTR, authentication, RSVP actions, plan prices, database access controls and invitation previews are preserved.

## Privacy and crawler access

The wildcard robots rule allows public pages, including search and AI search crawlers. Both language variants of invitation, guest sharing, account and management paths are disallowed; API paths are also disallowed. Private invitation, API, sharing and management responses carry `X-Robots-Tag: noindex, nofollow, noarchive` as an additional exclusion signal.

Robots and noindex are discovery controls, not authorization. Existing server authentication, invite token checks and database RLS remain the access controls. Never add guest names, phone numbers, tokens, event IDs or customer exports to the sitemap, guide, reference files or structured data. Public contact information is the support contact already published on the website.

## Regression checks

- Unit: public URL allowlist, private crawl rules, publisher/product identities, reference content and catalogue consistency, UTF-8 route responses and private response headers.
- Components: guide content, canonical/hreflang, localized metadata, breadcrumbs and publisher.
- Browser: all ten public canonicals and language alternates, guide at 320px, axe WCAG AA scans, structured data, references and crawl endpoints. User-agent requests confirm public responses, not access from real crawler IP ranges.
- Production verification: exact release SHA, existing auth and product checks, sitemap and robots, both guides and both reference files.
- Existing formatting, lint, types, coverage, dependency audit, secret/bundle scan, database integration/RLS and browser/Lighthouse gates remain required.

The repo uses pnpm; it has no `npm run qa`. `pnpm ci` is its complete local QA script, with additional CI database and performance jobs. Test/build placeholders must remain fake; never run database fixtures against production. CI unit verification uses UTC, matching hosted builds.

Current development dependency advisories were fixed with narrow maintenance overrides for fast-uri 3.1.9, undici 8.12.2 and qs 6.16.1. Production dependencies were already clean; no audit or required check was bypassed.

## External follow-up

Submit `/sitemap.xml` in the site's verified Google Search Console and Bing Webmaster Tools properties. Inspect `/guide` and `/en/guide` after deployment. Monitor actual index coverage, search queries and referral traffic; accepted submissions do not prove indexing. Core Web Vitals require sufficient real-user field data; Lighthouse and responsive tests are laboratory checks.

No paid service is required or added. A separate custom domain is optional and outside this change.

## Primary guidance

- [Google AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google guidance for generative AI search](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [OpenAI crawler controls](https://developers.openai.com/api/docs/bots)

Search accessibility, useful visible content and accurate structured data are the foundation. `llms.txt` is an optional reference for systems that use it; Google does not require it. None of these changes guarantees crawling, indexing, ranking or an AI recommendation.
