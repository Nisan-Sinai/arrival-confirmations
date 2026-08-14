import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { defaultLocale, type Locale } from '@/lib/i18n';

export function RsvpFlowSteps({ locale = defaultLocale }: { locale?: Locale }) {
  const { flow } = getDictionary(locale);

  return (
    <section className="pb-16 sm:pb-20">
      <Container width="wide">
        <Card variant="ink" padding="lg" className="overflow-hidden">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-accent text-sm font-semibold">{flow.eyebrow}</p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{flow.title}</h2>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {flow.steps.map((step, index) => (
              <div key={step.title} className="flex gap-4">
                <span className="border-accent/50 text-accent flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <h3 className="font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Container>
    </section>
  );
}
