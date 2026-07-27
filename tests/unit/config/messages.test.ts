import { describe, expect, it } from 'vitest';

import {
  renderTemplate,
  UI_MESSAGES,
  WHATSAPP_INVITE_TEMPLATE,
  WHATSAPP_REMINDER_TEMPLATE,
} from '@/config/messages';

/**
 * The WhatsApp message templates (§8.2).
 *
 * These sat in the codebase unrendered and untested from the first commit until the
 * share control was built: the product's whole premise is a link sent on WhatsApp,
 * and nothing assembled the message. `renderTemplate` is now on the path a host takes
 * every time they invite anyone.
 */
describe('renderTemplate', () => {
  it('substitutes every known token', () => {
    expect(renderTemplate('{greeting}, {name}!', { greeting: 'שלום', name: 'דנה' })).toBe(
      'שלום, דנה!',
    );
  });

  /**
   * A typo in a template should be visible in the output rather than quietly producing
   * a sentence with a hole in it — "אנו ." tells nobody which token was misspelt.
   */
  it('leaves an unknown token verbatim rather than blanking it', () => {
    expect(renderTemplate('{known} and {mystery}', { known: 'yes' })).toBe('yes and {mystery}');
  });

  it('substitutes a token that appears more than once', () => {
    expect(renderTemplate('{x}-{x}-{x}', { x: '7' })).toBe('7-7-7');
  });

  it('leaves text with no tokens untouched', () => {
    expect(renderTemplate('בלי תבניות כאן', { unused: 'value' })).toBe('בלי תבניות כאן');
  });

  /**
   * `Object.prototype.hasOwnProperty.call` rather than `tokens[key] !== undefined`.
   * With the naive check, `{toString}` or `{constructor}` would resolve against the
   * prototype and splice a function's source into a message sent to guests.
   */
  it('does not resolve a token against Object.prototype', () => {
    expect(renderTemplate('{toString}', {})).toBe('{toString}');
    expect(renderTemplate('{constructor}', {})).toBe('{constructor}');
  });

  it('fills the invitation template a host actually sends', () => {
    const message = renderTemplate(WHATSAPP_INVITE_TEMPLATE, {
      blessing: 'בשבח והודיה לה׳ יתברך',
      invitation: 'שמחים להזמינכם לחתונה של דנה ויונתן',
      inviteUrl: 'https://example.test/e/abcdefghij12',
    });

    expect(message).toContain('בשבח והודיה');
    expect(message).toContain('https://example.test/e/abcdefghij12');
    // No token may survive into a message a guest reads.
    expect(message).not.toMatch(/\{\w+\}/);
  });

  it('fills the reminder template', () => {
    const message = renderTemplate(WHATSAPP_REMINDER_TEMPLATE, {
      guestName: 'דנה',
      eventLabel: 'חתונה',
      inviteUrl: 'https://example.test/e/abcdefghij12',
    });
    expect(message).not.toMatch(/\{\w+\}/);
  });
});

describe('UI_MESSAGES', () => {
  /**
   * The 404 and error boundaries render these. They were defined and unreferenced
   * while the application shipped Next.js's built-in English error pages, so an empty
   * string here would have gone unnoticed in exactly the same way.
   */
  it('supplies non-empty copy for every error screen', () => {
    for (const value of Object.values(UI_MESSAGES.errors)) {
      expect(value.trim()).not.toBe('');
    }
  });

  it('supplies non-empty copy for every validation failure the form can show', () => {
    for (const value of Object.values(UI_MESSAGES.validation)) {
      expect(value.trim()).not.toBe('');
    }
  });
});
