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
// Every question counts against a generous limit that protects the private event
// lookup from automated traffic. Only Gemini calls count against the tighter quota, and
// running out of it never blocks a visitor: they get the exact guide answer instead.
const ASSISTANT_LIMIT_PER_HOUR = 60;
const AI_PHRASING_LIMIT_PER_HOUR = 12;

type Outcome = 'event' | 'ai' | 'guide' | 'unmatched' | 'greeting';
type PrivilegedClient = ReturnType<typeof createPrivilegedClient>;

/** Adds one to today's aggregate counter. Never blocks or fails the answer. */
async function recordQuestion(
  db: PrivilegedClient,
  context: string,
  outcome: Outcome,
  topic: string | null,
): Promise<void> {
  try {
    const { error } = await db.rpc('record_assistant_question', {
      p_context: context,
      p_outcome: outcome,
      p_topic: topic,
    });
    if (error) console.warn('ASSISTANT_STATS_UNAVAILABLE', error.code);
  } catch {
    console.warn('ASSISTANT_STATS_UNAVAILABLE');
  }
}

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
    const db = createPrivilegedClient();
    const { data: limit, error: limitError } = await db.rpc('consume_rate_limit', {
      p_bucket_key: `assistant:${hash}`,
      p_limit: ASSISTANT_LIMIT_PER_HOUR,
      p_window_seconds: 3600,
    });
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

    // An invitation guest is never the host: a data question there gets the guide's
    // invitation answer, not "open your event in the dashboard".
    const localAnswer =
      context === 'invitation'
        ? null
        : await getHostEventAnswer({
            question: messages.at(-1)!.content,
            eventId,
            locale,
          });
    if (localAnswer) {
      await recordQuestion(db, context, 'event', 'event_data');
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
    let generated: string | null = null;
    if (guide.generation) {
      const { data: aiLimit, error: aiLimitError } = await db.rpc('consume_rate_limit', {
        p_bucket_key: `assistant-ai:${hash}`,
        p_limit: AI_PHRASING_LIMIT_PER_HOUR,
        p_window_seconds: 3600,
      });
      if (!aiLimitError && aiLimit?.[0]?.allowed) {
        generated = await phrasePublicGuide(guide.generation);
      }
    }
    const outcome: Outcome = generated
      ? 'ai'
      : guide.topic === null
        ? 'unmatched'
        : guide.topic === 'greeting'
          ? 'greeting'
          : 'guide';
    await recordQuestion(db, context, outcome, guide.topic);
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
