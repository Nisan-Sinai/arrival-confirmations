import type { Metadata, Viewport } from 'next';
import { Assistant, Frank_Ruhl_Libre } from 'next/font/google';

import { appConfig, assertNoPlaceholders } from '@/config/event.config';
import { UI_MESSAGES } from '@/config/messages';
import { SiteFooter } from '@/features/layout/SiteFooter';

import './globals.css';

/**
 * §0 and §15: refuse to serve production while a branding placeholder is still in
 * place. `assertNoPlaceholders` was written for this and had no caller anywhere in the
 * application, which made it a guarantee nobody was collecting on — `supportEmail` is
 * still `__REPLACE_ME__`, and without this the first person to notice would have been
 * a guest reading the privacy notice and finding no way to contact anyone.
 *
 * Called at module scope so it fails when the route tree is first loaded rather than
 * on some later request, and a no-op outside production so local work is unaffected.
 */
assertNoPlaceholders();

/**
 * Body face. Assistant is a Hebrew-first sans with a large x-height, which is what
 * keeps the form legible for the older guests §5 calls out.
 */
const assistant = Assistant({
  variable: '--font-assistant',
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  weight: ['400', '600', '700'],
});

/** Display face for the invitation headline — a Hebrew serif with real ceremony. */
const frankRuhl = Frank_Ruhl_Libre({
  variable: '--font-frank-ruhl',
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: {
    default: appConfig.siteName,
    template: `%s · ${appConfig.siteName}`,
  },
  description: appConfig.siteDescription,
  applicationName: appConfig.siteName,
  formatDetection: {
    // A phone number inside the invitation copy should not become a tap-to-call link
    // mid-sentence; the contact block links deliberately instead.
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#5e1b28',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} ${frankRuhl.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {/* §9: skip link, first in the tab order, visible only once focused. */}
        <a
          href="#main"
          className="focus-visible:bg-primary focus-visible:text-primary-foreground sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:right-4 focus-visible:z-50 focus-visible:rounded-md focus-visible:px-4 focus-visible:py-2"
        >
          {UI_MESSAGES.a11y.skipToContent}
        </a>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
