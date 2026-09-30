import 'server-only';

const MODELS = [
  { name: 'gemini-3.8-flash', thinkingLevel: 'LOW' },
  { name: 'gemini-3.5-flash', thinkingLevel: 'MINIMAL' },
  { name: 'gemini-3.5-flash-lite', thinkingLevel: 'MINIMAL' },
] as const;

async function checkModel(key: string, model: (typeof MODELS)[number]) {
  const attempts = [];

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply with OK.' }] }],
            generationConfig: {
              maxOutputTokens: 32,
              thinkingConfig: { thinkingLevel: model.thinkingLevel },
            },
            store: false,
          }),
        },
      );

      const payload = await response.json().catch(() => null);
      attempts.push({
        attempt,
        ok: response.ok,
        status: response.status,
        finishReason: payload?.candidates?.[0]?.finishReason ?? null,
      });
    } catch {
      attempts.push({ attempt, ok: false, status: 0, finishReason: null });
    }

    if (attempt === 1) {
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }

  return { model: model.name, attempts };
}

export async function GET() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return Response.json({ keyConfigured: false }, { status: 503 });

  const results = [];
  for (const model of MODELS) {
    results.push(await checkModel(key, model));
  }

  return Response.json({ keyConfigured: true, results }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
