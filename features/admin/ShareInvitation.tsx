'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { renderTemplate, UI_MESSAGES, WHATSAPP_INVITE_TEMPLATE } from '@/config/messages';

/**
 * Sending the invitation (§8.2).
 *
 * The product's premise is a link sent on WhatsApp, and `WHATSAPP_INVITE_TEMPLATE`
 * had been sitting in `config/messages.ts` since the first commit with nothing in the
 * application rendering it — a host's only option was to select the path out of the
 * page by hand and assemble the message themselves. This is the missing half.
 *
 * The origin is resolved on the server from the request's own Host header and passed
 * in, rather than read from `location` here or taken from NEXT_PUBLIC_SITE_URL. Each
 * of the alternatives is wrong in a different way: `location.origin` is unavailable
 * during the server pass, so the link would render relative and then rewrite itself
 * after hydration, and NEXT_PUBLIC_SITE_URL would hand a host on a Vercel preview
 * deployment a link pointing at production, where their event does not exist — a
 * mistake they would only discover when a guest told them.
 */
export function ShareInvitation({
  publicId,
  origin,
  blessingLine,
  invitationLine,
  honoree,
}: {
  publicId: string;
  origin: string;
  blessingLine: string;
  invitationLine: string;
  honoree: string;
}) {
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();

  // Clear the confirmation after a moment so the button does not sit on "copied"
  // for the rest of the session and stop looking like a control.
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2400);
    return () => clearTimeout(id);
  }, [copied]);

  const inviteUrl = `${origin}/e/${publicId}`;

  const message = renderTemplate(WHATSAPP_INVITE_TEMPLATE, {
    blessing: blessingLine,
    invitation: `${invitationLine} ${honoree}`,
    inviteUrl,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      // Clipboard access is refused on an insecure origin and in some in-app
      // browsers. The link is written out in full beside this button precisely so
      // there is a way through that does not depend on the API being available.
      setCopied(false);
    }
  };

  return (
    <div className="border-accent-strong/25 bg-accent-soft/30 rounded-2xl border p-5 sm:p-6">
      <h2 className="text-primary text-h3 font-semibold">הקישור להזמנה</h2>
      <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
        זו הכתובת שאתם שולחים לאורחים. היא פרטית ואינה ניתנת לניחוש.
      </p>

      <p
        className="border-border bg-card text-primary mt-4 overflow-x-auto rounded-lg border px-3.5 py-2.5 font-mono text-sm"
        dir="ltr"
      >
        {inviteUrl}
      </p>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button onClick={copy} variant="outline" size="sm">
          {copied ? (
            <>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              {UI_MESSAGES.admin.linkCopied}
            </>
          ) : (
            <>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
              העתקת הקישור
            </>
          )}
        </Button>

        {/* api.whatsapp.com works on desktop and on mobile; the whatsapp:// scheme
            does neither reliably outside the native app. */}
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass({ size: 'sm' })}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 20.5l1.8-5.2A8.5 8.5 0 1 1 21 11.5Z" />
          </svg>
          שליחה בוואטסאפ
          <span className="sr-only"> ({UI_MESSAGES.a11y.externalLink})</span>
        </a>

        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass({ variant: 'ghost', size: 'sm' })}
        >
          תצוגה מקדימה
          <span className="sr-only"> ({UI_MESSAGES.a11y.externalLink})</span>
        </a>

        <Link
          href={`${pathname}/guests`}
          className={buttonClass({ variant: 'secondary', size: 'sm' })}
        >
          ניהול מוזמנים: הוספה ידנית וייבוא מהטלפון
        </Link>

        <Link
          href={`${pathname}/tools`}
          className={buttonClass({ variant: 'outline', size: 'sm' })}
        >
          מרכז Premium: שליחה חכמה, Excel, מיתוג והושבה
        </Link>
      </div>

      {/* Announced only when it changes, so the confirmation reaches a screen reader
          without the button label being re-read on every render. */}
      <p role="status" aria-live="polite" className="sr-only">
        {copied ? UI_MESSAGES.admin.linkCopied : ''}
      </p>
    </div>
  );
}
