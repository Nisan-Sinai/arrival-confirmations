import 'server-only';

import { z } from 'zod';

import type { PublicGuideGeneration } from '@/features/assistant/productGuide';

// Both models have a Gemini API free tier. Use this site's own Free Tier key;
// linking its Google project to billing would change the account's pricing.
const MODELS = [
  { name: 'gemini-3.5-flash', timeoutsMs: [9000, 6000] },
  { name: 'gemini-3.5-flash-lite', timeoutsMs: [7000] },
] as const;
const DEFAULT_RETRY_DELAY_MS = 600;
const MAX_RETRY_DELAY_MS = 1500;
const generateContentResponseSchema = z.object({
  candidates: z.array(
    z.object({
      finishReason: z.string(),
      content: z.object({
        parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })),
      }),
    }),
  ),
});
function extractAnswer(payload: unknown): string | null {
  const parsed = generateContentResponseSchema.safeParse(payload);
  const candidate = parsed.success ? parsed.data.candidates[0] : undefined;
  if (candidate?.finishReason !== 'STOP') return null;
  return candidate.content.parts
    .filter(({ thought }) => !thought)
    .map(({ text }) => text ?? '')
    .join('')
    .trim();
}

function isGroundedAnswer(answer: string, input: PublicGuideGeneration): boolean {
  if (
    answer.length < 30 ||
    answer.length > 2200 ||
    /https?:|www\.|<\/?[a-z]|\[[^\]]+\]\(/i.test(answer) ||
    /שלחתי|מחקתי|הוספתי|עדכנתי|I (?:sent|deleted|added|updated)/i.test(answer) ||
    (input.locale === 'he' && !/[א-ת]/.test(answer))
  )
    return false;

  // Reject invented numbers; small list indices are the only extra digits allowed.
  const knownNumbers = new Set(input.facts.match(/\d[\d,]*/g) ?? []);
  const prose = answer.replace(/^\s*[1-4][.)]\s+/gm, '');
  return !(prose.match(/\d[\d,]*/g) ?? []).some((number) => !knownNumbers.has(number));
}

async function waitForRetry(response: Response): Promise<void> {
  const retryAfter = response.headers.get('retry-after');
  const retryDelay = retryAfter?.match(/^\d+$/)
    ? Math.min(Number(retryAfter) * 1000, MAX_RETRY_DELAY_MS)
    : DEFAULT_RETRY_DELAY_MS;
  if (retryDelay > 0) await new Promise((resolve) => setTimeout(resolve, retryDelay));
}

/**
 * The input contains curated public copy only. Do not add question text,
 * messages, event IDs, guest data or user identifiers to this interface.
 */
export async function phrasePublicGuide(input: PublicGuideGeneration): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  try {
    const instructions =
      'You write help for an RSVP website. Use only the supplied public facts. ' +
      'Preserve limitations and plan requirements. Never invent features, facts or links. ' +
      'Do not claim to read guest data, send invitations, change records or perform actions. ' +
      'Do not add a greeting, disclaimer, question, markdown heading or website URL. ' +
      (input.locale === 'he' ? 'Write natural Hebrew. ' : 'Write natural English. ') +
      (input.format === 'steps'
        ? 'Give up to four short numbered steps and any essential limitation.'
        : 'Give a concise answer in up to four short sentences.');
    // Give the fallback its own deadline so a slow primary cannot consume the
    // whole client budget. No tools, search, paid models or cross-provider fallback.
    // Never retry a quota/billing/authentication error.
    const facts = `Verified public facts:\n${input.facts}`;
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: instructions }] },
      contents: [{ role: 'user', parts: [{ text: facts }] }],
      generationConfig: {
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
      },
      store: false,
    });
    for (const { name: model, timeoutsMs } of MODELS) {
      for (const [attemptIndex, timeoutMs] of timeoutsMs.entries()) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
              body,
              cache: 'no-store',
              signal: AbortSignal.timeout(timeoutMs),
            },
          );
          if (!response.ok) {
            if (response.status === 503 && attemptIndex + 1 < timeoutsMs.length) {
              console.warn('ASSISTANT_PUBLIC_AI_RETRY', response.status, model);
              await waitForRetry(response);
              continue;
            }
            console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', response.status, model);
            if (response.status !== 404 && response.status < 500) return null;
            break;
          }
          const answer = extractAnswer(await response.json());
          if (!answer || !isGroundedAnswer(answer, input)) {
            console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', 'invalid_output', model);
            break;
          }
          // Log the model only, so deployment QA can distinguish the primary from fallback.
          console.warn('ASSISTANT_PUBLIC_AI_OK', model);
          return answer;
        } catch {
          // Do not log provider errors: they may contain request content or credentials.
          console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', 'unavailable', model);
          break;
        }
      }
    }
    return null;
  } catch {
    // Provider errors may contain request content or credentials. Log no payloads.
    console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', 'unavailable');
    return null;
  }
}
