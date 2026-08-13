import { he } from './dictionary/he';

/**
 * Editable message templates and user-facing Hebrew copy (§8.2, §13).
 *
 * Templates use `{placeholder}` tokens. Unknown tokens are left untouched so a typo
 * in a template is visible rather than silently producing an empty sentence.
 */

export const WHATSAPP_INVITE_TEMPLATE = `{blessing}, אנו {invitation}.

נשמח שתעדכנו אותנו לגבי הגעתכם בקישור:
{inviteUrl}

מחכים לחגוג יחד ❤`;

export const WHATSAPP_REMINDER_TEMPLATE = `שלום {guestName},
עדיין לא קיבלנו את אישור ההגעה שלכם ל{eventLabel}.

נשמח אם תעדכנו כאן:
{inviteUrl}

תודה רבה ❤`;

export type MessageTokens = Readonly<Record<string, string>>;

/**
 * Substitutes `{token}` occurrences. Tokens absent from `tokens` are preserved
 * verbatim, which surfaces template mistakes instead of hiding them.
 */
export function renderTemplate(template: string, tokens: MessageTokens): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key]! : match,
  );
}

/**
 * User-facing copy for the default locale.
 *
 * Re-exported from the Hebrew dictionary rather than duplicated: this used to be the
 * only copy in the application, and leaving a second Hebrew original here is how the
 * two would quietly drift apart. Anything that needs the reader's own language should
 * take a `Dictionary` instead — see `config/dictionary`.
 */
export const UI_MESSAGES = he;
