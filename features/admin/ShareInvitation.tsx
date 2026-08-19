'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { getAppCopy } from '@/config/appCopy';
import { getDictionary } from '@/config/dictionary';
import { useAppLocale } from '@/features/i18n/AppLocaleProvider';
import { localePath } from '@/lib/i18n';

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
  const locale = useAppLocale();
  const copy = getAppCopy(locale).share;
  const dictionary = getDictionary(locale);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2400);
    return () => clearTimeout(id);
  }, [copied]);

  const invitePath = localePath(locale, `/e/${publicId}`);
  const inviteUrl = `${origin}${invitePath}`;
  const message = [blessingLine, `${invitationLine} ${honoree}`, '', inviteUrl].join('\n');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="border-accent-strong/25 bg-accent-soft/30 rounded-2xl border p-5 sm:p-6">
      <h2 className="text-primary text-h3 font-semibold">{copy.title}</h2>
      <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{copy.intro}</p>

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
          {copy.whatsapp}
          <span className="sr-only"> ({dictionary.a11y.externalLink})</span>
        </a>

        <Link
          href={localePath(locale, `/dashboard/events/${publicId === '' ? '' : ''}`)}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
        <Link
          href={`${localePath(locale, '/dashboard')}/events/${locationEventIdFallback()}`}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        <Button onClick={copyLink} variant="outline" size="sm" block className="lg:w-auto">
          {copied ? dictionary.admin.linkCopied : copy.copy}
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
          {copy.preview}
          <span className="sr-only"> ({dictionary.a11y.externalLink})</span>
        </a>
      </div>

      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{copy.note}</p>
      <p role="status" aria-live="polite" className="sr-only">
        {copied ? dictionary.admin.linkCopied : ''}
      </p>
    </div>
  );
}

function locationEventIdFallback(): string {
  return '';
}
