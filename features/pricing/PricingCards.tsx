import Link from 'next/link';

import { formatPlanPrice, getPlanCatalog } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { appConfig } from '@/config/event.config';
import { getDictionary } from '@/config/dictionary';
import { defaultLocale, localePath, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function whatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
}

function whatsappPlanUrl(message: string): string {
  return `https://wa.me/${whatsappPhone(appConfig.supportPhone)}?text=${encodeURIComponent(message)}`;
}

export function PricingCards({
  showTrial = true,
  locale = defaultLocale,
}: {
  showTrial?: boolean;
  locale?: Locale;
}) {
  const dictionary = getDictionary(locale);
  const copy = dictionary.pricing;
  const catalog = getPlanCatalog(locale);
  const plans = showTrial ? catalog : catalog.filter((plan) => plan.code !== 'trial');

  return (
    <div className={cn('grid gap-5', plans.length === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2')}>
      {plans.map((plan) => (
        <Card
          key={plan.code}
          padding="lg"
          variant={plan.highlighted ? 'accent' : 'paper'}
          className="relative flex h-full flex-col"
        >
          {plan.highlighted && (
            <span className="bg-primary text-primary-foreground absolute -top-3 right-6 rounded-full px-3 py-1 text-xs font-semibold">
              {copy.highlightedBadge}
            </span>
          )}

          <div>
            <CardTitle as="h3" className="text-accent-strong text-sm">
              {plan.name}
            </CardTitle>
            <p className="text-primary mt-3 font-[family-name:var(--font-display)] text-4xl font-bold">
              {formatPlanPrice(plan.priceAgorot)}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {plan.code === 'trial' ? copy.trialNote : copy.oneTimeNote}
            </p>
            <CardBody className="text-foreground mt-5">{plan.description}</CardBody>
          </div>

          <ul className="text-muted-foreground mt-6 flex-1 space-y-3 text-sm">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-2.5">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent-strong mt-0.5 size-4 shrink-0"
                >
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
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
                href={whatsappPlanUrl(copy.whatsappIntro.replace('{plan}', plan.name))}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({
                  block: true,
                  variant: plan.highlighted ? 'primary' : 'outline',
                })}
              >
                {copy.choosePlan.replace('{plan}', plan.name)}
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
