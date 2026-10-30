import { ImageResponse } from 'next/og';

import { OG_PALETTE, OgFlourish, OgFrame } from '@/features/og/OgFrame';
import { OgText } from '@/features/og/OgText';
import type { Locale } from '@/lib/i18n';
import { OG_IMAGE_SIZE, loadOgFonts } from '@/lib/server/ogImage';
import { productShareCopy } from '@/lib/social-image';

function ProductText({
  locale,
  children,
  fontSize,
  style,
}: {
  locale: Locale;
  children: string;
  fontSize: number;
  style?: React.CSSProperties;
}) {
  return locale === 'he' ? (
    <OgText fontSize={fontSize} style={style}>
      {children}
    </OgText>
  ) : (
    <div style={{ display: 'flex', justifyContent: 'center', fontSize, ...style }}>{children}</div>
  );
}

export async function renderProductShareImage(locale: Locale) {
  const copy = productShareCopy[locale];
  return new ImageResponse(
    <OgFrame>
      <ProductText
        locale={locale}
        fontSize={26}
        style={{ letterSpacing: 5, color: OG_PALETTE.gold }}
      >
        {copy.eyebrow}
      </ProductText>
      <ProductText
        locale={locale}
        fontSize={locale === 'he' ? 104 : 76}
        style={{
          marginTop: 18,
          fontFamily: 'Frank Ruhl Libre',
          fontWeight: 700,
          color: OG_PALETTE.ivory,
        }}
      >
        {copy.title}
      </ProductText>
      <div style={{ display: 'flex', marginTop: 26 }}>
        <OgFlourish />
      </div>
      <ProductText
        locale={locale}
        fontSize={34}
        style={{ marginTop: 26, color: OG_PALETTE.goldSoft }}
      >
        {copy.description}
      </ProductText>
      <ProductText
        locale={locale}
        fontSize={30}
        style={{ marginTop: 14, fontWeight: 700, color: OG_PALETTE.gold }}
      >
        {copy.trial}
      </ProductText>
    </OgFrame>,
    { ...OG_IMAGE_SIZE, fonts: await loadOgFonts() },
  );
}
