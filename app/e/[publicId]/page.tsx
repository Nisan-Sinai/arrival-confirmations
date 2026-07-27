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
 *
 * `noindex` and a link preview are separate things, and it is worth being explicit
 * about that because they look like they should conflict. `robots` tells a search
 * engine not to *list* this page. Open Graph tells the client rendering a pasted link
 * what to *draw*. WhatsApp reads the second and has no interest in the first, so an
 * invitation can stay out of every index and still arrive in a family group as a card
 * with the couple's names on it — which is the only reason anyone taps.
 *
 * No `alternates.canonical` here, deliberately. A canonical tag tells an indexer which
 * duplicate to keep, and this page is asking not to be indexed at all; adding one
 * would write the public id into the markup to answer a question nobody is asking.
 */
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { publicId } = await params;
  const event = await getEventByPublicId(publicId);
  if (event === null) return { robots: { index: false, follow: false } };

  const preset = getEventTypePreset(event.event_type);
  const title = `${preset.label} · ${event.hosts_names}`;
  // This becomes the WhatsApp link preview, so it names the occasion, not the product.
  const description = `${preset.invitationLine} ${event.honoree_display_name}`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: 'website',
      locale: 'he_IL',
      title,
      description,
      // No `siteName`, unlike the root default. A preview card for a family's simcha
      // should read as their invitation, not carry the name of the tool that produced
      // it above the couple's names.
      // Relative, resolved against `metadataBase`; the accompanying image comes from
      // `opengraph-image.tsx` in this directory by file convention.
      url: `/e/${publicId}`,
    },
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
      className="from-secondary/35 relative flex flex-1 flex-col items-center gap-10 bg-gradient-to-b to-transparent px-3 py-8 sm:px-4 sm:py-16"
    >
      <InvitationCard event={event} />

      {/* The form is the point of the page, so it is anchored and linked to from the
          card above rather than left to be found by scrolling. */}
      <div id="rsvp" className="w-full max-w-xl scroll-mt-8">
        <RsvpForm
          eventId={event.id!}
          sideALabel={event.side_a_label ?? preset.defaultSideALabel}
          sideBLabel={event.side_b_label ?? preset.defaultSideBLabel}
        />
      </div>
    </main>
  );
}
