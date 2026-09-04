import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requirePlatformOwner } from '@/app/_lib/platformAdmin';
import { buttonClass } from '@/components/ui/button';
import { Badge } from '@/components/ui/feedback';
import { UI_MESSAGES } from '@/config/messages';
import { InvitationCard } from '@/features/invite/InvitationCard';
import { brandingCssVariables, parsePublicBranding } from '@/lib/premiumEventTools';
import { createPrivilegedClient } from '@/lib/server/supabase';
import type { PublicEvent } from '@/repositories/eventRepository';

export const metadata: Metadata = {
  title: 'תצוגה מקדימה להזמנת לקוח',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type AdminPreviewEvent = PublicEvent & {
  readonly id: string;
  readonly public_id: string;
  readonly title: string;
  readonly is_active: boolean;
  readonly brand_primary_color: string;
  readonly brand_accent_color: string;
  readonly brand_logo_url: string | null;
  readonly invitation_style: string;
};

export default async function AdminCustomerInvitationPreviewPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  await requirePlatformOwner();
  const { id } = await params;
  const privileged = createPrivilegedClient() as unknown as SupabaseClient;
  const { data: rawEvent, error } = await privileged
    .from('events')
    .select(
      'id, public_id, title, is_active, event_type, event_date, ceremony_time, reception_time, venue_name, address, contact_phone, description, hosts_names, honoree_display_name, side_a_label, side_b_label, waze_url, google_maps_url, gift_url, brand_primary_color, brand_accent_color, brand_logo_url, invitation_style',
    )
    .eq('id', id)
    .maybeSingle();

  if (error || rawEvent === null) notFound();

  const event = rawEvent as unknown as AdminPreviewEvent;
  const branding = parsePublicBranding({
    primary_color: event.brand_primary_color,
    accent_color: event.brand_accent_color,
    logo_url: event.brand_logo_url,
    invitation_style: event.invitation_style,
  });
  const style = {
    ...brandingCssVariables(branding),
    backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${branding.accentColor} 18%, transparent), transparent 42%)`,
  } as CSSProperties;
  const shellClass =
    branding.invitationStyle === 'minimal'
      ? 'border-transparent bg-transparent p-0'
      : branding.invitationStyle === 'modern'
        ? 'rounded-[2.5rem] border-2 bg-white/70 p-3 shadow-xl backdrop-blur-sm sm:p-5'
        : 'rounded-3xl border-2 bg-white/55 p-3 shadow-lg backdrop-blur-sm sm:p-4';

  return (
    <main
      id="main"
      style={style}
      data-invitation-style={branding.invitationStyle}
      className="relative flex flex-1 flex-col items-center px-3 py-8 sm:px-4 sm:py-12"
    >
      <div className="mb-6 flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white/90 p-4 shadow-sm backdrop-blur-sm">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="gold">תצוגה מקדימה למנהל</Badge>
            <Badge tone={event.is_active ? 'success' : 'warning'}>
              {event.is_active ? 'הזמנה מפורסמת' : 'טיוטה פרטית'}
            </Badge>
          </div>
          <p className="text-primary mt-2 font-semibold">{event.title}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            התצוגה זמינה רק למנהל המערכת ואינה מפרסמת טיוטה לציבור.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/events/${event.id}`} className={buttonClass({ variant: 'outline' })}>
            חזרה לניהול האירוע
          </Link>
          {event.is_active && (
            <Link
              href={`/e/${event.public_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass()}
            >
              פתיחת הקישור הציבורי{' '}
              <span className="sr-only">({UI_MESSAGES.a11y.externalLink})</span>
            </Link>
          )}
        </div>
      </div>

      <section
        className={`w-full max-w-3xl ${shellClass}`}
        style={{ borderColor: branding.accentColor }}
        aria-label="תצוגה מקדימה להזמנת הלקוח"
      >
        {branding.logoUrl !== null && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logoUrl}
            alt="לוגו האירוע"
            width={96}
            height={96}
            className="mx-auto mb-5 size-24 rounded-2xl object-contain shadow-sm"
          />
        )}
        <div
          className="mx-auto h-1 w-24 rounded-full"
          style={{ backgroundColor: branding.primaryColor }}
        />
        <div className="mt-5">
          <InvitationCard event={event} />
        </div>
      </section>

      <p className="text-muted-foreground mt-6 max-w-2xl rounded-xl bg-white/85 px-4 py-3 text-center text-sm shadow-sm">
        טופס אישור ההגעה אינו מוצג במצב תצוגה מקדימה, כדי שלא ליצור תשובת אורח בטעות.
      </p>
    </main>
  );
}
