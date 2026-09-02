import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/layout';
import { getDictionary } from '@/config/dictionary';
import { FlowDemo } from '@/features/landing/FlowDemo';
import { KineticHeading } from '@/features/landing/KineticHeading';
import { defaultLocale, type Locale } from '@/lib/i18n';

/**
 * The three steps, now beside a phone that performs them.
 *
 * The steps were three numbered paragraphs, which is an accurate description of the
 * product and a poor demonstration of it. The drawing runs the same three steps on a
 * loop — the invitation arriving, the guest answering, the replies landing — so a
 * visitor who reads nothing still watches the thing work.
 *
 * The text is not decoration around the animation; it is the other way round. The SVG is
 * `aria-hidden` and carries no words, so the steps remain the only place the product is
 * explained, and they are as legible with motion off as with it on.
 */
export function RsvpFlowSteps({ locale = defaultLocale }: { locale?: Locale }) {
  const { flow } = getDictionary(locale);

  /*
   * The card's contents assemble; the card itself does not fade in.
   *
   * Revealing the whole slab was the earlier behaviour and it wasted the best surface on
   * the page — a large dark panel appearing wholesale is one event, where the heading
   * setting itself and the three steps dealing out underneath is four. It also frees the
   * heading to be scroll-driven: `view()` measures a word's own position, so an ancestor
   * that is translating it would be feeding into the progress it is measured by.
   */
  return (
    <section className="pb-16 sm:pb-20">
      <Container width="wide">
        {/*
          `clip`, not `hidden`, and the difference is load-bearing.

          `overflow: hidden` makes an element a scroll container — programmatically
          scrollable even when nothing overflows — and `view()` resolves against the
          nearest scroll container. So the heading inside this panel was measuring itself
          against a box that never scrolls: its timeline sat at a fixed value and the
          words never moved. QA caught it as a heading with exactly one distinct transform
          across the whole page scroll, which looks identical to a finished animation.

          `overflow: clip` clips the same corners and is not scrollable at all, so it
          establishes no scroll container and the timeline resolves to the page. The masks
          around each word have always used `clip` for unrelated reasons, which is why
          every other heading on this page worked.
        */}
        <Card variant="ink" padding="lg" className="overflow-clip">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-accent text-sm font-semibold">{flow.eyebrow}</p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              <KineticHeading text={flow.title} trigger="scroll" />
            </h2>
          </div>

          {/*
            Constrained and centred rather than spread across the card.

            The first version was `grid-cols-[minmax(0,1fr)_auto]` on the full card width,
            which pushed the phone to one edge and the steps to the other and left a hand's
            width of empty burgundy between them on a desktop. A pair of things that belong
            together should not be at opposite ends of the room.
          */}
          <div className="mx-auto mt-10 grid max-w-3xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
            {/*
              The steps read as a column on a phone, a row on a tablet, and a column again
              beside the drawing on a wide screen. The drawing sits beside them rather than
              above: on a narrow viewport a 340px-tall illustration between the heading and
              the text would push every word below the fold.
            */}
            <ol className="reveal-stagger grid gap-6 sm:grid-cols-3 lg:grid-cols-1">
              {flow.steps.map((step, index) => (
                <li key={step.title} className="reveal flex gap-4">
                  <span className="border-accent/50 text-accent flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/70">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="reveal flex justify-center">
              <FlowDemo
                playLabel={flow.demoPlay}
                caption={flow.demoCaption}
                closeLabel={flow.demoClose}
              />
            </div>
          </div>
        </Card>
      </Container>
    </section>
  );
}
