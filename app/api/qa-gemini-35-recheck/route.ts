import 'server-only';

export async function GET() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return Response.json({ keyConfigured: false }, { status: 503 });

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Reply with OK.' }] }],
          generationConfig: {
            maxOutputTokens: 32,
            thinkingConfig: { thinkingLevel: 'MINIMAL' },
          },
          store: false,
        }),
      },
    );
    const payload = await response.json().catch(() => null);
    return Response.json({
      model: 'gemini-3.5-flash',
      ok: response.ok,
      status: response.status,
      finishReason: payload?.candidates?.[0]?.finishReason ?? null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({
      model: 'gemini-3.5-flash',
      ok: false,
      status: 0,
      finishReason: null,
    }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
