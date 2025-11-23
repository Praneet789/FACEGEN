import type { IncomingMessage, ServerResponse } from 'http';

const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const MODEL_NAME = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
const REGION = process.env.GEMINI_REGION?.trim();
const API_BASE = REGION ? `https://${REGION}-generativelanguage.googleapis.com` : 'https://generativelanguage.googleapis.com';
const MAX_RETRIES = Number(process.env.GEMINI_RETRY_ATTEMPTS ?? 3);
const RETRY_WAIT_MS = Number(process.env.GEMINI_RETRY_DELAY_MS ?? 8000);
const DEFAULT_PROMPT = [
  'Convert this black and white image into a realistic color photograph.',
  'Preserve identity perfectly. Restore natural skin tone, hair color, and eye color.',
  'Do not change pose or facial structure. Make it look like a natural real photo.'
].join(' ');

interface GeminiInlineData {
  mimeType?: string;
  data?: string;
}

interface GeminiContentPart {
  inlineData?: GeminiInlineData;
}

interface GeminiCandidate {
  content?: {
    parts?: GeminiContentPart[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string; safetyRatings?: unknown };
  error?: { message?: string; status?: string };
}

function parseDataUri(dataUri: string): { mimeType: string; base64: string } {
  const match = dataUri.match(/^data:(.+);base64,(.*)$/);
  if (!match || match.length < 3) {
    throw new Error('Invalid image data URI');
  }
  const mimeType = match[1] || 'image/png';
  const base64 = match[2];
  return { mimeType, base64 };
}

function buildPrompt(basePrompt?: string, suppliedPrompt?: string): string {
  if (suppliedPrompt && suppliedPrompt.trim().length) {
    return suppliedPrompt.trim();
  }
  if (basePrompt && basePrompt.trim().length) {
    return basePrompt.trim();
  }
  return DEFAULT_PROMPT;
}

function extractGeneratedImage(payload: GeminiResponse): GeminiInlineData | null {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate?.content?.parts : [];
    for (const part of parts) {
      if (part?.inlineData?.data) {
        return part.inlineData;
      }
    }
  }
  return null;
}

export async function handleGeminiEnhance(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  try {
    const buffers: Buffer[] = [];
    for await (const chunk of req) buffers.push(chunk as Buffer);
    const raw = Buffer.concat(buffers).toString('utf-8');
    const body = raw ? JSON.parse(raw) : {};
    const { imageDataUri, prompt } = body;

    if (!imageDataUri || typeof imageDataUri !== 'string') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'imageDataUri required' }));
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing GEMINI_API_KEY on server' }));
      return;
    }

    const { mimeType, base64 } = parseDataUri(imageDataUri);
    const finalPrompt = buildPrompt(DEFAULT_PROMPT, prompt);

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: finalPrompt },
            { inlineData: { mimeType, data: base64 } }
          ]
        }
      ]
    };

    let attempt = 0;
    let lastResponse: Response | null = null;
    let json: GeminiResponse | null = null;
    while (attempt < MAX_RETRIES) {
      const url = `${API_BASE}/v1beta/models/${MODEL_NAME}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      lastResponse = response;
      json = (await response.json()) as GeminiResponse;

      const quotaHit = response.status === 429 || /quota exceeded/i.test(json?.error?.message ?? '') || /rate limit/i.test(json?.error?.message ?? '');
      if (response.ok || !quotaHit || attempt === MAX_RETRIES - 1) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_WAIT_MS));
      attempt += 1;
    }

    if (!lastResponse || !json) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'No response from Gemini' }));
      return;
    }

    if (!lastResponse.ok) {
      const statusCode = lastResponse.status || 500;
      const detailMessage = json.error?.message || json.error?.status || 'Gemini API request failed';
      let retryAfterMs: number | undefined;
      if (statusCode === 429) {
        const retryAfterHeader = lastResponse.headers.get('retry-after');
        if (retryAfterHeader) {
          const retrySeconds = Number(retryAfterHeader);
          if (!Number.isNaN(retrySeconds)) {
            retryAfterMs = Math.max(0, retrySeconds * 1000);
          } else {
            const retryDate = Date.parse(retryAfterHeader);
            if (!Number.isNaN(retryDate)) {
              retryAfterMs = Math.max(0, retryDate - Date.now());
            }
          }
        }
        if (retryAfterMs === undefined) {
          retryAfterMs = Number(process.env.GEMINI_RETRY_AFTER_DEFAULT_MS ?? 60000);
        }
      }
      res.statusCode = statusCode;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: statusCode === 429 ? 'Gemini quota exceeded. Please wait before trying again.' : detailMessage,
        detail: json,
        model: MODEL_NAME,
        attempt,
        status: statusCode,
        retryAfterMs
      }));
      return;
    }

    if (json.promptFeedback?.blockReason) {
      res.statusCode = 422;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Prompt blocked: ${json.promptFeedback.blockReason}`, detail: json.promptFeedback, model: MODEL_NAME }));
      return;
    }

    const inlineData = extractGeneratedImage(json);
    if (!inlineData?.data) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'no_image_returned', detail: json, model: MODEL_NAME }));
      return;
    }

    const outputMime = inlineData.mimeType || 'image/png';
    const dataUrl = `data:${outputMime};base64,${inlineData.data}`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, image: dataUrl, model: MODEL_NAME, prompt: finalPrompt, retries: attempt }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err?.message || 'Unknown error' }));
  }
}
