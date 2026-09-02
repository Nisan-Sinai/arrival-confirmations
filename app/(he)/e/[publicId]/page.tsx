/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getEventTypePreset } from '@/config/eventTypes';
import { GiftLink } from '@/features/invite/GiftLink';
import { InvitationCard } from '@/features/invite/InvitationCard';
import { RsvpForm } from '@/features/rsvp/RsvpForm';
import { brandingCssVariables } from '@/lib/premiumEventTools';
import { getEventBrandingByPublicId, getEventByPublicId } from '@/repositories/eventRepository';

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
  const [event, branding] = await Promise.all([
    getEventByPublicId(publicId),
    getEventBrandingByPublicId(publicId),
  ]);
  if (event === null) notFound();

  // The event's own labels win over the type preset, so a host can rename a side
  // without the preset knowing anything about their family (§3).
  const preset = getEventTypePreset(event.event_type);
  const style = {
    ...brandingCssVariables(branding),
    backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${branding.accentColor} 18%, transparent), transparent 42%)`,
  } as CSSProperties;
  const shellClass =
    branding.invitationStyle === 'minimal'
      ? 'border-transparent bg-transparent p-0'
      : branding.invitationStyle === 'modern'
        ? 'rounded-[2.5rem] border-2 bg-white/70 p-3 shadow-xl backdrop-blur-sm sm:p-5'
        : 'rounded-3xl border-2 bg-white/55 p-3 shadow-lg backdrop-blur-sm sm:p-4';

  return (
    <main
      id="main"
      style={style}
      data-invitation-style={branding.invitationStyle}
      className="relative flex flex-1 flex-col items-center gap-10 px-3 py-8 sm:px-4 sm:py-16"
    >
      <section
        className={`w-full max-w-3xl ${shellClass}`}
        style={{ borderColor: branding.accentColor }}
        aria-label="הזמנה ממותגת"
      >
        {branding.logoUrl !== null && (
          <div className="mb-5 flex justify-center">
            <img
              src={branding.logoUrl}
              alt="לוגו האירוע"
              width={96}
              height={96}
              className="size-24 rounded-2xl object-contain shadow-sm"
            />
          </div>
        )}
        <div
          className="mx-auto h-1 w-24 rounded-full"
          style={{ backgroundColor: branding.primaryColor }}
        />
        <div className="mt-5">
          <InvitationCard event={event} />
        </div>
      </section>

      {/* The form is the point of the page, so it is anchored and linked to from the
          card above rather than left to be found by scrolling. */}
      {/*
        Deliberately not `.reveal`.

        This form is the product's one job, in front of guests invited to a family's
        simcha, and a scroll-driven animation starts at `opacity: 0`. The decoration is
        worth very little and the tail risk — a browser where the animation does not
        complete and the form never appears — is a guest who cannot reply at all. The
        rest of the site can fade in; this cannot.
      */}
      <div id="rsvp" className="w-full max-w-xl scroll-mt-8">
        {/*
          The same calendar entry the card above offers, repeated on the success state.

          Not a duplicate so much as a second chance at the right moment: a guest who has
          scrolled past the invitation, filled in the form and submitted it will not
          scroll back up for it, and having just promised to come is when the date is
          most worth saving. The values are identical to the card's on purpose — two
          entries that differed would be worse than one.
        */}
        <RsvpForm
          eventId={event.id!}
          sideALabel={event.side_a_label ?? preset.defaultSideALabel}
          sideBLabel={event.side_b_label ?? preset.defaultSideBLabel}
          calendar={{
            uid: event.public_id!,
            title: `${preset.label} — ${event.honoree_display_name}`,
            date: event.event_date!,
            time: event.ceremony_time,
            venueName: event.venue_name!,
            address: event.address!,
          }}
        />

        {/* Below the form, never above it. The page exists to collect an answer, and a
            gift prompt in front of that would make the invitation read as a request for
            money. Whoever scrolls this far has already replied. */}
        <GiftLink url={event.gift_url} />
      </div>
    </main>
  );
}
