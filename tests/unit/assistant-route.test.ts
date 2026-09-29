import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, getHostEventAnswer } = vi.hoisted(() => ({
  rpc: vi.fn(),
  getHostEventAnswer: vi.fn(),
}));
vi.mock('@/lib/server/supabase', () => ({ createPrivilegedClient: () => ({ rpc }) }));
vi.mock('@/lib/server/ip', () => ({ resolveClientIpHash: () => ({ hash: 'test-hash' }) }));
vi.mock('@/features/assistant/server/assistantEventInsights', () => ({ getHostEventAnswer }));

import { POST } from '@/app/api/assistant/route';

function request(messages = [{ role: 'user', content: 'איך יוצרים אירוע?' }]) {
  return new Request('https://preview.example/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://preview.example' },
    body: JSON.stringify({ locale: 'he', context: 'site', messages }),
  });
}

describe('RSVP AI service failures and conversation continuity', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn());
    vi.spyOn(console, 'error').mockImplementation(() => {});
    rpc.mockReset().mockResolvedValue({ data: [{ allowed: true }], error: null });
    getHostEventAnswer.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('identifies missing model configuration without calling the model', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'AI_NOT_CONFIGURED' });
    expect(rpc).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('contains database failures instead of returning an unhandled server error', async () => {
    rpc.mockRejectedValue(new Error('database unavailable'));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'AI_REQUEST_FAILED' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not consume provider quota when the limiter is unavailable or refuses a request', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    expect((await POST(request())).status).toBe(503);
    rpc.mockResolvedValueOnce({ data: [{ allowed: false }], error: null });
    expect((await POST(request())).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a follow-up after a long assistant answer', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        candidates: [{ content: { parts: [{ text: 'צרו אירוע דרך ההרשמה באתר.' }] } }],
      }),
    );
    const response = await POST(
      request([
        { role: 'user', content: 'איך יוצרים אירוע?' },
        { role: 'assistant', content: 'א'.repeat(1800) },
        { role: 'user', content: 'ואיך משתפים?' },
      ]),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      answer: 'צרו אירוע דרך ההרשמה באתר.',
      source: 'model',
    });
  });

  it('displays provider Markdown as readable plain text', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '### הזמנה אישית\nהיכנסו ל**[מוזמנים וכלים](/dashboard)** ושלחו ב־`WhatsApp`.',
                },
              ],
            },
          },
        ],
      }),
    );
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      answer: 'הזמנה אישית\nהיכנסו למוזמנים וכלים ושלחו ב־WhatsApp.',
    });
  });

  it('recovers from a transient provider failure using a different free model', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({
          candidates: [{ content: { parts: [{ text: 'פתחו את האירוע ואז מוזמנים וכלים.' }] } }],
        }),
      );
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ answer: 'פתחו את האירוע ואז מוזמנים וכלים.' });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).toEqual([
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
    ]);
  });

  it('uses the third model if both newer models are unavailable', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(
        Response.json({ candidates: [{ content: { parts: [{ text: 'תשובה אמיתית.' }] } }] }),
      );
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ answer: 'תשובה אמיתית.' });
    expect(vi.mocked(fetch).mock.calls[2]?.[0]).toContain('gemini-3.1-flash-lite');
  });

  it('never substitutes a fabricated answer for an upstream error', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('private upstream error', { status: 403 }));
    const response = await POST(request());
    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload.code).toBe('AI_PROVIDER_UNAVAILABLE');
    expect(payload.answer).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain('private upstream error');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps an authorized host lookup entirely away from Gemini', async () => {
    getHostEventAnswer.mockResolvedValueOnce({
      answer: 'באירוע יש 3 תשובות.',
      links: [
        { href: '/dashboard/events/00000000-0000-4000-8000-000000000001', label: 'פתיחת האירוע' },
      ],
    });
    const response = await POST(
      new Request('https://preview.example/api/assistant', {
        method: 'POST',
        headers: { Origin: 'https://preview.example' },
        body: JSON.stringify({
          locale: 'he',
          context: 'event',
          eventId: '00000000-0000-4000-8000-000000000001',
          messages: [{ role: 'user', content: 'כמה תשובות יש באירוע?' }],
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ source: 'event', answer: 'באירוע יש 3 תשובות.' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not fall through to Gemini when an event lookup is unauthorized', async () => {
    getHostEventAnswer.mockRejectedValueOnce(new Error('ASSISTANT_EVENT_NOT_FOUND'));
    const response = await POST(request([{ role: 'user', content: 'מי טרם ענה?' }]));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'AI_EVENT_NOT_FOUND' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
