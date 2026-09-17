'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { buttonClass } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icons';
import { UI_MESSAGES } from '@/config/messages';
import { prefixHebrew } from '@/lib/hebrew';
import { cn } from '@/lib/utils';

/**
 * The actions on one event card.
 *
 * The panel was seven identical text pills in a single column — a list you had to read
 * to use, opened dozens of times by someone who already knew which row they wanted. It
 * is now one primary action and a row of five small tiles, each an icon over a two-word
 * label. Every label is visible at every width: a tooltip-only icon row would be
 * scannable on a desktop and a guessing game on the phone where most hosts open this.
 *
 * Emphasis stays at two levels. Managing the event is the one thing a card is for and
 * the only filled button; the five tiles are peers of each other.
 */
const TILE_CLASS = cn(
  'border-border bg-card text-primary hover:border-border-strong hover:bg-secondary/50',
  'flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border px-1 py-2 text-center text-[11px] leading-tight font-semibold',
  'transition-[background-color,border-color,translate] duration-[--duration-fast] ease-[--ease-out] active:translate-y-px',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-ring]',
  '[&_svg]:size-5',
);

function Tile({
  href,
  icon,
  external = false,
  children,
}: {
  href: string;
  icon: IconName;
  external?: boolean;
  children: ReactNode;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={TILE_CLASS}>
        <Icon name={icon} />
        {children}
        <span className="sr-only">({UI_MESSAGES.a11y.externalLink})</span>
      </a>
    );
  }
  return (
    <Link href={href} className={TILE_CLASS}>
      <Icon name={icon} />
      {children}
    </Link>
  );
}

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
      `נשמח להזמין אתכם ${prefixHebrew('ל', eventTitle)}`,
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
      <Link
        href={`/dashboard/events/${eventId}`}
        className={buttonClass({ size: 'md', block: true })}
      >
        <Icon name="dashboard" />
        ניהול האירוע ואישורי ההגעה
      </Link>

      <div className="mt-3 grid grid-cols-5 gap-2">
        <Tile href={`/dashboard/events/${eventId}/guests`} icon="users">
          מוזמנים
        </Tile>
        <Tile href={`/dashboard/events/${eventId}/edit`} icon="edit">
          עריכה
        </Tile>
        <Tile href={inviteUrl} icon="eye" external>
          צפייה
        </Tile>
        <button
          type="button"
          onClick={copyInviteUrl}
          className={cn(TILE_CLASS, copied && 'border-success/40 bg-success-soft text-success')}
        >
          <Icon name={copied ? 'check' : 'copy'} />
          {copied ? 'הועתק' : 'העתקה'}
        </button>
        <Tile href={whatsappUrl} icon="whatsapp" external>
          WhatsApp
        </Tile>
      </div>

      <p className="text-muted-foreground mt-3 truncate text-xs" dir="ltr" title={inviteUrl}>
        {inviteUrl}
      </p>

      <p role="status" aria-live="polite" className="sr-only">
        {copied ? 'קישור ההזמנה הועתק ללוח' : ''}
      </p>
    </div>
  );
}
