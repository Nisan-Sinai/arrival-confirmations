import Link from 'next/link';

import { PLAN_CATALOG, formatPlanPrice } from '@/app/_lib/plans';
import { buttonClass } from '@/components/ui/button';
import { Card, CardBody, CardTitle } from '@/components/ui/card';
import { appConfig } from '@/config/event.config';
import { cn } from '@/lib/utils';

function whatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
}

function whatsappPlanUrl(planName: string): string {
  const message = `שלום ניסן, אני מעוניין להפעיל את מסלול ${planName} לאירוע במערכת אישורי הגעה.`;
  return `https://wa.me/${whatsappPhone(appConfig.supportPhone)}?text=${encodeURIComponent(message)}`;
}

export function PricingCards({ showTrial = true }: { showTrial?: boolean }) {
  const plans = showTrial ? PLAN_CATALOG : PLAN_CATALOG.filter((plan) => plan.code !== 'trial');

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
              המסלול המתקדם
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
              {plan.code === 'trial' ? 'ללא כרטיס אשראי' : 'תשלום חד-פעמי לאירוע'}
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
              <Link href="/signup" className={buttonClass({ block: true })}>
                יצירת אירוע לבדיקה
              </Link>
            ) : (
              <a
                href={whatsappPlanUrl(plan.name)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({
                  block: true,
                  variant: plan.highlighted ? 'primary' : 'outline',
                })}
              >
                בחירת {plan.name}
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
