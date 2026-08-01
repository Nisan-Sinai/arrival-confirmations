import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';

const STEPS = [
  {
    number: '01',
    title: 'האורח פותח מה-WhatsApp',
    body: 'אין צורך בהרשמה או בהתקנת אפליקציה.',
  },
  {
    number: '02',
    title: 'ממלא אישור הגעה',
    body: 'שם, טלפון, מספר מגיעים והעדפות חשובות.',
  },
  {
    number: '03',
    title: 'התשובה מופיעה בדשבורד',
    body: 'הנתונים מתעדכנים מיד ומוכנים לסיכום ולייצוא.',
  },
] as const;

export function RsvpFlowSteps() {
  return (
    <section className="pb-16 sm:pb-20">
      <Container width="wide">
        <Card variant="ink" padding="lg" className="overflow-hidden">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-accent text-sm font-semibold">מה קורה אחרי ששולחים את הקישור?</p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              שלושה צעדים פשוטים עד לאישור ההגעה
            </h2>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-4">
                <span className="border-accent/50 text-accent flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
                  {step.number}
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
