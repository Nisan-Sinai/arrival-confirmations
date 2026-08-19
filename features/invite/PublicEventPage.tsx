/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getAppCopy } from '@/config/appCopy';
import { getEventTypePreset } from '@/config/eventTypes';
import { InvitationCard } from '@/features/invite/InvitationCard';
import { LanguageSwitch } from '@/features/layout/LanguageSwitch';
import { RsvpForm } from '@/features/rsvp/RsvpForm';
import { languageAlternates, localePath, openGraphLocale, type Locale } from '@/lib/i18n';
import { brandingCssVariables } from '@/lib/premiumEventTools';
import { getEventBrandingByPublicId, getEventByPublicId } from '@/repositories/eventRepository';

export interface PublicEventPageProps {
  readonly params: Promise<{ publicId: string }>;
}

export async function buildPublicEventMetadata(
  params: PublicEventPageProps['params'],
  locale: Locale,
): Promise<Metadata> {
  const { publicId } = await params;
  const event = await getEventByPublicId(publicId);
  if (event === null) return { robots: { index: false, follow: false } };

  const preset = getEventTypePreset(event.event_type, locale);
  const title = `${preset.label} · ${event.hosts_names}`;
  const description = `${preset.invitationLine} ${event.honoree_display_name}`;
  const path = `/e/${publicId}`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { languages: languageAlternates(path) },
    openGraph: {
      type: 'website',
      locale: openGraphLocale(locale),
      title,
      description,
      url: localePath(locale, path),
    },
  };
}

export async function PublicEventPage({
  params,
  locale,
}: PublicEventPageProps & { readonly locale: Locale }) {
  const { publicId } = await params;
  const [event, branding] = await Promise.all([
    getEventByPublicId(publicId),
    getEventBrandingByPublicId(publicId),
  ]);
  if (event === null) notFound();

  const preset = getEventTypePreset(event.event_type, locale);
  const copy = getAppCopy(locale).publicEvent;
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
      <div className="flex w-full max-w-3xl justify-end">
        <LanguageSwitch locale={locale} />
      </div>

      <section
        className={`w-full max-w-3xl ${shellClass}`}
        style={{ borderColor: branding.accentColor }}
        aria-label={copy.brandedInvitation}
      >
        {branding.logoUrl !== null && (
          <div className="mb-5 flex justify-center">
            <img
              src={branding.logoUrl}
              alt={copy.eventLogo}
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
          <InvitationCard event={event} locale={locale} />
        </div>
      </section>

      <div id="rsvp" className="w-full max-w-xl scroll-mt-8">
        <RsvpForm
          eventId={event.id!}
          sideALabel={event.side_a_label ?? preset.defaultSideALabel}
          sideBLabel={event.side_b_label ?? preset.defaultSideBLabel}
        />
      </div>
    </main>
  );
}
