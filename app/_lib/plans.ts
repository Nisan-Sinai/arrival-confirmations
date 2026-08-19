import { type Locale } from '@/lib/i18n';

export const PLAN_CODES = ['trial', 'basic', 'premium', 'pro', 'legacy'] as const;
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
      'שליחת קישור ידנית מה-WhatsApp האישי',
      'הוספה ידנית וייצוא בסיסי',
    ],
  },
  {
    code: 'premium',
    name: 'Premium',
    priceAgorot: 19_900,
    attendeeLimit: 1_000,
    description: 'מערכת מלאה לניהול חכם, עיצוב ושליחת הזמנות מהטלפון האישי.',
    features: [
      'כל מה שב-Basic',
      'עד 1,000 מוזמנים',
      'יבוא ועדכון מוזמנים מ-Excel, CSV ו-TSV',
      'מרכז שליחה חכם מה-WhatsApp האישי',
      'הודעה אישית מוכנה לכל מוזמן בלחיצה',
      'סינון אוטומטי של מי שעדיין לא ענה',
      'שמירת התקדמות נפרדת להזמנות ולתזכורות',
      'מיתוג מתקדם עם לוגו, צבעים וסגנונות',
      'מפת שולחנות ומושבים בסיסית',
      'ללא עלות הודעות וללא צורך בחשבון WhatsApp Business',
    ],
  },
  {
    code: 'pro',
    name: 'Pro',
    priceAgorot: 34_900,
    attendeeLimit: 2_500,
    description: 'חבילת הפקה והושבה מתקדמת לאירועים גדולים, אולמות ומפיקים.',
    highlighted: true,
    features: [
      'כל מה שב-Premium',
      'עד 2,500 מוזמנים',
      'סטודיו הושבה מתקדם עם שולחנות, אזורים, צורות וקיבולת',
      'הושבה חכמה אוטומטית לפי קבוצות, צדדים וגודל משפחה',
      'נעילת מקומות חשובים ומניעת חריגה מקיבולת',
      'ניהול קבוצות, העדפות אוכל וצרכי נגישות',
      'עדיפויות הושבה, מושבים מסומנים וזיהוי התנגשויות',
      'מדדי תפוסה, מקומות פנויים ומוזמנים שטרם שובצו',
      'שמירת נקודות שחזור והיסטוריית סידורי הושבה',
      'ייצוא CSV ל-Excel, הדפסה ותצוגת אולם',
      'ללא API חיצוני, ללא תשלום לפי פעולה וללא עלויות נסתרות',
    ],
  },
] as const;

type PlanCopy = Pick<PlanDefinition, 'name' | 'description' | 'features'>;

const PLAN_COPY_EN: Record<Exclude<PlanCode, 'legacy'>, PlanCopy> = {
  trial: {
    name: 'Free trial',
    description: 'Build an event, design it and try it before you decide.',
    features: ['A complete digital invitation', 'A management dashboard', 'Up to 10 trial replies'],
  },
  basic: {
    name: 'Basic',
    description: 'Everything you need to run the RSVPs for a single event.',
    features: [
      'Up to 300 guests',
      'Live RSVPs and dashboard',
      'Waze and Google Maps links',
      'Send the link by hand from your own WhatsApp',
      'Manual entry and basic export',
    ],
  },
  premium: {
    name: 'Premium',
    description: 'A full toolkit for smart management, branding and sending from your own phone.',
    features: [
      'Everything in Basic',
      'Up to 1,000 guests',
      'Import and update guests from Excel, CSV and TSV',
      'A smart send centre from your own WhatsApp',
      'A personal message ready for each guest in one tap',
      'Automatic filtering of who has not replied yet',
      'Separate progress tracking for invitations and reminders',
      'Advanced branding with a logo, colours and styles',
      'A basic tables-and-seating map',
      'No messaging fees and no WhatsApp Business account needed',
    ],
  },
  pro: {
    name: 'Pro',
    description:
      'An advanced production and seating package for large events, venues and planners.',
    features: [
      'Everything in Premium',
      'Up to 2,500 guests',
      'An advanced seating studio with tables, zones, shapes and capacity',
      'Automatic smart seating by group, side and family size',
      'Lock key seats and prevent going over capacity',
      'Manage groups, dietary preferences and accessibility needs',
      'Seating priorities, marked seats and clash detection',
      'Occupancy metrics, free seats and guests not yet placed',
      'Saved restore points and a seating-arrangement history',
      'CSV export to Excel, printing and a venue view',
      'No external API, no per-action fees and no hidden costs',
    ],
  },
};

export function getPlanCatalog(locale: Locale): readonly PlanDefinition[] {
  if (locale === 'he') return PLAN_CATALOG;
  return PLAN_CATALOG.map((plan) => ({ ...plan, ...PLAN_COPY_EN[plan.code] }));
}

export const PAYMENT_METHODS = ['phone', 'bit', 'bank_transfer', 'cash', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  phone: 'תשלום טלפוני',
  bit: 'Bit',
  bank_transfer: 'העברה בנקאית',
  cash: 'מזומן',
  other: 'אחר',
};

const PAYMENT_METHOD_LABELS_EN: Record<PaymentMethod, string> = {
  phone: 'Phone payment',
  bit: 'Bit',
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  other: 'Other',
};

export function getPaymentMethodLabels(
  locale: Locale = 'he',
): Readonly<Record<PaymentMethod, string>> {
  return locale === 'en' ? PAYMENT_METHOD_LABELS_EN : PAYMENT_METHOD_LABELS;
}

export function formatPlanPrice(priceAgorot: number, locale: Locale = 'he'): string {
  return new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-US', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(priceAgorot / 100);
}

export function getPlanDefinition(code: PlanCode, locale: Locale = 'he'): PlanDefinition | null {
  if (code === 'legacy') return null;
  return getPlanCatalog(locale).find((plan) => plan.code === code) ?? null;
}

export function getPlanLabel(code: PlanCode, locale: Locale = 'he'): string {
  if (code === 'legacy') return locale === 'he' ? 'אירוע קיים — ללא חיוב' : 'Existing event — no charge';
  return getPlanDefinition(code, locale)?.name ?? (locale === 'he' ? 'לא ידוע' : 'Unknown');
}

export function isMonetizedEvent(createdAt: string): boolean {
  return createdAt >= MONETIZATION_LAUNCH_AT;
}
