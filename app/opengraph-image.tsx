import { ImageResponse } from 'next/og';

import { appConfig } from '@/config/event.config';
import { OG_PALETTE, OgFlourish, OgFrame } from '@/features/og/OgFrame';
import { OG_IMAGE_CONTENT_TYPE, OG_IMAGE_SIZE, loadOgFonts } from '@/lib/server/ogImage';

/**
 * The share card for the product itself — `/`, `/privacy` and `/accessibility`, which
 * inherit this file because they declare no image of their own (§12).
 *
 * The free claim is on the card because it is the only claim the product has that is
 * both true and unusual, and a preview is read in about a second. Everything else the
 * landing page says can wait until someone taps.
 */

export const alt = `${appConfig.siteName} — ${appConfig.siteDescription}`;
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default async function OpengraphImage() {
  return new ImageResponse(
    <OgFrame>
      <div
        style={{
          display: 'flex',
          fontSize: 26,
          letterSpacing: 8,
          color: OG_PALETTE.gold,
        }}
      >
        הזמנה דיגיטלית
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: 18,
          fontFamily: 'Frank Ruhl Libre',
          fontWeight: 700,
          fontSize: 104,
          color: OG_PALETTE.ivory,
        }}
      >
        {appConfig.siteName}
      </div>

      <div style={{ display: 'flex', marginTop: 26 }}>
        <OgFlourish />
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: 26,
          fontSize: 34,
          color: OG_PALETTE.goldSoft,
        }}
      >
        {appConfig.siteDescription}
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: 14,
          fontSize: 30,
          fontWeight: 700,
          color: OG_PALETTE.gold,
        }}
      >
        חינם, בלי מנוי ובלי תשלום לפי אורח
      </div>
    </OgFrame>,
    { ...size, fonts: await loadOgFonts() },
  );
}
