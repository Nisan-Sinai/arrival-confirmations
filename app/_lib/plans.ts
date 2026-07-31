export const PLAN_CODES = ['trial', 'basic', 'premium', 'legacy'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const LICENSE_STATUSES = [
  'trial',
  'pending_payment',
  'active',
  'cancelled',
  'refunded',
] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

/** Existing events stay active without charge; events created after this point start in trial. */
export const MONETIZATION_LAUNCH_AT = '2026-07-31T10:41:00.000Z' as const;

export interface PlanDefinition {
  readonly code: Exclude<PlanCode, 'legacy'>;
  readonly name: string;
  readonly priceAgorot: number;
  readonly attendeeLimit: number;
  readonly description: string;
  readonly features: readonly string[];
  readonly highlighted?: boolean;
}

export const PLAN_CATALOG: readonly PlanDefinition[] = [
  {
    code: 'trial',
    name: 'בדיקה חינמית',
    priceAgorot: 0,
    attendeeLimit: 10,
    description: 'יוצרים אירוע, מעצבים ובודקים לפני שמחליטים.',
    features: ['הזמנה דיגיטלית מלאה', 'דשבורד ניהול', 'עד 10 אישורי הגעה לבדיקה'],
  },
  {
    code: 'basic',
    name: 'Basic',
    priceAgorot: 9_900,
    attendeeLimit: 300,
    description: 'כל מה שצריך לניהול אישורי הגעה לאירוע אחד.',
    features: [
      'עד 300 מוזמנים',
      'אישורי הגעה ודשבורד בזמן אמת',
      'קישורי Waze ו-Google Maps',
      'הוספה ידנית וייצוא בסיסי',
    ],
  },
  {
    code: 'premium',
    name: 'Premium',
    priceAgorot: 19_900,
    attendeeLimit: 1_000,
    description: 'לאירועים שרוצים בהם אוטומציה, מיתוג ושליטה מתקדמת.',
    highlighted: true,
    features: [
      'כל מה שב-Basic',
      'יבוא מוזמנים מ-Excel',
      'WhatsApp אוטומטי ותזכורות',
      'מיתוג מתקדם',
      'סידור שולחנות והושבה',
    ],
  },
] as const;

export const PAYMENT_METHODS = ['phone', 'bit', 'bank_transfer', 'cash', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  phone: 'תשלום טלפוני',
  bit: 'Bit',
  bank_transfer: 'העברה בנקאית',
  cash: 'מזומן',
  other: 'אחר',
};

export function formatPlanPrice(priceAgorot: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(priceAgorot / 100);
}

export function getPlanDefinition(code: PlanCode): PlanDefinition | null {
  if (code === 'legacy') return null;
  return PLAN_CATALOG.find((plan) => plan.code === code) ?? null;
}

export function getPlanLabel(code: PlanCode): string {
  if (code === 'legacy') return 'אירוע קיים — ללא חיוב';
  return getPlanDefinition(code)?.name ?? 'לא ידוע';
}

export function isMonetizedEvent(createdAt: string): boolean {
  return createdAt >= MONETIZATION_LAUNCH_AT;
}
