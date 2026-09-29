import { describe, expect, it } from 'vitest';

import { buildProductGuide } from '@/features/assistant/productGuide';

describe('assistant product grounding', () => {
  it('grounds price answers in the actual plan catalogue', () => {
    const guide = buildProductGuide({
      locale: 'he',
      context: 'pricing',
      questions: ['כמה עולה Pro?'],
    });
    expect(guide.instructions).toContain('Pro: 349 ILS');
    expect(guide.instructions).toContain('2500');
    expect(guide.instructions).toContain('paid once per event');
    expect(guide.links).toContainEqual({ href: '/pricing', label: 'מחירים ומסלולים' });
  });

  it('gives an invitation guest relevant RSVP guidance without plan price overhead', () => {
    const guide = buildProductGuide({
      locale: 'en',
      context: 'invitation',
      questions: ['How do I RSVP?'],
    });
    expect(guide.instructions).toContain('A guest opens the invitation link');
    expect(guide.instructions).not.toContain('Current plan catalogue');
    expect(guide.links).not.toContainEqual({ href: '/dashboard', label: 'View RSVPs' });
  });
});
