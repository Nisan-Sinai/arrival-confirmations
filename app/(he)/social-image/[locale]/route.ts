import { renderProductShareImage } from '@/features/og/ProductShareImage';
import { isLocale, locales } from '@/lib/i18n';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function GET(_request: Request, context: { params: Promise<{ locale: string }> }) {
  const { locale } = await context.params;
  if (!isLocale(locale)) return new Response('Not found', { status: 404 });
  return renderProductShareImage(locale);
}
