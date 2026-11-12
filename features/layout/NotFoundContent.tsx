import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { Rule } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { BrandMark } from '@/features/layout/BrandMark';
import { defaultLocale, localePath, type Locale } from '@/lib/i18n';

/**
 * The body of the 404 page (§13), shared by the two places a miss can surface.
 *
 * A `notFound()` thrown inside the Hebrew route tree renders through `app/(he)`'s root
 * layout, so `app/(he)/not-found.tsx` needs the content alone. A genuinely unmatched
 * URL has no layout to render in — the site has two root layouts and neither owns an
 * address that was never routed — so `app/not-found.tsx` wraps this same content in the
 * document shell itself. Keeping the content here is what stops the two drifting.
 *
 * The copy is careful about one thing. This answers both "no such event" and "that
 * event is not published", and the invitation page returns the same 404 for either on
 * purpose (§4.2) — telling them apart would make the id space enumerable one probe at a
 * time. So the wording suggests asking the host rather than implying the link was valid.
 */
export function NotFoundContent({ locale = defaultLocale }: { locale?: Locale }) {
  const copy = getDictionary(locale).errors;

  return (
    <main
      id="main"
      className="relative isolate flex flex-1 items-center justify-center overflow-clip px-5 py-20 sm:py-28"
    >
      {/*
        The figure itself, very large and very faint, behind the card. It is the one
        thing on this page a reader recognises before reading anything.

        Drawn as generated content rather than as a text node, because that is what it
        is: WCAG exempts pure decoration from the contrast rule, but an accessibility
        scanner measures every text node it finds and cannot know this one is a
        watermark. `content` puts the glyphs in the paint and nowhere in the document, so
        there is nothing to read, announce, select or audit — the eyebrow below states
        the number for everyone.
      */}
      <div
        aria-hidden="true"
        className="before:text-primary/[0.045] pointer-events-none absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 text-center font-[family-name:var(--font-display)] text-[clamp(9rem,38vw,22rem)] leading-none font-bold select-none before:content-['404']"
      />
      <div className="w-full max-w-lg text-center">
        <span
          aria-hidden="true"
          className="border-accent-strong/30 bg-card shadow-raised mx-auto mb-7 flex size-16 items-center justify-center rounded-2xl border"
        >
          <BrandMark className="size-9" />
        </span>
        <p className="text-eyebrow text-accent-strong font-semibold">{copy.notFoundEyebrow}</p>
        <h1 className="text-h1 text-primary mt-4 font-bold">{copy.notFoundTitle}</h1>
        <Rule draw="load" className="my-7" />
        <p className="text-muted-foreground text-lead leading-relaxed">
          {copy.notFoundBody} {copy.notFoundInviteHint}
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href={localePath(locale, '/')} className={buttonClass({ size: 'lg' })}>
            {copy.notFoundHome}
          </Link>
          <Link
            href={localePath(locale, '/login')}
            className={buttonClass({ variant: 'outline', size: 'lg' })}
          >
            {copy.notFoundLogin}
          </Link>
        </div>
      </div>
    </main>
  );
}
