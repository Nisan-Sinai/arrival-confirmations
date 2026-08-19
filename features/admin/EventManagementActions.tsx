'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { getAppCopy } from '@/config/appCopy';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';
import { localePath } from '@/lib/i18n';

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
  const locale = useAppLocale();
  const copy = getAppCopy(locale).eventActions;
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${origin}${localePath(locale, `/e/${publicId}`)}`;
  const whatsappUrl = useMemo(() => {
    const message = [
      `${copy.whatsappInvitePrefix}${eventTitle}`,
      '',
      copy.whatsappDetails,
      inviteUrl,
    ].join('\n');
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  }, [copy.whatsappDetails, copy.whatsappInvitePrefix, eventTitle, inviteUrl]);

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
      <p className="text-primary text-sm font-semibold">{copy.title}</p>
      <p className="text-muted-foreground mt-1 text-xs" dir="ltr">
        {inviteUrl}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Link href={localePath(locale, `/dashboard/events/${eventId}`)} className={buttonClass({ size: 'sm' })}>
          {copy.manage}
        </Link>
        <Link
          href={localePath(locale, `/dashboard/events/${eventId}/guests`)}
          className={buttonClass({ variant: 'secondary', size: 'sm' })}
        >
          {copy.guests}
        </Link>
        <Link
          href={localePath(locale, `/dashboard/events/${eventId}/edit`)}
          className={buttonClass({ variant: 'outline', size: 'sm' })}
        >
          {copy.edit}
        </Link>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass({ variant: 'outline', size: 'sm' })}
        >
          {copy.preview}
        </a>
        <Button variant="outline" size="sm" onClick={copyInviteUrl}>
          {copied ? copy.copied : copy.copy}
        </Button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass({ variant: 'secondary', size: 'sm' })}
        >
          {copy.whatsapp}
        </a>
        <Link
          href={localePath(locale, `/dashboard/events/${eventId}/tools`)}
          className={buttonClass({ variant: 'ghost', size: 'sm' })}
        >
          {copy.tools}
        </Link>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {copied ? copy.copiedStatus : ''}
      </p>
    </div>
  );
}
