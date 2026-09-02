'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Button, buttonClass } from '@/components/ui/button';
import { prefixHebrew } from '@/lib/hebrew';

/**
 * Icons for the action list.
 *
 * Seven identical text pills stacked in a column is a list you have to *read* to use.
 * The same seven with a glyph in front are a list you can *scan* — and this panel is
 * opened dozens of times by someone who already knows which one they want. Inline SVG
 * rather than an icon package: the rest of the codebase draws its own, and adding a
 * dependency to render seven shapes would not survive the dead-code check.
 *
 * `1em` sizing comes from the button base, so each one tracks its label's font size.
 */
const icon = (paths: ReactNode) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {paths}
  </svg>
);

const ICONS = {
  dashboard: icon(
    <>
      <path d="M3 13h8V3H3zM13 21h8V11h-8zM13 7h8V3h-8zM3 21h8v-4H3z" />
    </>,
  ),
  guests: icon(
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>,
  ),
  edit: icon(
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
    </>,
  ),
  preview: icon(
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7" />
      <circle cx="12" cy="12" r="3" />
    </>,
  ),
  copy: icon(
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>,
  ),
  copied: icon(<path d="m4 12.5 5 5L20 6.5" />),
  whatsapp: icon(
    <>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-4-1L3 21l2.1-5A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5" />
      <path d="M8.6 9.2c0 3 2.2 5.2 5.2 5.2" />
    </>,
  ),
  tools: icon(
    <>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M1 14h6M9 8h6M17 16h6" />
    </>,
  ),
} as const;

/**
 * The shared shape of a grouped action.
 *
 * `justify-start` is the part that matters. `buttonClass` centres its content, which is
 * right for a button sized to its label and wrong for a full-width row: the text floats
 * in the middle with nothing to line up against. Aligned to the inline start, the icons
 * stack into a column and the eye gets a rail to run down.
 */
const ACTION_CLASS = buttonClass({
  variant: 'outline',
  size: 'sm',
  className: 'w-full justify-start',
});

/** A labelled set of related actions, so five choices read as two short lists. */
function ActionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h4 className="text-muted-foreground mb-1.5 text-xs font-semibold">{title}</h4>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function ActionLink({
  href,
  icon: glyph,
  children,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={ACTION_CLASS}>
      {glyph}
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
      <p className="text-primary text-sm font-semibold">ניהול ההזמנה</p>
      <p className="text-muted-foreground mt-1 text-xs" dir="ltr">
        {inviteUrl}
      </p>

      {/*
        Two levels of emphasis, two groups, and an icon on every row.

        The panel was seven identical text pills in a single column — a list you had to
        read to use, opened dozens of times by someone who already knew which row they
        wanted. Three things fix that, and none of them is more colour:

          - **Icons.** A glyph in front of each label turns reading into scanning.
          - **Two groups.** Managing the event and sharing the invitation are different
            errands. Splitting them means five choices become two sets of three, and the
            labels can shorten because the group heading carries the context —
            "ניהול מוזמנים וייבוא מהטלפון" is just "מוזמנים" under a heading that
            already says ניהול.
          - **`justify-start`.** Centred text in a full-width pill leaves the label
            floating with no edge to scan down. Aligned to the inline start, the icons
            form a column and the eye has a rail to follow.

        Emphasis stays at two levels. An earlier version ran `primary`, `secondary`,
        `outline`, `outline`, `outline`, `secondary`, `ghost`, and the `secondary` pair
        read as *weaker* than the outlines — `--secondary` is lightness 0.94 against
        `--border-strong` at 0.82, so a filled secondary button was paler than the
        outline ranked beneath it. That variant carries a real border now, but four
        levels was still more hierarchy than seven buttons can express.
      */}
      <div className="mt-4 space-y-4">
        <Link
          href={`/dashboard/events/${eventId}`}
          className={buttonClass({ size: 'sm', className: 'w-full justify-start' })}
        >
          {ICONS.dashboard}
          ניהול האירוע ואישורי ההגעה
        </Link>

        <ActionGroup title="ניהול">
          <ActionLink href={`/dashboard/events/${eventId}/guests`} icon={ICONS.guests}>
            מוזמנים וייבוא מהטלפון
          </ActionLink>
          <ActionLink href={`/dashboard/events/${eventId}/edit`} icon={ICONS.edit}>
            עריכת ההזמנה
          </ActionLink>
        </ActionGroup>

        <ActionGroup title="שיתוף">
          <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className={ACTION_CLASS}>
            {ICONS.preview}
            צפייה בהזמנה
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={copyInviteUrl}
            className="w-full justify-start"
          >
            {copied ? ICONS.copied : ICONS.copy}
            {copied ? 'הקישור הועתק' : 'העתקת הקישור'}
          </Button>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={ACTION_CLASS}>
            {ICONS.whatsapp}
            שליחה ב-WhatsApp
          </a>
        </ActionGroup>

        <Link
          href={`/dashboard/events/${eventId}/tools`}
          className={buttonClass({
            variant: 'ghost',
            size: 'sm',
            className: 'w-full justify-start',
          })}
        >
          {ICONS.tools}
          כלים מתקדמים
        </Link>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {copied ? 'קישור ההזמנה הועתק ללוח' : ''}
      </p>
    </div>
  );
}
