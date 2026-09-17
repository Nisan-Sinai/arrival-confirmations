import Link from 'next/link';

import { formatPlanPrice, getPlanCatalog } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icons';
import { getDictionary } from '@/config/dictionary';
import { TiltCard } from '@/features/landing/TiltCard';
import { defaultLocale, localePath, type Locale } from '@/lib/i18n';
import { supportWhatsAppUrl } from '@/lib/supportContact';
import { cn } from '@/lib/utils';

export function PricingCards({
  showTrial = true,
  locale = defaultLocale,
  headingLevel = 'h3',
}: {
  showTrial?: boolean;
  locale?: Locale;
  /**
   * The level for each plan name, because the right one depends on what precedes the
   * grid rather than on the grid itself.
   *
   * On the landing page a section `h2` introduces the plans, so `h3` continues the
   * outline. On `/pricing` the cards follow the page `h1` directly, and leaving the
   * default there skipped a level — the outline read h1 → h3, which is what a screen
   * reader navigating by heading actually announces.
   */
  headingLevel?: 'h2' | 'h3';
}) {
  const dictionary = getDictionary(locale);
  const copy = dictionary.pricing;
  const catalog = getPlanCatalog(locale);
  const plans = showTrial ? catalog : catalog.filter((plan) => plan.code !== 'trial');

  return (
    <div
      /*
       * Four plans belong in one row once there is room for one.
       *
       * They were laid out two-by-two at every width above `md`, which on a desktop put
       * the trial beside Basic and Premium beside Pro — two separate comparisons, when
       * comparing is the only thing a pricing page is for. Reading Pro against Basic meant
       * looking down and across.
       *
       * Two columns still carry the tablet range, where four would be too narrow to read a
       * feature list in. The three-plan case is the landing page, which never shows the
       * trial and is already a single row.
       */
      className={cn(
        'reveal-stagger grid gap-5',
        plans.length === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-4',
      )}
    >
      {/*
        `interactive` was already in the card system and unused here — a variant that
        lifts on hover and on focus-within, which is what a card holding a price and a
        button should do. Choosing a plan is the one decision on this page, and the cards
        gave no sign they were things you could act on.
      */}
      {plans.map((plan) => (
        // The tilt goes on the outside so the "recommended" badge, which is positioned
        // against the card's own top edge, turns with the edge it is pinned to. Five
        // degrees rather than the hero's nine: these sit in a row, and a row of cards each
        // tipped nine degrees reads as a broken grid rather than as depth.
        <TiltCard key={plan.code} degrees={5} className="reveal h-full">
          <Card
            padding="lg"
            variant={plan.highlighted ? 'accent' : 'paper'}
            interactive
            className={cn(
              'relative flex h-full flex-col',
              plan.highlighted && 'ring-accent-strong/35 shadow-raised ring-2',
            )}
          >
            {plan.highlighted && (
              <span className="bg-primary text-primary-foreground shadow-paper absolute start-1/2 -top-3.5 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap rtl:translate-x-1/2">
                <Icon name="sparkles" className="size-3.5" />
                {copy.highlightedBadge}
              </span>
            )}

            <div>
              <CardTitle as={headingLevel} className="text-accent-strong text-sm">
                {plan.name}
              </CardTitle>
              <p className="text-primary mt-3 flex items-baseline gap-1 font-[family-name:var(--font-display)] text-[2.75rem] leading-none font-bold tabular-nums">
                {formatPlanPrice(plan.priceAgorot)}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                {plan.code === 'trial' ? copy.trialNote : copy.oneTimeNote}
              </p>
              <p className="text-foreground border-border mt-5 border-t pt-5 leading-relaxed">
                {plan.description}
              </p>
            </div>

            <ul className="text-muted-foreground mt-6 flex-1 space-y-3 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
                      plan.highlighted
                        ? 'bg-accent-strong text-primary-foreground'
                        : 'bg-accent-soft text-accent-strong',
                    )}
                  >
                    <Icon name="check" strokeWidth={2.4} className="size-3" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7">
              {plan.code === 'trial' ? (
                <Link href={localePath(locale, '/signup')} className={buttonClass({ block: true })}>
                  {copy.trialCta}
                </Link>
              ) : (
                <a
                  href={supportWhatsAppUrl(copy.whatsappIntro.replace('{plan}', plan.name))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass({
                    block: true,
                    variant: plan.highlighted ? 'primary' : 'outline',
                  })}
                >
                  {copy.choosePlan.replace('{plan}', plan.name)}{' '}
                  <span className="sr-only"> ({dictionary.a11y.externalLink})</span>
                </a>
              )}
            </div>
          </Card>
        </TiltCard>
      ))}
    </div>
  );
}
