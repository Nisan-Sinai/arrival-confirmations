'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { Icon } from '@/components/ui/icons';
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
    <section
      aria-labelledby="share-invitation"
      className="border-accent-strong/25 from-accent-soft/45 to-card shadow-paper rounded-2xl border bg-gradient-to-br p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="bg-accent-soft text-accent-strong flex size-10 shrink-0 items-center justify-center rounded-full"
            >
              <Icon name="send" className="size-5" />
            </span>
            <div>
              <h2 id="share-invitation" className="text-primary text-h3 font-semibold">
                הקישור להזמנה
              </h2>
              <p className="text-muted-foreground text-sm">
                זו הכתובת ששולחים לאורחים. שלחו עכשיו, או המשיכו לניהול המוזמנים.
              </p>
            </div>
          </div>

          <div className="border-border bg-card mt-4 flex items-center gap-2 rounded-xl border p-1.5 ps-3.5 pe-1.5">
            <Icon name="globe" className="text-muted-foreground size-4" />
            <p
              className="text-primary min-w-0 flex-1 truncate font-mono text-sm"
              dir="ltr"
              title={inviteUrl}
            >
              {inviteUrl}
            </p>
            <Button
              onClick={copy}
              variant={copied ? 'secondary' : 'outline'}
              size="sm"
              className="shrink-0"
            >
              <Icon name={copied ? 'check' : 'copy'} />
              {copied ? UI_MESSAGES.admin.linkCopied : 'העתקה'}
            </Button>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 lg:flex lg:flex-col lg:pt-1">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ block: true, className: 'col-span-2 lg:w-56' })}
          >
            <Icon name="whatsapp" />
            שליחה בוואטסאפ <span className="sr-only"> ({UI_MESSAGES.a11y.externalLink})</span>
          </a>
          <Link
            href={`${pathname}/guests`}
            className={buttonClass({ variant: 'outline', block: true, className: 'lg:w-56' })}
          >
            <Icon name="users" />
            מוזמנים וכלים
          </Link>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: 'outline', block: true, className: 'lg:w-56' })}
          >
            <Icon name="eye" />
            תצוגה מקדימה <span className="sr-only"> ({UI_MESSAGES.a11y.externalLink})</span>
          </a>
        </div>
      </div>

      <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
        בעמוד המוזמנים אפשר להוסיף ידנית, לייבא מהטלפון, ולנהל את כל הכלים המתקדמים — Excel, שליחה
        חכמה ב-WhatsApp, מיתוג והושבה — במקום אחד.
      </p>

      <p role="status" aria-live="polite" className="sr-only">
        {copied ? UI_MESSAGES.admin.linkCopied : ''}
      </p>
    </section>
  );
}
