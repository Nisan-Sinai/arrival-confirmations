import { z } from 'zod';

import { answerProductQuestion } from '@/features/assistant/productGuide';
import { getHostEventAnswer } from '@/features/assistant/server/assistantEventInsights';
import { phrasePublicGuide } from '@/features/assistant/server/publicGuideAI';
import { createPrivilegedClient } from '@/lib/server/supabase';
import { resolveClientIpHash } from '@/lib/server/ip';

const messageSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('user'), content: z.string().trim().min(1).max(1200) }),
  z.object({ role: z.literal('assistant'), content: z.string().trim().min(1).max(4000) }),
]);
const requestSchema = z.object({
  locale: z.enum(['he', 'en']),
  context: z.enum(['site', 'event', 'guests', 'invitation', 'pricing']),
  eventId: z.uuid().optional(),
  messages: z.array(messageSchema).min(1).max(8),
});

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Request origin is not allowed' }, { status: 403 });
  }

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 64000) return Response.json({ error: 'Request is too large' }, { status: 413 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== 'user') {
    return Response.json({ error: 'Invalid message' }, { status: 400 });
  }

  const { locale, context, eventId, messages } = parsed.data;
  const fail = (code: string, hebrew: string, english: string, status = 503) =>
    Response.json(
      { code, error: locale === 'he' ? hebrew : english },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  try {
    // A shared database limit remains effective across serverless instances and
    // protects the private event lookup from anonymous automated traffic.
    const { hash } = resolveClientIpHash(request.headers);
    const { data: limit, error: limitError } = await createPrivilegedClient().rpc(
      'consume_rate_limit',
      {
        p_bucket_key: `assistant:${hash}`,
        p_limit: 12,
        p_window_seconds: 3600,
      },
    );
    if (limitError || !limit?.[0]) {
      console.error('AI_RATE_LIMIT_UNAVAILABLE', limitError?.code ?? 'empty_result');
      return fail(
        'AI_UNAVAILABLE',
        'העוזר אינו זמין כרגע.',
        'The assistant is temporarily unavailable.',
      );
    }
    if (!limit[0].allowed) {
      return fail(
        'AI_RATE_LIMITED',
        'הגעתם למגבלת השימוש. נסו שוב בעוד שעה.',
        'Usage limit reached. Please try again in an hour.',
        429,
      );
    }

    const localAnswer = await getHostEventAnswer({
      question: messages.at(-1)!.content,
      eventId,
      locale,
    });
    if (localAnswer) {
      return Response.json(
        { ...localAnswer, source: 'event' },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const guide = answerProductQuestion({
      locale,
      context,
      questions: messages.filter(({ role }) => role === 'user').map(({ content }) => content),
    });
    const generated = guide.generation ? await phrasePublicGuide(guide.generation) : null;
    return Response.json(
      { answer: generated ?? guide.answer, links: guide.links, source: generated ? 'ai' : 'guide' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (cause) {
    if (cause instanceof Error && cause.message === 'ASSISTANT_AUTH_REQUIRED') {
      return fail(
        'AI_LOGIN_REQUIRED',
        'יש להתחבר כדי לצפות בנתוני האירוע.',
        'Sign in to view event data.',
        401,
      );
    }
    if (cause instanceof Error && cause.message === 'ASSISTANT_EVENT_NOT_FOUND') {
      return fail(
        'AI_EVENT_NOT_FOUND',
        'האירוע לא נמצא או שאין לכם גישה אליו.',
        'Event not found or unavailable.',
        404,
      );
    }
    console.error('AI_REQUEST_FAILED');
    return fail(
      'AI_REQUEST_FAILED',
      'החיבור לעוזר נכשל. נסו שוב.',
      'The connection failed. Please try again.',
    );
  }
}
