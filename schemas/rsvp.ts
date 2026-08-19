import { z } from 'zod';

import { getDictionary } from '@/config/dictionary';
import { appConfig } from '@/config/event.config';
import { defaultLocale, type Locale } from '@/lib/i18n';
import { tryNormalizeIsraeliPhone } from '@/lib/phone';

const MAX_PER_CATEGORY = appConfig.maxAttendeesPerCategory;

export const ATTENDANCE_STATUSES = ['attending', 'not_attending', 'maybe'] as const;
export const FAMILY_SIDES = ['side_a', 'side_b', 'other'] as const;

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();
const stripInvisibles = (value: string): string =>
  value.replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '');
const sanitizedText = z.string().transform((value) => collapseWhitespace(stripInvisibles(value)));

function schemasFor(locale: Locale) {
  const messages = getDictionary(locale).validation;
  const fullName = sanitizedText.pipe(
    z.string().min(2, messages.fullNameTooShort).max(120, messages.fullNameTooLong),
  );
  const phone = z.string().transform((value, ctx) => {
    const result = tryNormalizeIsraeliPhone(value);
    if (!result.ok) {
      ctx.addIssue({ code: 'custom', message: messages.phoneInvalid });
      return z.NEVER;
    }
    return result.value;
  });
  const attendeeCount = z
    .number({ message: messages.countNegative })
    .int(messages.countNegative)
    .min(0, messages.countNegative)
    .max(MAX_PER_CATEGORY, messages.countTooLarge);
  const coercedCount = z.preprocess((value) => {
    if (value === '' || value === null || value === undefined) return 0;
    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      return Number.isNaN(parsed) ? value : parsed;
    }
    return value;
  }, attendeeCount);
  const optionalNote = (max: number, message: string) =>
    z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => {
        if (value === null || value === undefined) return null;
        const cleaned = collapseWhitespace(stripInvisibles(value));
        return cleaned === '' ? null : cleaned;
      })
      .refine((value) => value === null || value.length <= max, { message });

  const submission = z
    .object({
      fullName,
      phone,
      attendanceStatus: z.enum(ATTENDANCE_STATUSES, { message: messages.attendanceRequired }),
      adultsCount: coercedCount,
      childrenCount: coercedCount,
      babiesCount: coercedCount,
      familySide: z
        .union([z.enum(FAMILY_SIDES), z.literal(''), z.null(), z.undefined()])
        .transform((value) => (value === '' || value === undefined ? null : value)),
      dietaryRequirements: optionalNote(500, messages.dietaryTooLong),
      notes: optionalNote(1000, messages.notesTooLong),
      consent: z.literal(true, { message: messages.consentRequired }),
      company: z
        .union([z.string(), z.undefined()])
        .refine((value) => value === undefined || value === '', { message: messages.required }),
    })
    .superRefine((value, ctx) => {
      if (
        value.attendanceStatus === 'not_attending' &&
        value.adultsCount + value.childrenCount + value.babiesCount > 0
      ) {
        ctx.addIssue({ code: 'custom', path: ['adultsCount'], message: messages.countTooLarge });
      }
    });

  return { fullName, phone, coercedCount, submission };
}

const hebrewSchemas = schemasFor(defaultLocale);
export const fullNameSchema = hebrewSchemas.fullName;
export const phoneSchema = hebrewSchemas.phone;
export const coercedCountSchema = hebrewSchemas.coercedCount;
export const rsvpSubmissionSchema = hebrewSchemas.submission;

export type RsvpSubmission = z.infer<typeof rsvpSubmissionSchema>;

export function parseRsvpSubmission(
  payload: unknown,
  locale: Locale = defaultLocale,
): z.ZodSafeParseResult<RsvpSubmission> {
  return schemasFor(locale).submission.safeParse(payload) as z.ZodSafeParseResult<RsvpSubmission>;
}

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}
