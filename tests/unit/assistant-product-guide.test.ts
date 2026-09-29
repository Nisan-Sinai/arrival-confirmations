import { describe, expect, it } from 'vitest';

import { answerProductQuestion } from '@/features/assistant/productGuide';

describe('assistant product grounding', () => {
  it('answers prices from the actual plan catalogue', () => {
    const guide = answerProductQuestion({
      locale: 'he',
      context: 'pricing',
      questions: ['כמה עולה Pro?'],
    });
    expect(guide.answer).toContain('₪349');
    expect(guide.answer).toContain('2,500');
    expect(guide.answer).toContain('חד־פעמי');
    expect(guide.links).toContainEqual({ href: '/pricing', label: 'מחירים ומסלולים' });
  });

  it('gives an invitation guest relevant RSVP guidance without a dashboard link', () => {
    const guide = answerProductQuestion({
      locale: 'en',
      context: 'invitation',
      questions: ['How do I RSVP?'],
    });
    expect(guide.answer).toContain('Open the invitation link');
    expect(guide.answer).not.toContain('₪');
    expect(guide.links).not.toContainEqual({ href: '/dashboard', label: 'View RSVPs' });
  });

  it('correctly describes manual WhatsApp delivery in Hebrew', () => {
    const guide = answerProductQuestion({
      locale: 'he',
      context: 'guests',
      questions: ['איך שולחים הזמנה אישית בוואטסאפ? זה אוטומטי לכולם?'],
    });
    expect(guide.answer).toContain('לוחצים שליחה בעצמכם');
    expect(guide.answer).toContain('לא שולח הודעות אוטומטית');
  });

  it('explains how to change an answer through a personal invitation', () => {
    const guide = answerProductQuestion({
      locale: 'he',
      context: 'invitation',
      questions: ['איך משנים תשובה?'],
    });
    expect(guide.answer).toContain('פתחו אותו שוב');
  });

  it('does not confuse a named paid plan with the free trial', () => {
    const guide = answerProductQuestion({
      locale: 'he',
      context: 'pricing',
      questions: ['האם Pro בחינם?'],
    });
    expect(guide.answer).toContain('₪349');
  });

  it('does not invent an answer to unrelated or private information requests', () => {
    const guide = answerProductQuestion({
      locale: 'he',
      context: 'site',
      questions: ['מה הטלפון של אורחת 0501234567?'],
    });
    expect(guide.answer).not.toContain('0501234567');
    expect(guide.answer).toContain('אפשר לשאול');
  });
});
