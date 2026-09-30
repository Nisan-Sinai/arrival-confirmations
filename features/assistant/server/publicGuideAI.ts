import 'server-only';

import { z } from 'zod';

import type { PublicGuideGeneration } from '@/features/assistant/productGuide';

// Both models have a Gemini API free tier. Use this site's own Free Tier key;
// linking its Google project to billing would change the account's pricing.
const MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'] as const;
const responseSchema = z.object({
  candidates: z.array(
    z.object({
      finishReason: z.string(),
      content: z.object({
        parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })),
      }),
    }),
  ),
});

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
    // One deadline covers both requests. No tools, search, paid models, stored
    // conversation or cross-provider fallback. Never retry a quota/billing error.
    const signal = AbortSignal.timeout(14000);
    let response: Response | undefined;
    let selectedModel: string = MODELS[0];
    for (const model of MODELS) {
      selectedModel = model;
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: instructions }] },
            contents: [
              { role: 'user', parts: [{ text: `Verified public facts:\n${input.facts}` }] },
            ],
            generationConfig: {
              maxOutputTokens: 2048,
              thinkingConfig: { thinkingLevel: 'LOW' },
            },
            store: false,
          }),
          cache: 'no-store',
          signal,
        },
      );
      if (response.ok) break;
      console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', response.status, model);
      if (response.status !== 404 && response.status < 500) return null;
    }
    if (!response?.ok) return null;
    const parsed = responseSchema.safeParse(await response.json());
    const candidate = parsed.success ? parsed.data.candidates[0] : undefined;
    if (candidate?.finishReason !== 'STOP') return null;
    const answer = candidate.content.parts
      .filter(({ thought }) => !thought)
      .map(({ text }) => text ?? '')
      .join('')
      .trim();
    if (
      answer.length < 30 ||
      answer.length > 2200 ||
      /https?:|www\.|<\/?[a-z]|\[[^\]]+\]\(/i.test(answer) ||
      /שלחתי|מחקתי|הוספתי|עדכנתי|I (?:sent|deleted|added|updated)/i.test(answer) ||
      (input.locale === 'he' && !/[א-ת]/.test(answer))
    )
      return null;

    // Reject invented numbers; small list indices are the only extra digits allowed.
    const knownNumbers = new Set(input.facts.match(/\d[\d,]*/g) ?? []);
    const prose = answer.replace(/^\s*[1-4][.)]\s+/gm, '');
    if ((prose.match(/\d[\d,]*/g) ?? []).some((number) => !knownNumbers.has(number))) return null;
    // Log the model only, so deployment QA can distinguish the primary from fallback.
    console.warn('ASSISTANT_PUBLIC_AI_OK', selectedModel);
    return answer;
  } catch {
    // Provider errors may contain request content or credentials. Log no payloads.
    console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', 'unavailable');
    return null;
  }
}
