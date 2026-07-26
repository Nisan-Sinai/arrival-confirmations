import { getEventTypePreset } from '@/config/eventTypes';
import { InvitationCard } from '@/features/invite/InvitationCard';
import { RsvpForm } from '@/features/rsvp/RsvpForm';
import { getPublicEvent } from '@/repositories/eventRepository';

/**
 * The public invitation (§5).
 *
 * A Server Component: the event is fetched during render, so a guest on a slow phone
 * receives finished HTML rather than a spinner that resolves into a card. Nothing
 * here is interactive yet — the RSVP form arrives with the rest of phase 4 — so
 * there is no reason for any of it to cost the visitor a JavaScript bundle.
 */

// The active event changes rarely and is read on every visit; a short revalidation
// window keeps the page cheap under a burst of WhatsApp traffic without staying
// stale for long after an admin edit.
export const revalidate = 60;

/**
 * Shown before an admin publishes an event.
 *
 * A real state with real copy, not a placeholder: a fresh deployment genuinely has
 * no active event, and a guest who arrives early should read a sentence rather than
 * an error (§0, §13).
 */
function NoActiveEvent() {
  return (
    <article className="bg-card mx-auto w-full max-w-md rounded-2xl border p-10 text-center">
      <h1 className="text-primary font-[family-name:var(--font-display)] text-2xl font-bold">
        אין אירוע פעיל כרגע
      </h1>
      <p className="text-muted-foreground mt-4 text-base">
        ההזמנה תופיע כאן ברגע שבעלי השמחה יפרסמו את פרטי האירוע.
      </p>
    </article>
  );
}

export default async function HomePage() {
  const event = await getPublicEvent();

  if (event === null) {
    return (
      <main
        id="main"
        className="from-secondary/40 flex flex-1 items-center justify-center bg-gradient-to-b to-transparent px-4 py-12"
      >
        <NoActiveEvent />
      </main>
    );
  }

  // Side labels come from the event first and the type preset second, so a host can
  // override "צד החתן" without the preset having to know about their family (§3).
  const preset = getEventTypePreset(event.event_type);

  return (
    <main
      id="main"
      className="from-secondary/40 flex flex-1 flex-col items-center gap-8 bg-gradient-to-b to-transparent px-4 py-12 sm:py-16"
    >
      <InvitationCard event={event} />
      <div className="w-full max-w-xl">
        <RsvpForm
          sideALabel={event.side_a_label ?? preset.defaultSideALabel}
          sideBLabel={event.side_b_label ?? preset.defaultSideBLabel}
        />
      </div>
    </main>
  );
}
