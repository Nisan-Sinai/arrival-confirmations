/**
 * Event-type presets.
 *
 * Adding a new kind of event is a single-object change here: append the id to
 * `EVENT_TYPES` and add the matching entry to `EVENT_TYPE_PRESETS`. Nothing else
 * in the application hard-codes a specific kind of event.
 *
 * A preset only supplies *defaults and wording*. Every concrete event stores its
 * own values in the `events` table and can override the side labels, so the same
 * deployment serves a brit, a wedding and a birthday at the same time.
 */

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
  /** Stable identifier, matches the `event_type` enum in Postgres. */
  readonly value: EventType;
  /** Hebrew name of the event kind, e.g. for the admin type picker. */
  readonly label: string;
  /** Opening blessing rendered above the invitation headline. */
  readonly blessingLine: string;
  /** Invitation sentence. `{hosts}` and `{honoree}` are substituted at render time. */
  readonly invitationLine: string;
  /** Label for the main ceremony time, e.g. "שעת הברית" / "שעת החופה". */
  readonly ceremonyTimeLabel: string;
  /** Admin-form label for the person the event celebrates. */
  readonly honoreeLabel: string;
  /** Admin-form label for the hosts. */
  readonly hostsLabel: string;
  /** Default label for the first family side. */
  readonly defaultSideALabel: string;
  /** Default label for the second family side. */
  readonly defaultSideBLabel: string;
}

export const EVENT_TYPE_PRESETS: Readonly<Record<EventType, EventTypePreset>> = {
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

export const DEFAULT_EVENT_TYPE: EventType = 'other';

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Returns the preset for a type, falling back to the neutral `other` preset when
 * the stored value is unknown (for example a row written by a newer version).
 */
export function getEventTypePreset(value: unknown): EventTypePreset {
  return isEventType(value) ? EVENT_TYPE_PRESETS[value] : EVENT_TYPE_PRESETS[DEFAULT_EVENT_TYPE];
}

export function listEventTypePresets(): readonly EventTypePreset[] {
  return EVENT_TYPES.map((type) => EVENT_TYPE_PRESETS[type]);
}
