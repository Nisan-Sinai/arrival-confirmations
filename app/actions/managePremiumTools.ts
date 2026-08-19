'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getEventLicense } from '@/app/_lib/eventLicenses';
import { isMonetizedEvent } from '@/app/_lib/plans';
import { GuestImportError, importGuestsFromFile } from '@/lib/guestImport';
import { defaultLocale, isLocale, localePath, type Locale } from '@/lib/i18n';
import { normalizeIsraeliPhone, PhoneNormalizationError } from '@/lib/phone';
import { isHexColor, isInvitationStyle, normalizeHttpsUrl } from '@/lib/premiumEventTools';
import { createUserClient } from '@/lib/server/supabase';

export interface PremiumToolState {
  readonly status: 'idle' | 'success' | 'error';
  readonly message: string;
  readonly details?: readonly string[];
}

interface OwnedEvent {
  readonly id: string;
  readonly public_id: string;
  readonly title: string;
  readonly created_at: string;
}

interface OwnedPremiumContext {
  readonly db: SupabaseClient;
  readonly event: OwnedEvent;
}

const COPY = {
  he: {
    denied: 'הכלים המתקדמים זמינים באירוע Premium או Pro פעיל בלבד.',
    chooseFile: 'יש לבחור קובץ XLSX, CSV או TSV.',
    fileLarge: 'הקובץ גדול מדי. הגודל המרבי הוא 5MB.',
    noPhone: 'לא נמצא אף מספר טלפון ישראלי תקין בקובץ.',
    guestsSaveFailed: 'שמירת המוזמנים נכשלה. נסו שוב.',
    imported: (count: number, skipped: number) =>
      `יובאו ${count} מוזמנים בהצלחה${skipped > 0 ? `; ${skipped} שורות דולגו` : ''}.`,
    fileReadFailed: 'לא ניתן לקרוא את הקובץ. ודאו שהוא תקין ונסו שוב.',
    invalidColors: 'יש לבחור צבעים תקינים בפורמט HEX.',
    invalidLogo: 'כתובת הלוגו חייבת להיות כתובת HTTPS תקינה.',
    invalidStyle: 'סגנון ההזמנה אינו תקין.',
    brandingFailed: 'שמירת המיתוג נכשלה.',
    brandingSaved: 'המיתוג נשמר ומופיע בהזמנה.',
    seatingInvalid: 'נתוני ההושבה אינם תקינים.',
    seatingFailed: 'שמירת ההושבה נכשלה.',
    seatingSaved: 'מפת ההושבה נשמרה.',
  },
  en: {
    denied: 'Advanced tools are available only for an active Premium or Pro event.',
    chooseFile: 'Choose an XLSX, CSV or TSV file.',
    fileLarge: 'The file is too large. Maximum size is 5MB.',
    noPhone: 'No valid Israeli phone number was found in the file.',
    guestsSaveFailed: 'We could not save the guests. Please try again.',
    imported: (count: number, skipped: number) =>
      `Imported ${count} guests successfully${skipped > 0 ? `; ${skipped} rows were skipped` : ''}.`,
    fileReadFailed: 'The file could not be read. Check it and try again.',
    invalidColors: 'Choose valid HEX colours.',
    invalidLogo: 'The logo URL must be a valid HTTPS address.',
    invalidStyle: 'The invitation style is invalid.',
    brandingFailed: 'We could not save the branding.',
    brandingSaved: 'Branding saved and applied to the invitation.',
    seatingInvalid: 'The seating data is invalid.',
    seatingFailed: 'We could not save the seating plan.',
    seatingSaved: 'The seating plan was saved.',
  },
} as const;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function localeOf(formData: FormData): Locale {
  const value = formData.get('locale');
  return typeof value === 'string' && isLocale(value) ? value : defaultLocale;
}

async function requireOwnedPremiumEvent(eventId: string): Promise<OwnedPremiumContext | null> {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return null;

  const db = supabase as unknown as SupabaseClient;
  const { data } = await db
    .from('events')
    .select('id, public_id, title, created_at')
    .eq('id', eventId)
    .maybeSingle();
  if (data === null) return null;

  const event = data as OwnedEvent;
  const license = await getEventLicense(
    event.id,
    isMonetizedEvent(event.created_at) ? 'trial' : 'legacy',
  );
  const paidTools = license.plan === 'premium' || license.plan === 'pro';
  const enabled = license.plan === 'legacy' || (paidTools && license.status === 'active');
  return enabled ? { db, event } : null;
}

function denied(locale: Locale): PremiumToolState {
  return { status: 'error', message: COPY[locale].denied };
}

export async function importGuestsAction(
  _previous: PremiumToolState,
  formData: FormData,
): Promise<PremiumToolState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedPremiumEvent(eventId);
  if (context === null) return denied(locale);

  const file = formData.get('guestFile');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: copy.chooseFile };
  }
  if (file.size > 5_000_000) return { status: 'error', message: copy.fileLarge };

  try {
    const parsed = importGuestsFromFile(new Uint8Array(await file.arrayBuffer()), file.name);
    const invalid: string[] = [];
    const unique = new Map<string, Record<string, unknown>>();

    for (const guest of parsed.rows) {
      try {
        const normalized = normalizeIsraeliPhone(guest.phone);
        unique.set(normalized, {
          event_id: context.event.id,
          full_name: guest.fullName,
          phone: guest.phone,
          phone_normalized: normalized,
          email: guest.email,
          family_side: guest.familySide,
          party_size: guest.partySize,
          table_name: guest.tableName,
          seat_number: guest.seatNumber,
          import_source: parsed.source,
          notes: guest.notes,
          is_active: true,
        });
      } catch (error) {
        if (error instanceof PhoneNormalizationError) invalid.push(`${guest.fullName}: ${guest.phone}`);
        else throw error;
      }
    }

    if (unique.size === 0) {
      return { status: 'error', message: copy.noPhone, details: invalid.slice(0, 10) };
    }

    const { error } = await context.db.from('guests').upsert([...unique.values()], {
      onConflict: 'event_id,phone_normalized',
      ignoreDuplicates: false,
    });
    if (error) return { status: 'error', message: copy.guestsSaveFailed };

    revalidatePath(localePath(locale, `/dashboard/events/${eventId}`));
    revalidatePath(localePath(locale, `/dashboard/events/${eventId}/tools`));
    return {
      status: 'success',
      message: copy.imported(unique.size, invalid.length),
      details: invalid.slice(0, 10),
    };
  } catch (error) {
    if (error instanceof GuestImportError) return { status: 'error', message: error.message };
    return { status: 'error', message: copy.fileReadFailed };
  }
}

export async function saveBrandingAction(
  _previous: PremiumToolState,
  formData: FormData,
): Promise<PremiumToolState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedPremiumEvent(eventId);
  if (context === null) return denied(locale);

  const primaryColor = text(formData, 'primaryColor');
  const accentColor = text(formData, 'accentColor');
  const logoInput = text(formData, 'logoUrl');
  const invitationStyle = text(formData, 'invitationStyle');
  const logoUrl = normalizeHttpsUrl(logoInput);

  if (!isHexColor(primaryColor) || !isHexColor(accentColor)) {
    return { status: 'error', message: copy.invalidColors };
  }
  if (logoInput !== '' && logoUrl === null) return { status: 'error', message: copy.invalidLogo };
  if (!isInvitationStyle(invitationStyle)) return { status: 'error', message: copy.invalidStyle };

  const { error } = await context.db
    .from('events')
    .update({
      brand_primary_color: primaryColor.toUpperCase(),
      brand_accent_color: accentColor.toUpperCase(),
      brand_logo_url: logoUrl,
      invitation_style: invitationStyle,
    })
    .eq('id', eventId);
  if (error) return { status: 'error', message: copy.brandingFailed };

  revalidatePath(localePath(locale, `/dashboard/events/${eventId}/tools`));
  revalidatePath(localePath(locale, '/e'), 'layout');
  return { status: 'success', message: copy.brandingSaved };
}

export async function saveSeatingAction(
  _previous: PremiumToolState,
  formData: FormData,
): Promise<PremiumToolState> {
  const locale = localeOf(formData);
  const copy = COPY[locale];
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedPremiumEvent(eventId);
  if (context === null) return denied(locale);

  const guestIds = formData.getAll('guestId');
  const tableNames = formData.getAll('tableName');
  const seatNumbers = formData.getAll('seatNumber');
  if (guestIds.length !== tableNames.length || guestIds.length !== seatNumbers.length) {
    return { status: 'error', message: copy.seatingInvalid };
  }

  for (let index = 0; index < guestIds.length; index += 1) {
    const guestId = guestIds[index];
    const tableName = tableNames[index];
    const seatNumber = seatNumbers[index];
    if (typeof guestId !== 'string' || typeof tableName !== 'string' || typeof seatNumber !== 'string') {
      return { status: 'error', message: copy.seatingInvalid };
    }

    const { error } = await context.db
      .from('guests')
      .update({ table_name: tableName.trim() || null, seat_number: seatNumber.trim() || null })
      .eq('event_id', eventId)
      .eq('id', guestId);
    if (error) return { status: 'error', message: copy.seatingFailed };
  }

  revalidatePath(localePath(locale, `/dashboard/events/${eventId}/tools`));
  return { status: 'success', message: copy.seatingSaved };
}
