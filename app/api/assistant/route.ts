import { z } from 'zod';

import { buildProductGuide } from '@/features/assistant/productGuide';
import { getHostEventAnswer } from '@/features/assistant/server/assistantEventInsights';
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

const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'] as const;

function plainTextAnswer(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .trim();
}

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
    // A shared database limit remains effective across serverless instances and protects
    // the free Gemini quota from anonymous automated traffic.
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

    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      console.error('AI_NOT_CONFIGURED: GEMINI_API_KEY is missing');
      return fail(
        'AI_NOT_CONFIGURED',
        'עוזר ה־AI עדיין לא הופעל באתר. יש לפנות לתמיכה.',
        'The AI assistant has not been activated yet. Please contact support.',
      );
    }
    const guide = buildProductGuide({
      locale,
      context,
      questions: messages.filter(({ role }) => role === 'user').map(({ content }) => content),
    });

    const options: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: guide.instructions,
            },
          ],
        },
        contents: messages.map(({ role, content }) => ({
          role: role === 'assistant' ? 'model' : 'user',
          parts: [{ text: content }],
        })),
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    };
    let response: Response | undefined;
    for (const [index, model] of models.entries()) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        options,
      );
      if (response.ok) break;
      console.warn('Gemini model failed', model, response.status);
      const canTryAnotherModel =
        response.status === 404 ||
        response.status === 408 ||
        response.status === 429 ||
        response.status >= 500;
      if (!canTryAnotherModel || index === models.length - 1) break;
      if (response.status !== 404) {
        // A short backoff reduces load during temporary provider failures.
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** index));
      }
    }
    if (!response?.ok) {
      console.error('Gemini assistant failed', response?.status ?? 'no_response');
      return fail(
        'AI_PROVIDER_UNAVAILABLE',
        'העוזר אינו זמין כרגע. נסו שוב מאוחר יותר.',
        'The assistant is temporarily unavailable. Please try again later.',
      );
    }
    const payload: unknown = await response.json();
    const result = z
      .object({
        candidates: z
          .array(
            z.object({ content: z.object({ parts: z.array(z.object({ text: z.string() })) }) }),
          )
          .min(1),
      })
      .safeParse(payload);
    const answer = result.success
      ? plainTextAnswer(
          result.data.candidates[0]?.content.parts.map((part) => part.text).join('') ?? '',
        )
      : '';
    if (!answer)
      return fail(
        'AI_EMPTY_RESPONSE',
        'לא התקבלה תשובה. נסו שוב.',
        'No answer received. Please try again.',
      );
    return Response.json(
      { answer: answer.slice(0, 4000), links: guide.links, source: 'model' },
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
