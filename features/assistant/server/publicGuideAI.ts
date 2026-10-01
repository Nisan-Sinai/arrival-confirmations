import 'server-only';

import { z } from 'zod';

import type { PublicGuideGeneration } from '@/features/assistant/productGuide';

// Flash-Lite first: the job is rephrasing a few verified sentences, which it does well,
// and in production it was the only tier answering — 3.8 Flash returned 503 and 3.5 Flash
// hit its 5s deadline on every request, so each answer waited ~8s before Lite replied.
// The stronger tiers stay as fallbacks. Each model gets the thinking level it supports.
const MODELS = [
  { name: 'gemini-3.5-flash-lite', timeoutMs: 4000, thinkingLevel: 'MINIMAL' },
  { name: 'gemini-3.5-flash', timeoutMs: 3000, thinkingLevel: 'MINIMAL' },
  { name: 'gemini-3.8-flash', timeoutMs: 2500, thinkingLevel: 'LOW' },
] as const;
// Rephrasing is optional — the curated guide answer is already correct — so the whole
// chain gets one budget. Past it the visitor gets the guide answer instead of a spinner.
const TOTAL_BUDGET_MS = 6000;
const MIN_ATTEMPT_MS = 1000;
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
    // Give every tier its own deadline so a slow primary cannot consume the
    // whole client budget. No tools, search, paid models or cross-provider fallback.
    const facts = `Verified public facts:\n${input.facts}`;
    const startedAt = Date.now();
    for (const { name: model, timeoutMs, thinkingLevel } of MODELS) {
      const remaining = TOTAL_BUDGET_MS - (Date.now() - startedAt);
      if (remaining < MIN_ATTEMPT_MS) {
        console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', 'budget_exhausted', model);
        break;
      }
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: instructions }] },
        contents: [{ role: 'user', parts: [{ text: facts }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingLevel },
        },
        store: false,
      });
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body,
            cache: 'no-store',
            signal: AbortSignal.timeout(Math.min(timeoutMs, remaining)),
          },
        );
        if (!response.ok) {
          console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', response.status, model);
          // Authentication, billing and malformed-request failures need operator attention.
          // Model availability/quota failures may still succeed on the next tier.
          if (![404, 429].includes(response.status) && response.status < 500) return null;
          continue;
        }
        const answer = extractAnswer(await response.json());
        if (!answer || !isGroundedAnswer(answer, input)) {
          console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', 'invalid_output', model);
          continue;
        }
        // Log the model only, so deployment QA can distinguish the primary from fallbacks.
        console.warn('ASSISTANT_PUBLIC_AI_OK', model);
        return answer;
      } catch {
        // Do not log provider errors: they may contain request content or credentials.
        console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', 'unavailable', model);
      }
    }
    return null;
  } catch {
    // Provider errors may contain request content or credentials. Log no payloads.
    console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', 'unavailable');
    return null;
  }
}
