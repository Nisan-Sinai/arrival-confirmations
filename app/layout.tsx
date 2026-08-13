import { buildMetadata, RootDocument, viewport } from '@/features/layout/RootDocument';

/**
 * The Hebrew root layout.
 *
 * Everything that used to live here — the fonts, the placeholder assertion, the
 * metadata, the skip link, the footer — moved into `RootDocument`, which takes the
 * locale as an argument. What is left is the one thing this file decides: the language
 * of the routes served at the root of the site.
 *
 * English gets a root layout of its own rather than a nested one. Only the outermost
 * layout may emit `<html>`, and `lang` and `dir` have to change with the language, so a
 * shared root would have to pick a single direction for every page on the site.
 */

export const metadata = buildMetadata('he');

export { viewport };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootDocument locale="he">{children}</RootDocument>;
}
