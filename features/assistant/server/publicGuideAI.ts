import 'server-only';

import { createGateway, generateText } from 'ai';

import type { PublicGuideGeneration } from '@/features/assistant/productGuide';

const FREE_MODEL = 'inclusionai/ling-3.1-flash';

/**
 * The input contains curated public copy only. Do not add question text,
 * messages, event IDs, guest data or user identifiers to this interface.
 */
export async function phrasePublicGuide(input: PublicGuideGeneration): Promise<string | null> {
  // Vercel supplies project-scoped OIDC. No Gemini key or shared API key is used.
  if (!process.env.VERCEL && !process.env.VERCEL_OIDC_TOKEN) return null;
  try {
    // Fail closed if the free model is removed or its advertised price changes.
    // There are no paid model fallbacks, tools, search or billable routing extras.
    const response = await fetch('https://ai-gateway.vercel.sh/v1/models', {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const catalogue: {
      data?: { id?: string; pricing?: { input?: string; output?: string } }[];
    } = await response.json();
    const model = catalogue.data?.find(({ id }) => id === FREE_MODEL);
    if (model?.pricing?.input !== '0' || model.pricing.output !== '0') return null;

    // An explicit empty API key selects OIDC instead of an unrelated team key.
    const gateway = createGateway({ apiKey: '' });
    const result = await generateText({
      model: gateway(FREE_MODEL),
      instructions:
        'You write help for an RSVP website. Use only the supplied public facts. ' +
        'Preserve limitations and plan requirements. Never invent features, facts or links. ' +
        'Do not claim to read guest data, send invitations, change records or perform actions. ' +
        'Do not add a greeting, disclaimer, question, markdown heading or website URL. ' +
        (input.locale === 'he' ? 'Write natural Hebrew. ' : 'Write natural English. ') +
        (input.format === 'steps'
          ? 'Give up to four short numbered steps and any essential limitation.'
          : 'Give a concise answer in up to four short sentences.'),
      prompt: `Verified public facts:\n${input.facts}`,
      maxOutputTokens: 650,
      temperature: 0.2,
      maxRetries: 0,
      timeout: 12000,
      providerOptions: { gateway: { only: ['novita'] } },
    });
    const answer = result.text.trim();
    if (
      result.finishReason === 'length' ||
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
    return answer;
  } catch (error) {
    // Provider errors may contain request content or credentials. Log no payloads.
    const status =
      error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : 0;
    const message = error instanceof Error ? error.message : '';
    const reason = /customer.?verification|credit card|payment method|card on file/i.test(message)
      ? 'customer_verification_required'
      : /free.?tier/i.test(message)
        ? 'free_tier_model_restricted'
        : /credit|billing|purchase|payment/i.test(message)
          ? 'credit_access'
          : /oidc|auth|permission|access|verif/i.test(message)
            ? 'identity_access'
            : /provider|model/i.test(message)
              ? 'model_access'
              : 'unavailable';
    console.warn('ASSISTANT_PUBLIC_AI_FALLBACK', typeof status === 'number' ? status : 0, reason);
    return null;
  }
}
