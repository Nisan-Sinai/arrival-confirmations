'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { renderTemplate, UI_MESSAGES, WHATSAPP_INVITE_TEMPLATE } from '@/config/messages';

/** Sending the invitation and the host's most common event actions. */
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
      setCopied(false);
    }
  };

  return (
    <div className="border-accent-strong/25 bg-accent-soft/30 rounded-2xl border p-5 sm:p-6">
      <h2 className="text-primary text-h3 font-semibold">הקישור להזמנה</h2>
      <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
        זו הכתובת ששולחים לאורחים. אפשר לשלוח עכשיו או לעבור לניהול המוזמנים והכלים המתקדמים.
      </p>

      <p
        className="border-border bg-card text-primary mt-4 overflow-x-auto rounded-lg border px-3.5 py-2.5 font-mono text-sm"
        dir="ltr"
      >
        {inviteUrl}
      </p>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:flex lg:flex-wrap">
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass({ size: 'sm', block: true, className: 'lg:w-auto' })}
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

        <Link
          href={`${pathname}/guests`}
          className={buttonClass({
            variant: 'secondary',
            size: 'sm',
            block: true,
            className: 'lg:w-auto',
          })}
        >
          מוזמנים וכלים מתקדמים
        </Link>

        <Button onClick={copy} variant="outline" size="sm" block className="lg:w-auto">
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

        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass({
            variant: 'ghost',
            size: 'sm',
            block: true,
            className: 'lg:w-auto',
          })}
        >
          תצוגה מקדימה
          <span className="sr-only"> ({UI_MESSAGES.a11y.externalLink})</span>
        </a>
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        בעמוד המוזמנים אפשר להוסיף ידנית, לייבא מהטלפון, ולנהל את כל הכלים המתקדמים — Excel, שליחה
        חכמה ב-WhatsApp, מיתוג והושבה — במקום אחד.
      </p>

      <p role="status" aria-live="polite" className="sr-only">
        {copied ? UI_MESSAGES.admin.linkCopied : ''}
      </p>
    </div>
  );
}
