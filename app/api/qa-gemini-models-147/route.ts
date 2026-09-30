import 'server-only';

const MODELS = [
  { name: 'gemini-3.8-flash', thinkingLevel: 'LOW' },
  { name: 'gemini-3.5-flash-lite', thinkingLevel: 'MINIMAL' },
] as const;

export async function GET() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return Response.json({ keyConfigured: false, results: [] }, { status: 503 });
  }

  const results = [];
  for (const { name, thinkingLevel } of MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${name}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK.' }] }],
            generationConfig: {
              maxOutputTokens: 32,
              thinkingConfig: { thinkingLevel },
            },
            store: false,
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      results.push({
        model: name,
        ok: response.ok,
        status: response.status,
        finishReason: payload?.candidates?.[0]?.finishReason ?? null,
      });
    } catch {
      results.push({ model: name, ok: false, status: 0, finishReason: null });
    }
  }

  return Response.json(
    { keyConfigured: true, results },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
