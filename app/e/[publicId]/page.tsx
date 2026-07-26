import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getEventTypePreset } from '@/config/eventTypes';
import { InvitationCard } from '@/features/invite/InvitationCard';
import { RsvpForm } from '@/features/rsvp/RsvpForm';
import { getEventByPublicId } from '@/repositories/eventRepository';

/**
 * One guest's view of one invitation (§5, §7).
 *
 * The `publicId` in the URL is the whole address: unguessable, so holding this link
 * tells you nothing about any other event. An unknown id and an unpublished event
 * both render the same 404 — distinguishing them would make the URL space
 * enumerable one probe at a time.
 */

interface EventPageProps {
  readonly params: Promise<{ publicId: string }>;
}

// Rendered on demand rather than at build time: hosts create events after the
// deployment exists, so there is no set of pages to enumerate ahead of time.
export const revalidate = 60;
export const dynamicParams = true;

/**
 * §12 requires noindex on invitation routes. An invitation reaching a search index
 * would defeat the point of an unguessable URL, so this is a security control as
 * much as an SEO one.
 */
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { publicId } = await params;
  const event = await getEventByPublicId(publicId);
  if (event === null) return { robots: { index: false, follow: false } };

  const preset = getEventTypePreset(event.event_type);
  return {
    title: `${preset.label} · ${event.hosts_names}`,
    // This becomes the WhatsApp link preview, so it names the occasion, not the product.
    description: `${preset.invitationLine} ${event.honoree_display_name}`,
    robots: { index: false, follow: false },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { publicId } = await params;
  const event = await getEventByPublicId(publicId);
  if (event === null) notFound();

  // The event's own labels win over the type preset, so a host can rename a side
  // without the preset knowing anything about their family (§3).
  const preset = getEventTypePreset(event.event_type);

  return (
    <main
      id="main"
      className="from-secondary/40 flex flex-1 flex-col items-center gap-8 bg-gradient-to-b to-transparent px-3 py-8 sm:px-4 sm:py-16"
    >
      <InvitationCard event={event} />
      <div className="w-full max-w-xl">
        <RsvpForm
          eventId={event.id!}
          sideALabel={event.side_a_label ?? preset.defaultSideALabel}
          sideBLabel={event.side_b_label ?? preset.defaultSideBLabel}
        />
      </div>
    </main>
  );
}
