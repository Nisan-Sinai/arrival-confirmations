'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Button, buttonClass } from '@/components/ui/button';

export function EventManagementActions({
  eventId,
  eventTitle,
  publicId,
  origin,
}: {
  eventId: string;
  eventTitle: string;
  publicId: string;
  origin: string;
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${origin}/e/${publicId}`;
  const whatsappUrl = useMemo(() => {
    const message = [
      `נשמח להזמין אתכם ל${eventTitle}`,
      '',
      'לפרטים ולאישור הגעה:',
      inviteUrl,
    ].join('\n');

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  }, [eventTitle, inviteUrl]);

  useEffect(() => {
    if (!copied) return;
    const timeoutId = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const copyInviteUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="border-border mt-5 border-t pt-4">
      <p className="text-primary text-sm font-semibold">ניהול ההזמנה</p>
      <p className="text-muted-foreground mt-1 text-xs" dir="ltr">
        {inviteUrl}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Link href={`/dashboard/events/${eventId}`} className={buttonClass({ size: 'sm' })}>
          ניהול האירוע ואישורי ההגעה
        </Link>
        <Link
          href={`/dashboard/events/${eventId}/edit`}
          className={buttonClass({ variant: 'outline', size: 'sm' })}
        >
          עריכת ההזמנה
        </Link>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass({ variant: 'outline', size: 'sm' })}
        >
          צפייה בהזמנה
        </a>
        <Button variant="outline" size="sm" onClick={copyInviteUrl}>
          {copied ? 'הקישור הועתק' : 'העתקת הקישור'}
        </Button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass({ variant: 'secondary', size: 'sm' })}
        >
          שליחת ההזמנה ב-WhatsApp
        </a>
        <Link
          href={`/dashboard/events/${eventId}/tools`}
          className={buttonClass({ variant: 'ghost', size: 'sm' })}
        >
          כלים מתקדמים
        </Link>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {copied ? 'קישור ההזמנה הועתק ללוח' : ''}
      </p>
    </div>
  );
}
