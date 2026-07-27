import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';

import { OG_PALETTE, OgFlourish, OgFrame } from '@/features/og/OgFrame';
import {
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
  buildInvitationOgFields,
  loadOgFonts,
} from '@/lib/server/ogImage';
import { getEventByPublicId } from '@/repositories/eventRepository';

/**
 * One invitation's share card (§12).
 *
 * This is the whole reason the OG work was worth doing. A host pastes the link into a
 * family WhatsApp group; what fifty relatives see is this image, and it has to say
 * *whose* simcha it is before anyone reads a word of the message above it. A single
 * product banner here would be worse than none — every invitation in the country
 * would preview identically.
 *
 * Sharing an invitation is not indexing one. The page carries `noindex` and this route
 * sits behind the same unguessable id, so nothing here widens the surface §4.2
 * protects: you cannot fetch this image without already holding the invitation.
 *
 * `revalidate` matches the page's, so an edited venue reaches the preview on the same
 * schedule it reaches the invitation, rather than on a second policy nobody remembers.
 */

export const alt = 'הזמנה לאירוע';
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const revalidate = 60;

interface OpengraphImageProps {
  readonly params: Promise<{ publicId: string }>;
}

/**
 * One fact in the bottom row, with the gold dot that separates it from the fact before
 * it. `row-reverse` puts that dot on the fact's right — its *leading* edge in Hebrew.
 * Laid out as a plain row the dots drift to the left of their own text, which reads as
 * a stray separator dangling off the end of the line.
 */
function Fact({ children, first }: { children: string; first: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', gap: 16 }}>
      {first ? null : (
        <div
          style={{
            display: 'flex',
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: OG_PALETTE.gold,
          }}
        />
      )}
      <div style={{ display: 'flex' }}>{children}</div>
    </div>
  );
}

export default async function InvitationOpengraphImage({ params }: OpengraphImageProps) {
  const { publicId } = await params;
  const event = await getEventByPublicId(publicId);
  // Same answer as the page: an unknown id and an unpublished event are indistinguishable.
  if (event === null) notFound();

  const fields = buildInvitationOgFields(event);
  // Built as a list so an event with no time, or no date at all, closes the row up
  // instead of rendering a stray separator.
  const facts = [fields.weekday, fields.date, fields.time].filter((value) => value !== '');

  return new ImageResponse(
    <OgFrame>
      <div style={{ display: 'flex', fontSize: 24, letterSpacing: 6, color: OG_PALETTE.gold }}>
        {fields.blessing}
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: 16,
          fontSize: 32,
          color: OG_PALETTE.goldSoft,
        }}
      >
        {fields.invitation}
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: 10,
          fontFamily: 'Frank Ruhl Libre',
          fontWeight: 700,
          fontSize: fields.honoreeSize,
          lineHeight: 1.15,
          color: OG_PALETTE.ivory,
        }}
      >
        {fields.honoree}
      </div>

      <div style={{ display: 'flex', marginTop: 22 }}>
        <OgFlourish />
      </div>

      {facts.length === 0 ? null : (
        <div
          style={{
            // Logical order right-to-left without relying on the renderer's bidi:
            // the children are listed weekday, date, time and laid out reversed, so
            // a Hebrew weekday beside Latin digits cannot come out shuffled.
            display: 'flex',
            flexDirection: 'row-reverse',
            alignItems: 'center',
            gap: 16,
            marginTop: 22,
            fontSize: 30,
            color: OG_PALETTE.ivory,
          }}
        >
          {facts.map((fact, index) => (
            <Fact key={fact} first={index === 0}>
              {fact}
            </Fact>
          ))}
        </div>
      )}

      {fields.venue === '' ? null : (
        <div
          style={{
            display: 'flex',
            marginTop: 10,
            fontSize: 27,
            color: OG_PALETTE.goldSoft,
          }}
        >
          {fields.venue}
        </div>
      )}
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
