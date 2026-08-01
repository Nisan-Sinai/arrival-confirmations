'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getEventLicense } from '@/app/_lib/eventLicenses';
import { isMonetizedEvent } from '@/app/_lib/plans';
import { GuestImportError, importGuestsFromFile } from '@/lib/guestImport';
import { normalizeIsraeliPhone, PhoneNormalizationError } from '@/lib/phone';
import {
  isHexColor,
  isInvitationStyle,
  isWhatsAppLanguageCode,
  isWhatsAppTemplateName,
  normalizeHttpsUrl,
  parseScheduleDate,
} from '@/lib/premiumEventTools';
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

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
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
  const license = await getEventLicense(event.id, isMonetizedEvent(event.created_at) ? 'trial' : 'legacy');
  const enabled =
    license.plan === 'legacy' || (license.plan === 'premium' && license.status === 'active');
  return enabled ? { db, event } : null;
}

function denied(): PremiumToolState {
  return {
    status: 'error',
    message: 'הכלים המתקדמים זמינים באירוע Premium פעיל בלבד.',
  };
}

export async function importGuestsAction(
  _previous: PremiumToolState,
  formData: FormData,
): Promise<PremiumToolState> {
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedPremiumEvent(eventId);
  if (context === null) return denied();

  const file = formData.get('guestFile');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: 'יש לבחור קובץ XLSX, CSV או TSV.' };
  }
  if (file.size > 5_000_000) {
    return { status: 'error', message: 'הקובץ גדול מדי. הגודל המרבי הוא 5MB.' };
  }

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
        if (error instanceof PhoneNormalizationError) {
          invalid.push(`${guest.fullName}: ${guest.phone}`);
        } else {
          throw error;
        }
      }
    }

    if (unique.size === 0) {
      return {
        status: 'error',
        message: 'לא נמצא אף מספר טלפון ישראלי תקין בקובץ.',
        details: invalid.slice(0, 10),
      };
    }

    const { error } = await context.db.from('guests').upsert([...unique.values()], {
      onConflict: 'event_id,phone_normalized',
      ignoreDuplicates: false,
    });
    if (error) return { status: 'error', message: 'שמירת המוזמנים נכשלה. נסו שוב.' };

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath(`/dashboard/events/${eventId}/tools`);
    return {
      status: 'success',
      message: `יובאו ${unique.size} מוזמנים בהצלחה${invalid.length > 0 ? `; ${invalid.length} שורות דולגו` : ''}.`,
      details: invalid.slice(0, 10),
    };
  } catch (error) {
    if (error instanceof GuestImportError) {
      return { status: 'error', message: error.message };
    }
    return { status: 'error', message: 'לא ניתן לקרוא את הקובץ. ודאו שהוא תקין ונסו שוב.' };
  }
}

export async function saveBrandingAction(
  _previous: PremiumToolState,
  formData: FormData,
): Promise<PremiumToolState> {
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedPremiumEvent(eventId);
  if (context === null) return denied();

  const primaryColor = text(formData, 'primaryColor');
  const accentColor = text(formData, 'accentColor');
  const logoInput = text(formData, 'logoUrl');
  const invitationStyle = text(formData, 'invitationStyle');
  const logoUrl = normalizeHttpsUrl(logoInput);

  if (!isHexColor(primaryColor) || !isHexColor(accentColor)) {
    return { status: 'error', message: 'יש לבחור צבעים תקינים בפורמט HEX.' };
  }
  if (logoInput !== '' && logoUrl === null) {
    return { status: 'error', message: 'כתובת הלוגו חייבת להיות כתובת HTTPS תקינה.' };
  }
  if (!isInvitationStyle(invitationStyle)) {
    return { status: 'error', message: 'סגנון ההזמנה אינו תקין.' };
  }

  const { error } = await context.db
    .from('events')
    .update({
      brand_primary_color: primaryColor.toUpperCase(),
      brand_accent_color: accentColor.toUpperCase(),
      brand_logo_url: logoUrl,
      invitation_style: invitationStyle,
    })
    .eq('id', eventId);
  if (error) return { status: 'error', message: 'שמירת המיתוג נכשלה.' };

  revalidatePath(`/dashboard/events/${eventId}/tools`);
  revalidatePath('/e', 'layout');
  return { status: 'success', message: 'המיתוג נשמר ומופיע בהזמנה.' };
}

export async function saveSeatingAction(
  _previous: PremiumToolState,
  formData: FormData,
): Promise<PremiumToolState> {
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedPremiumEvent(eventId);
  if (context === null) return denied();

  const guestIds = formData.getAll('guestId');
  const tableNames = formData.getAll('tableName');
  const seatNumbers = formData.getAll('seatNumber');
  if (guestIds.length !== tableNames.length || guestIds.length !== seatNumbers.length) {
    return { status: 'error', message: 'נתוני ההושבה אינם תקינים.' };
  }

  for (let index = 0; index < guestIds.length; index += 1) {
    const guestId = guestIds[index];
    const tableName = tableNames[index];
    const seatNumber = seatNumbers[index];
    if (typeof guestId !== 'string' || typeof tableName !== 'string' || typeof seatNumber !== 'string') {
      return { status: 'error', message: 'נתוני ההושבה אינם תקינים.' };
    }

    const { error } = await context.db
      .from('guests')
      .update({
        table_name: tableName.trim() || null,
        seat_number: seatNumber.trim() || null,
      })
      .eq('event_id', eventId)
      .eq('id', guestId);
    if (error) return { status: 'error', message: 'שמירת ההושבה נכשלה.' };
  }

  revalidatePath(`/dashboard/events/${eventId}/tools`);
  return { status: 'success', message: 'מפת ההושבה נשמרה.' };
}

export async function queueWhatsAppAction(
  _previous: PremiumToolState,
  formData: FormData,
): Promise<PremiumToolState> {
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedPremiumEvent(eventId);
  if (context === null) return denied();

  const templateName = text(formData, 'templateName');
  const languageCode = text(formData, 'languageCode');
  const messageKind = text(formData, 'messageKind') === 'invitation' ? 'invitation' : 'reminder';
  const scope = text(formData, 'scope');
  const scheduled = parseScheduleDate(text(formData, 'scheduledFor'));

  if (!isWhatsAppTemplateName(templateName)) {
    return { status: 'error', message: 'שם תבנית WhatsApp יכול להכיל אותיות קטנות, מספרים וקו תחתון בלבד.' };
  }
  if (!isWhatsAppLanguageCode(languageCode)) {
    return { status: 'error', message: 'קוד השפה של תבנית WhatsApp אינו תקין.' };
  }
  if (scheduled === null) {
    return { status: 'error', message: 'יש לבחור מועד תקין שאינו בעבר.' };
  }

  const [{ data: guests, error: guestsError }, { data: rsvps, error: rsvpError }] = await Promise.all([
    context.db
      .from('guests')
      .select('id, phone_normalized')
      .eq('event_id', eventId)
      .eq('is_active', true),
    context.db.from('rsvps').select('phone_normalized').eq('event_id', eventId),
  ]);
  if (guestsError || rsvpError) return { status: 'error', message: 'טעינת המוזמנים נכשלה.' };

  const answered = new Set(
    (rsvps ?? []).map((row) => String((row as { phone_normalized: string }).phone_normalized)),
  );
  const recipients = (guests ?? []).filter((row) => {
    const phone = String((row as { phone_normalized: string }).phone_normalized);
    return scope !== 'unanswered' || !answered.has(phone);
  });
  if (recipients.length === 0) {
    return { status: 'error', message: 'לא נמצאו מוזמנים מתאימים לשליחה.' };
  }

  const queueRows = recipients.map((row) => {
    const guest = row as { id: string; phone_normalized: string };
    return {
      event_id: eventId,
      guest_id: guest.id,
      recipient_phone: guest.phone_normalized,
      message_kind: messageKind,
      template_name: templateName,
      language_code: languageCode,
      scheduled_for: scheduled.toISOString(),
      status: 'pending',
    };
  });

  const [{ error: queueError }, { error: eventError }] = await Promise.all([
    context.db.from('event_messages').insert(queueRows),
    context.db
      .from('events')
      .update({
        whatsapp_template_name: templateName,
        whatsapp_language_code: languageCode,
      })
      .eq('id', eventId),
  ]);
  if (queueError || eventError) return { status: 'error', message: 'יצירת תור ההודעות נכשלה.' };

  revalidatePath(`/dashboard/events/${eventId}/tools`);
  return {
    status: 'success',
    message: `${recipients.length} הודעות נוספו לתור וישלחו במועד שנבחר.`,
  };
}

export async function cancelPendingMessagesAction(formData: FormData): Promise<void> {
  const eventId = text(formData, 'eventId');
  const context = await requireOwnedPremiumEvent(eventId);
  if (context === null) return;

  await context.db
    .from('event_messages')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('status', 'pending');
  revalidatePath(`/dashboard/events/${eventId}/tools`);
}
