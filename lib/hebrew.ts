/**
 * Hebrew inflection for the one construction this product cannot avoid: a preposition
 * glued to an event's name.
 *
 * Every guest-facing message does it — "נשמח להזמין אותך ל" + the title, "תודה שהייתם
 * איתנו ב" + the title. Written as plain concatenation it produces "להחתונה" and
 * "בהברית", because ל, ב and כ merge with a following definite ה rather than sitting in
 * front of it. A native speaker reads that as a typo, and these messages go to every
 * guest on the list.
 *
 * It is not hypothetical: the live database holds an event called "הברית של יונתן",
 * which today produces "להברית של יונתן" in the invitation.
 */

/** The prepositions that absorb a following definite article. */
const ABSORBING = new Set(['ל', 'ב', 'כ']);

/**
 * Joins a one-letter preposition to a phrase, absorbing the definite article.
 *
 *   prefixHebrew('ל', 'החתונה')   → 'לחתונה'
 *   prefixHebrew('ל', 'חתונת דנה') → 'לחתונת דנה'
 *   prefixHebrew('ב', 'הברית')     → 'בברית'
 *
 * **The known limit.** This assumes a leading ה is the definite article, and it cannot
 * tell that from a name that simply begins with one — a title of exactly "הילה" would
 * come back "לילה". That is accepted rather than solved, because event titles in this
 * product are phrases and not bare names ("החתונה של הילה", "ברית המילה — משפחת סיני"),
 * and the alternative is being wrong on every genuinely definite title instead of on a
 * vanishing rare one. Distinguishing the two needs a dictionary, which is a large amount
 * of machinery for a single letter.
 */
export function prefixHebrew(preposition: string, phrase: string): string {
  const trimmed = phrase.trim();
  if (trimmed === '') return preposition;
  if (!ABSORBING.has(preposition)) return `${preposition}${trimmed}`;

  // Only when a letter follows the ה. A title of just "ה" is not a definite article,
  // and dropping it would leave the preposition attached to nothing.
  if (trimmed.startsWith('ה') && trimmed.length > 1) {
    return `${preposition}${trimmed.slice(1)}`;
  }

  return `${preposition}${trimmed}`;
}
