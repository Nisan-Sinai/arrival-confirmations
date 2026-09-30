import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, eventRead, guestRead, replyRead } = vi.hoisted(() => ({
  getUser: vi.fn(),
  eventRead: vi.fn(),
  guestRead: vi.fn(),
  replyRead: vi.fn(),
}));

vi.mock('@/lib/server/supabase', () => ({
  createUserClient: async () => ({
    auth: { getUser },
    from: (table: string) => {
      if (table === 'events') return { select: () => ({ eq: () => ({ maybeSingle: eventRead }) }) };
      const range = table === 'guests' ? guestRead : replyRead;
      const query = { eq: () => query, is: () => query, order: () => query, range };
      return { select: () => query };
    },
  }),
}));

import { getHostEventAnswer } from '@/features/assistant/server/assistantEventInsights';

const eventId = '00000000-0000-4000-8000-000000000001';
const ask = (question: string) => getHostEventAnswer({ question, eventId, locale: 'he' });

describe('private host answers', () => {
  beforeEach(() => {
    getUser.mockReset().mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
    eventRead.mockReset().mockResolvedValue({ data: { id: eventId }, error: null });
    guestRead.mockReset().mockResolvedValue({
      data: [
        { id: 'one', full_name: 'אורחת א' },
        { id: 'two', full_name: 'אורח ב' },
      ],
      error: null,
    });
    replyRead.mockReset().mockResolvedValue({
      data: [
        {
          guest_id: 'one',
          full_name: 'אורחת א',
          attendance_status: 'attending',
          adults_count: 2,
          children_count: 1,
          babies_count: 0,
        },
      ],
      error: null,
    });
  });

  it('shows only the signed-in host their own unanswered personal invites', async () => {
    const result = await ask('מי טרם ענה?');
    expect(result?.answer).toContain('אורח ב');
    expect(result?.answer).not.toContain('אורחת א');
    expect(result?.answer).toContain('הזמנות האישיות');
    expect(result?.links[0]?.href).toBe(`/dashboard/events/${eventId}/guests`);
    expect(eventRead).toHaveBeenCalledOnce();
  });

  it('returns accurate RSVP counts without sending guest data to a model', async () => {
    const result = await ask('כמה תשובות יש באירוע?');
    expect(result?.answer).toContain('1 תשובות');
    expect(result?.answer).toContain('3 אנשים');
  });

  it.each([
    ['כמה אנשים יגיעו?', '3 אנשים'],
    ['כמה מגיעים?', '3 אנשים'],
    ['כמה מבוגרים מגיעים?', '2 מבוגרים'],
    ['כמה ילדים מגיעים?', '1 ילדים'],
    ['כמה תינוקות מגיעים?', '0 תינוקות'],
    ['כמה אישרו?', 'מגיעים: 1.'],
    ['כמה מוזמנים יש?', 'מוזמנים: 2.'],
    ['מה מצב האירוע?', '1 תשובות'],
    ['מי עדיין לא אישר?', 'אורח ב'],
    ['Who has not replied?', 'אורח ב'],
    ['How many people are coming?', '3 אנשים'],
  ])('distinguishes replies, people and unanswered invites: %s', async (question, expected) => {
    expect((await ask(question))?.answer).toContain(expected);
  });

  it.each([
    'אני לא מגיע, איך משנים תשובה?',
    'איך מאשרים הגעה?',
    'How can I change my RSVP to not attending?',
  ])('does not send a guest how-to question through host authorization: %s', async (question) => {
    expect(await ask(question)).toBeNull();
    expect(getUser).not.toHaveBeenCalled();
  });

  it('does not disclose names in a request for an aggregate count', async () => {
    expect((await ask('כמה אישרו?'))?.answer).not.toContain('אורחת א');
  });

  it('counts declined people separately instead of using the attending population', async () => {
    const result = await ask('כמה אנשים לא מגיעים?');
    expect(result?.answer).toContain('לא מגיעים');
    expect(result?.answer).toContain('0 אנשים');
    expect(result?.answer).not.toContain('3 אנשים');
  });

  it('rejects a caller without an authenticated Supabase user', async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(ask('מי טרם ענה?')).rejects.toThrow('ASSISTANT_AUTH_REQUIRED');
    expect(eventRead).not.toHaveBeenCalled();
    expect(guestRead).not.toHaveBeenCalled();
  });

  it('rejects a foreign event before querying any guest or RSVP rows', async () => {
    eventRead.mockResolvedValueOnce({ data: null, error: null });
    await expect(ask('מי טרם ענה?')).rejects.toThrow('ASSISTANT_EVENT_NOT_FOUND');
    expect(guestRead).not.toHaveBeenCalled();
    expect(replyRead).not.toHaveBeenCalled();
  });
});
