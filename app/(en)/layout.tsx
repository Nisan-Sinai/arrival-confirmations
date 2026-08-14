import { buildMetadata, RootDocument, viewport } from '@/features/layout/RootDocument';

/**
 * The English root layout.
 *
 * A second root, not a layout nested under the Hebrew one. Only the outermost layout may
 * emit `<html>`, and `lang` and `dir` change with the language — English reads
 * left-to-right — so the two locales each need a root of their own. Route groups keep
 * both at the root of the tree without adding a segment to any URL.
 */

export const metadata = buildMetadata('en');

export { viewport };

export default function EnglishRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootDocument locale="en">{children}</RootDocument>;
}
