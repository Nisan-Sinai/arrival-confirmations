import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, getHostEventAnswer } = vi.hoisted(() => ({
  rpc: vi.fn(),
  getHostEventAnswer: vi.fn(),
}));
vi.mock('@/lib/server/supabase', () => ({ createPrivilegedClient: () => ({ rpc }) }));
vi.mock('@/lib/server/ip', () => ({ resolveClientIpHash: () => ({ hash: 'test-hash' }) }));
vi.mock('@/features/assistant/server/assistantEventInsights', () => ({ getHostEventAnswer }));

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
});
