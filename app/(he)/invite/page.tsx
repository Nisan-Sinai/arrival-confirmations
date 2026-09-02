/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';

import { Card } from '@/components/ui/card';
import { InvitationCard } from '@/features/invite/InvitationCard';
import { SeatCard } from '@/features/invite/SeatCard';
import { PersonalInviteOpenTracker } from '@/features/rsvp/PersonalInviteOpenTracker';
import { PersonalRsvpButtons } from '@/features/rsvp/PersonalRsvpButtons';
import { brandingCssVariables } from '@/lib/premiumEventTools';
import { getActiveInviteContext } from '@/lib/server/currentInvite';
import { createPrivilegedClient } from '@/lib/server/supabase';
import { getEventBrandingByPublicId, getEventByPublicId } from '@/repositories/eventRepository';

export const metadata: Metadata = {
  title: 'אישור הגעה אישי',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function PersonalInvitePage() {
  const context = await getActiveInviteContext();
  if (context === null) {
    return (
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
        <Card padding="lg" className="max-w-lg text-center">
          <h1 className="text-h1 text-primary font-bold">הקישור האישי אינו תקף</h1>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            ייתכן שהקישור פג, בוטל או הוחלף בקישור חדש. בקשו מבעלי האירוע לשלוח לכם שוב את ההזמנה
            האישית.
          </p>
        </Card>
      </main>
    );
  }

  const [event, branding] = await Promise.all([
    getEventByPublicId(context.event.publicId),
    getEventBrandingByPublicId(context.event.publicId),
  ]);
  if (event === null) {
    return (
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
        <Card padding="lg" className="max-w-lg text-center">
          <h1 className="text-h1 text-primary font-bold">האירוע אינו זמין</h1>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            ההזמנה אינה מפורסמת כרגע. אפשר לפנות לבעלי האירוע לקבלת פרטים.
          </p>
        </Card>
      </main>
    );
  }

  const privileged = createPrivilegedClient();
  const { data: existingRsvp } = await privileged
    .from('rsvps')
    .select('attendance_status')
    .eq('event_id', context.event.id)
    .eq('guest_id', context.guest.id)
    .maybeSingle();

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
      className="relative flex flex-1 flex-col items-center gap-10 px-3 py-8 sm:px-4 sm:py-16"
    >
      <PersonalInviteOpenTracker />

      <section
        className={`w-full max-w-3xl ${shellClass}`}
        style={{ borderColor: branding.accentColor }}
        aria-label="הזמנה אישית ממותגת"
      >
        {branding.logoUrl !== null && (
          <div className="mb-5 flex justify-center">
            <img
              src={branding.logoUrl}
              alt="לוגו האירוע"
              width={96}
              height={96}
              className="size-24 rounded-2xl object-contain shadow-sm"
            />
          </div>
        )}
        <div
          className="mx-auto h-1 w-24 rounded-full"
          style={{ backgroundColor: branding.primaryColor }}
        />
        <div className="mt-5">
          <InvitationCard event={event} />
        </div>
      </section>

      <div id="rsvp" className="flex w-full max-w-xl scroll-mt-8 flex-col gap-6">
        {/* Above the buttons, not below: a guest who already answered comes back to this
            page for exactly one reason, and it is not to answer again. */}
        <SeatCard
          tableName={context.guest.tableName}
          seatNumber={context.guest.seatNumber}
          partySize={context.guest.partySize}
        />

        <PersonalRsvpButtons
          guestName={context.guest.fullName}
          partySize={context.guest.partySize}
          currentStatus={existingRsvp?.attendance_status ?? null}
        />
      </div>
    </main>
  );
}
