import { defaultLocale, type Locale } from '@/lib/i18n';

export const EVENT_TYPES = [
  'brit_mila',
  'britah',
  'pidyon_haben',
  'upsherin',
  'bar_mitzvah',
  'bat_mitzvah',
  'engagement',
  'henna',
  'wedding',
  'birthday',
  'other',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface EventTypePreset {
  readonly value: EventType;
  readonly label: string;
  readonly blessingLine: string;
  readonly invitationLine: string;
  readonly ceremonyTimeLabel: string;
  readonly honoreeLabel: string;
  readonly hostsLabel: string;
  readonly defaultSideALabel: string;
  readonly defaultSideBLabel: string;
}

type Presets = Readonly<Record<EventType, EventTypePreset>>;

const HEBREW_PRESETS: Presets = {
  brit_mila: {
    value: 'brit_mila',
    label: 'ברית מילה',
    blessingLine: 'בשבח והודיה לה׳ יתברך',
    invitationLine: 'שמחים להזמינכם לברית המילה של בננו',
    ceremonyTimeLabel: 'שעת הברית',
    honoreeLabel: 'שם הבן',
    hostsLabel: 'שמות ההורים',
    defaultSideALabel: 'משפחת האב',
    defaultSideBLabel: 'משפחת האם',
  },
  britah: {
    value: 'britah',
    label: 'בריתה / זבד הבת',
    blessingLine: 'בשבח והודיה לה׳ יתברך',
    invitationLine: 'שמחים להזמינכם לזבד הבת של בתנו',
    ceremonyTimeLabel: 'שעת הטקס',
    honoreeLabel: 'שם הבת',
    hostsLabel: 'שמות ההורים',
    defaultSideALabel: 'משפחת האב',
    defaultSideBLabel: 'משפחת האם',
  },
  pidyon_haben: {
    value: 'pidyon_haben',
    label: 'פדיון הבן',
    blessingLine: 'בשבח והודיה לה׳ יתברך',
    invitationLine: 'שמחים להזמינכם לפדיון הבן של בננו',
    ceremonyTimeLabel: 'שעת הפדיון',
    honoreeLabel: 'שם הבן',
    hostsLabel: 'שמות ההורים',
    defaultSideALabel: 'משפחת האב',
    defaultSideBLabel: 'משפחת האם',
  },
  upsherin: {
    value: 'upsherin',
    label: 'חלאקה',
    blessingLine: 'בשבח והודיה לה׳ יתברך',
    invitationLine: 'שמחים להזמינכם לחלאקה של בננו',
    ceremonyTimeLabel: 'שעת הטקס',
    honoreeLabel: 'שם הבן',
    hostsLabel: 'שמות ההורים',
    defaultSideALabel: 'משפחת האב',
    defaultSideBLabel: 'משפחת האם',
  },
  bar_mitzvah: {
    value: 'bar_mitzvah',
    label: 'בר מצווה',
    blessingLine: 'בשבח והודיה לה׳ יתברך',
    invitationLine: 'שמחים להזמינכם לחגוג את בר המצווה של בננו',
    ceremonyTimeLabel: 'שעת הטקס',
    honoreeLabel: 'שם חתן בר המצווה',
    hostsLabel: 'שמות ההורים',
    defaultSideALabel: 'משפחת האב',
    defaultSideBLabel: 'משפחת האם',
  },
  bat_mitzvah: {
    value: 'bat_mitzvah',
    label: 'בת מצווה',
    blessingLine: 'בשבח והודיה לה׳ יתברך',
    invitationLine: 'שמחים להזמינכם לחגוג את בת המצווה של בתנו',
    ceremonyTimeLabel: 'שעת הטקס',
    honoreeLabel: 'שם כלת בת המצווה',
    hostsLabel: 'שמות ההורים',
    defaultSideALabel: 'משפחת האב',
    defaultSideBLabel: 'משפחת האם',
  },
  engagement: {
    value: 'engagement',
    label: 'אירוסין / וורט',
    blessingLine: 'בשבח והודיה לה׳ יתברך',
    invitationLine: 'שמחים להזמינכם לאירוסין של',
    ceremonyTimeLabel: 'שעת האירוע',
    honoreeLabel: 'שמות בני הזוג',
    hostsLabel: 'שמות המשפחות',
    defaultSideALabel: 'צד החתן',
    defaultSideBLabel: 'צד הכלה',
  },
  henna: {
    value: 'henna',
    label: 'חינה',
    blessingLine: 'בשבח והודיה לה׳ יתברך',
    invitationLine: 'שמחים להזמינכם לחגוג את החינה של',
    ceremonyTimeLabel: 'שעת החינה',
    honoreeLabel: 'שמות בני הזוג',
    hostsLabel: 'שמות המשפחות',
    defaultSideALabel: 'צד החתן',
    defaultSideBLabel: 'צד הכלה',
  },
  wedding: {
    value: 'wedding',
    label: 'חתונה',
    blessingLine: 'בשבח והודיה לה׳ יתברך',
    invitationLine: 'שמחים להזמינכם לחתונה של',
    ceremonyTimeLabel: 'שעת החופה',
    honoreeLabel: 'שמות בני הזוג',
    hostsLabel: 'שמות המשפחות',
    defaultSideALabel: 'צד החתן',
    defaultSideBLabel: 'צד הכלה',
  },
  birthday: {
    value: 'birthday',
    label: 'יום הולדת',
    blessingLine: 'בשמחה גדולה',
    invitationLine: 'שמחים להזמינכם לחגוג את יום ההולדת של',
    ceremonyTimeLabel: 'שעת האירוע',
    honoreeLabel: 'שם החוגג/ת',
    hostsLabel: 'שמות המארחים',
    defaultSideALabel: 'משפחה',
    defaultSideBLabel: 'חברים',
  },
  other: {
    value: 'other',
    label: 'אירוע אחר',
    blessingLine: 'בשמחה גדולה',
    invitationLine: 'שמחים להזמינכם לאירוע של',
    ceremonyTimeLabel: 'שעת האירוע',
    honoreeLabel: 'שם החוגג/ת',
    hostsLabel: 'שמות המארחים',
    defaultSideALabel: 'צד א׳',
    defaultSideBLabel: 'צד ב׳',
  },
};

const ENGLISH_PRESETS: Presets = {
  brit_mila: {
    value: 'brit_mila',
    label: 'Brit milah',
    blessingLine: 'With praise and gratitude to the Almighty',
    invitationLine: 'We are delighted to invite you to the brit milah of our son',
    ceremonyTimeLabel: 'Brit milah',
    honoreeLabel: "Son's name",
    hostsLabel: "Parents' names",
    defaultSideALabel: "Father's family",
    defaultSideBLabel: "Mother's family",
  },
  britah: {
    value: 'britah',
    label: 'Baby naming / Zeved Habat',
    blessingLine: 'With praise and gratitude to the Almighty',
    invitationLine: 'We are delighted to invite you to celebrate the naming of our daughter',
    ceremonyTimeLabel: 'Ceremony time',
    honoreeLabel: "Daughter's name",
    hostsLabel: "Parents' names",
    defaultSideALabel: "Father's family",
    defaultSideBLabel: "Mother's family",
  },
  pidyon_haben: {
    value: 'pidyon_haben',
    label: 'Pidyon haben',
    blessingLine: 'With praise and gratitude to the Almighty',
    invitationLine: 'We are delighted to invite you to the pidyon haben of our son',
    ceremonyTimeLabel: 'Pidyon haben',
    honoreeLabel: "Son's name",
    hostsLabel: "Parents' names",
    defaultSideALabel: "Father's family",
    defaultSideBLabel: "Mother's family",
  },
  upsherin: {
    value: 'upsherin',
    label: 'Upsherin',
    blessingLine: 'With praise and gratitude to the Almighty',
    invitationLine: "We are delighted to invite you to our son's upsherin",
    ceremonyTimeLabel: 'Ceremony time',
    honoreeLabel: "Son's name",
    hostsLabel: "Parents' names",
    defaultSideALabel: "Father's family",
    defaultSideBLabel: "Mother's family",
  },
  bar_mitzvah: {
    value: 'bar_mitzvah',
    label: 'Bar mitzvah',
    blessingLine: 'With praise and gratitude to the Almighty',
    invitationLine: "We are delighted to invite you to celebrate our son's bar mitzvah",
    ceremonyTimeLabel: 'Ceremony time',
    honoreeLabel: "Bar mitzvah boy's name",
    hostsLabel: "Parents' names",
    defaultSideALabel: "Father's family",
    defaultSideBLabel: "Mother's family",
  },
  bat_mitzvah: {
    value: 'bat_mitzvah',
    label: 'Bat mitzvah',
    blessingLine: 'With praise and gratitude to the Almighty',
    invitationLine: "We are delighted to invite you to celebrate our daughter's bat mitzvah",
    ceremonyTimeLabel: 'Ceremony time',
    honoreeLabel: "Bat mitzvah girl's name",
    hostsLabel: "Parents' names",
    defaultSideALabel: "Father's family",
    defaultSideBLabel: "Mother's family",
  },
  engagement: {
    value: 'engagement',
    label: 'Engagement / vort',
    blessingLine: 'With praise and gratitude to the Almighty',
    invitationLine: 'We are delighted to invite you to the engagement of',
    ceremonyTimeLabel: 'Event time',
    honoreeLabel: "Couple's names",
    hostsLabel: "Families' names",
    defaultSideALabel: "Groom's side",
    defaultSideBLabel: "Bride's side",
  },
  henna: {
    value: 'henna',
    label: 'Henna',
    blessingLine: 'With praise and gratitude to the Almighty',
    invitationLine: 'We are delighted to invite you to celebrate the henna of',
    ceremonyTimeLabel: 'Henna time',
    honoreeLabel: "Couple's names",
    hostsLabel: "Families' names",
    defaultSideALabel: "Groom's side",
    defaultSideBLabel: "Bride's side",
  },
  wedding: {
    value: 'wedding',
    label: 'Wedding',
    blessingLine: 'With praise and gratitude to the Almighty',
    invitationLine: 'We are delighted to invite you to the wedding of',
    ceremonyTimeLabel: 'Chuppah',
    honoreeLabel: "Couple's names",
    hostsLabel: "Families' names",
    defaultSideALabel: "Groom's side",
    defaultSideBLabel: "Bride's side",
  },
  birthday: {
    value: 'birthday',
    label: 'Birthday',
    blessingLine: 'With great joy',
    invitationLine: 'We are delighted to invite you to celebrate the birthday of',
    ceremonyTimeLabel: 'Event time',
    honoreeLabel: "Celebrant's name",
    hostsLabel: "Hosts' names",
    defaultSideALabel: 'Family',
    defaultSideBLabel: 'Friends',
  },
  other: {
    value: 'other',
    label: 'Other event',
    blessingLine: 'With great joy',
    invitationLine: 'We are delighted to invite you to the celebration of',
    ceremonyTimeLabel: 'Event time',
    honoreeLabel: "Celebrant's name",
    hostsLabel: "Hosts' names",
    defaultSideALabel: 'Side A',
    defaultSideBLabel: 'Side B',
  },
};

export const EVENT_TYPE_PRESETS = HEBREW_PRESETS;
export const DEFAULT_EVENT_TYPE: EventType = 'other';

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value);
}

export function getEventTypePreset(
  value: unknown,
  locale: Locale = defaultLocale,
): EventTypePreset {
  const presets = locale === 'en' ? ENGLISH_PRESETS : HEBREW_PRESETS;
  return isEventType(value) ? presets[value] : presets[DEFAULT_EVENT_TYPE];
}

export function listEventTypePresets(locale: Locale = defaultLocale): readonly EventTypePreset[] {
  const presets = locale === 'en' ? ENGLISH_PRESETS : HEBREW_PRESETS;
  return EVENT_TYPES.map((type) => presets[type]);
}
