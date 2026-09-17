import type { ReactNode } from 'react';

import { Icon } from '@/components/ui/icons';
import { getDictionary } from '@/config/dictionary';
import { BrandMark } from '@/features/layout/BrandMark';
import { SiteHeader } from '@/features/layout/SiteHeader';
import type { Locale } from '@/lib/i18n';

/**
 * The frame around every credential screen.
 *
 * On a phone it is what it was: the card, centred, on a soft wash. From `lg` up the
 * form shares the screen with a brand panel — the mark, one sentence and three facts —
 * so a host arriving at sign-in sees the product they are signing in to rather than a
 * form floating in cream. The panel is decorative in the sense that nothing on it is
 * required to sign in, but it carries real copy, so it is ordinary content rather than
 * `aria-hidden`.
 *
 * `children` is the form (or the "check your inbox" card, or an expired-link notice);
 * `notices` are the alerts that some pages show above it.
 */
export function AuthShell({
  locale,
  children,
  notices,
}: {
  locale: Locale;
  children: ReactNode;
  notices?: ReactNode;
}) {
  const { auth, site } = getDictionary(locale);
  const icons = ['whatsapp', 'dashboard', 'credit-card'] as const;

  return (
    <>
      <SiteHeader minimal locale={locale} showLanguageSwitch />
      <main id="main" className="flex flex-1 flex-col">
        <div className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <aside className="bg-surface-ink text-primary-foreground relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center lg:px-14 xl:px-20">
            <div aria-hidden="true" className="auth-aside-glow" />
            <div className="relative max-w-md">
              <p className="text-accent flex items-center gap-2.5 text-sm font-semibold">
                <BrandMark className="text-accent size-8" />
                {site.name}
              </p>
              <p className="text-eyebrow text-accent mt-10 font-semibold">{auth.aside.eyebrow}</p>
              <h2 className="text-h2 mt-3 font-bold text-white">{auth.aside.title}</h2>
              <ul className="mt-8 flex flex-col gap-5">
                {auth.aside.points.map((point, index) => (
                  <li key={point} className="flex items-start gap-3.5">
                    <span className="border-accent/50 text-accent flex size-9 shrink-0 items-center justify-center rounded-full border">
                      <Icon name={icons[index] ?? 'check'} className="size-4" />
                    </span>
                    <span className="pt-1.5 leading-relaxed text-white/85">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="from-secondary/30 flex flex-col items-center justify-center gap-5 bg-gradient-to-b to-transparent px-5 py-14 sm:py-20 lg:px-12">
            {notices}
            {children}
          </div>
        </div>
      </main>
    </>
  );
}
