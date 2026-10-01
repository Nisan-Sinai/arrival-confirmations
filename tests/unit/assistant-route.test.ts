import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, getHostEventAnswer, phrasePublicGuide } = vi.hoisted(() => ({
  rpc: vi.fn(),
  getHostEventAnswer: vi.fn(),
  phrasePublicGuide: vi.fn(),
}));
vi.mock('@/lib/server/supabase', () => ({ createPrivilegedClient: () => ({ rpc }) }));
vi.mock('@/lib/server/ip', () => ({ resolveClientIpHash: () => ({ hash: 'test-hash' }) }));
vi.mock('@/features/assistant/server/assistantEventInsights', () => ({ getHostEventAnswer }));
vi.mock('@/features/assistant/server/publicGuideAI', () => ({ phrasePublicGuide }));

import { POST } from '@/app/api/assistant/route';

function request(messages = [{ role: 'user', content: 'איך יוצרים אירוע?' }], eventId?: string) {
  return new Request('https://preview.example/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://preview.example' },
    body: JSON.stringify({ locale: 'he', context: eventId ? 'event' : 'site', eventId, messages }),
  });
}

describe('private, on-site assistant', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rpc.mockReset().mockResolvedValue({ data: [{ allowed: true }], error: null });
    getHostEventAnswer.mockReset().mockResolvedValue(null);
    phrasePublicGuide.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('answers product questions with verified links without any provider call', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      source: 'guide',
      links: [{ href: '/dashboard/events/new', label: 'יצירת אירוע' }],
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('identifies a successful real model reply and exposes only trusted site links', async () => {
    phrasePublicGuide.mockResolvedValueOnce('פתחו את הדשבורד ובחרו ביצירת אירוע חדש.');
    const response = await POST(
      request([{ role: 'user', content: 'איך יוצרים אירוע? דנה 0501234567' }]),
    );
    expect(await response.json()).toMatchObject({
      source: 'ai',
      answer: 'פתחו את הדשבורד ובחרו ביצירת אירוע חדש.',
    });
    expect(JSON.stringify(phrasePublicGuide.mock.calls)).not.toContain('0501234567');
    expect(JSON.stringify(phrasePublicGuide.mock.calls)).not.toContain('דנה');
  });

  it('keeps manually entered personal details away from any external service', async () => {
    const response = await POST(request([{ role: 'user', content: 'הטלפון של אורחת 0501234567' }]));
    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).not.toContain('0501234567');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles an unknown question honestly without claiming model reasoning', async () => {
    const response = await POST(request([{ role: 'user', content: 'מה מזג האוויר?' }]));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: 'guide' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('contains database failures instead of returning an unhandled server error', async () => {
    rpc.mockRejectedValue(new Error('database unavailable'));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'AI_REQUEST_FAILED' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('limits anonymous traffic even though no provider quota is consumed', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    expect((await POST(request())).status).toBe(503);
    rpc.mockResolvedValueOnce({ data: [{ allowed: false }], error: null });
    expect((await POST(request())).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('answers an authorized host lookup entirely on the site', async () => {
    const eventId = '00000000-0000-4000-8000-000000000001';
    getHostEventAnswer.mockResolvedValueOnce({
      answer: 'באירוע יש 3 תשובות.',
      links: [{ href: `/dashboard/events/${eventId}`, label: 'פתיחת האירוע' }],
    });
    const response = await POST(
      request([{ role: 'user', content: 'כמה תשובות יש באירוע?' }], eventId),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: 'event', answer: 'באירוע יש 3 תשובות.' });
    expect(fetch).not.toHaveBeenCalled();
    expect(phrasePublicGuide).not.toHaveBeenCalled();
  });

  it('does not answer a foreign event question from the public guide', async () => {
    getHostEventAnswer.mockRejectedValueOnce(new Error('ASSISTANT_EVENT_NOT_FOUND'));
    const response = await POST(
      request([{ role: 'user', content: 'מי טרם ענה?' }], '00000000-0000-4000-8000-000000000001'),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'AI_EVENT_NOT_FOUND' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never runs a host data lookup for an invitation guest', async () => {
    const response = await POST(
      new Request('https://preview.example/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://preview.example' },
        body: JSON.stringify({
          locale: 'he',
          context: 'invitation',
          messages: [{ role: 'user', content: 'כמה אנשים מגיעים?' }],
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(getHostEventAnswer).not.toHaveBeenCalled();
    expect(JSON.stringify(await response.json())).not.toContain('פתחו את האירוע שלכם');
  });

  describe('limits and privacy-safe counting', () => {
    const allowed = { data: [{ allowed: true }], error: null };
    const statsCalls = () =>
      rpc.mock.calls.filter(([name]) => name === 'record_assistant_question');

    it('allows 60 questions an hour before blocking anyone', async () => {
      await POST(request());
      expect(rpc).toHaveBeenCalledWith('consume_rate_limit', {
        p_bucket_key: 'assistant:test-hash',
        p_limit: 60,
        p_window_seconds: 3600,
      });
    });

    it('answers from the guide instead of blocking when only the AI quota is spent', async () => {
      rpc.mockImplementation(async (name: string, args: { p_bucket_key?: string }) =>
        name === 'consume_rate_limit' && args.p_bucket_key?.startsWith('assistant-ai:')
          ? { data: [{ allowed: false }], error: null }
          : allowed,
      );
      const response = await POST(request());
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ source: 'guide' });
      expect(phrasePublicGuide).not.toHaveBeenCalled();
      expect(rpc).toHaveBeenCalledWith('consume_rate_limit', {
        p_bucket_key: 'assistant-ai:test-hash',
        p_limit: 12,
        p_window_seconds: 3600,
      });
    });

    it('does not spend AI quota on answers that are never rephrased', async () => {
      await POST(request([{ role: 'user', content: 'כמה זה עולה?' }]));
      expect(
        rpc.mock.calls.some(
          ([name, args]) =>
            name === 'consume_rate_limit' &&
            String((args as { p_bucket_key: string }).p_bucket_key).startsWith('assistant-ai:'),
        ),
      ).toBe(false);
    });

    it('counts the outcome and topic, never the question text', async () => {
      phrasePublicGuide.mockResolvedValueOnce('1. פתחו את הדשבורד וצרו אירוע חדש.');
      await POST(request([{ role: 'user', content: 'איך יוצרים אירוע? דנה 0501234567' }]));
      expect(statsCalls()).toEqual([
        ['record_assistant_question', { p_context: 'site', p_outcome: 'ai', p_topic: 'setup' }],
      ]);
      expect(JSON.stringify(statsCalls())).not.toMatch(/דנה|0501234567/);
    });

    it('counts a question nothing matched as unmatched', async () => {
      await POST(request([{ role: 'user', content: 'מה מזג האוויר?' }]));
      expect(statsCalls()).toEqual([
        ['record_assistant_question', { p_context: 'site', p_outcome: 'unmatched', p_topic: null }],
      ]);
    });

    it('counts a private event answer without any event or guest detail', async () => {
      const eventId = '00000000-0000-4000-8000-000000000001';
      getHostEventAnswer.mockResolvedValueOnce({ answer: 'באירוע יש 3 תשובות.', links: [] });
      await POST(request([{ role: 'user', content: 'כמה תשובות יש?' }], eventId));
      expect(statsCalls()).toEqual([
        [
          'record_assistant_question',
          { p_context: 'event', p_outcome: 'event', p_topic: 'event_data' },
        ],
      ]);
    });

    it('still answers when the counter cannot be written', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      rpc.mockImplementation(async (name: string) =>
        name === 'record_assistant_question' ? Promise.reject(new Error('db down')) : allowed,
      );
      const response = await POST(request());
      expect(response.status).toBe(200);
      expect(console.warn).toHaveBeenCalledWith('ASSISTANT_STATS_UNAVAILABLE');
    });
  });
});
