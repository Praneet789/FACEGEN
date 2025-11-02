// Expected POST body: { imageDataUri: string, prompt?: string, strength?: number }
const DEFAULT_PROMPT = [
    'Convert this forensic composite sketch into a fully photorealistic human face.',
    'MANDATORY: Preserve 100% of the facial structure, proportions, geometry, pose, and feature placement exactly as in the input (no reshaping, no beautification).',
    'Do NOT change head size, eye spacing, nose width/angle, mouth shape, jawline, cheek contours, or any silhouette elements.',
    'Only enhance texture: add realistic skin (neutral tone), pores, natural lighting, natural eyes, hair rendering, and subtle shading.',
    'Background MUST be solid pure white (#FFFFFF) with no gradients, patterns, text, watermark, or artifacts.',
    'Neutral expression unless already expressive in the sketch.',
    'No added accessories, no jewelry, no extra hair strands beyond implied shapes, no stylization, no artistic filters.',
    'High-resolution, front-facing realistic photograph output.'
].join(' ');
async function callFal(apiKey, model, payload) {
    const resp = await fetch(`https://fal.run/${model}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Key ${apiKey}` },
        body: JSON.stringify(payload)
    });
    const text = await resp.text();
    if (!resp.ok) {
        return { error: 'request_failed', detail: text, modelTried: model };
    }
    try {
        const json = JSON.parse(text);
        return { success: true, data: json, modelTried: model };
    }
    catch (e) {
        return { error: 'parse_failed', detail: text, modelTried: model };
    }
}
export async function handleFalProxy(req, res) {
    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
    }
    try {
        const chunks = [];
        for await (const chunk of req)
            chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString('utf-8');
        const body = raw ? JSON.parse(raw) : {};
        const { imageDataUri, prompt = DEFAULT_PROMPT } = body;
        if (!imageDataUri) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'imageDataUri required' }));
            return;
        }
        const apiKey = process.env.FAL_KEY;
        if (!apiKey) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Missing FAL_KEY on server' }));
            return;
        }
        // Direct REST call; fal-client npm package could also be used, but we avoid bundling it client-side.
        // Reference: subscribing endpoint pattern (simulate single request -> await completion).
        // Try Gemini model first
        const geminiPayload = { input: { prompt, image_urls: [imageDataUri] }, logs: true };
        const primary = await callFal(apiKey, 'fal-ai/gemini-25-flash-image/edit', geminiPayload);
        if (primary.success) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, model: primary.modelTried, data: primary.data }));
            return;
        }
        // Fallback to previous qwen image edit endpoint
        const qwenPayload = {
            prompt,
            image_url: imageDataUri,
            strength: 0.55,
            num_inference_steps: 36,
            guidance_scale: 7.5,
            num_images: 1
        };
        const fallback = await callFal(apiKey, 'fal-ai/qwen-image-edit', qwenPayload);
        if (fallback.success) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, model: fallback.modelTried, data: fallback.data, fallback: true, primaryError: primary.detail }));
            return;
        }
        res.statusCode = 502;
        res.end(JSON.stringify({ error: 'both_models_failed', primaryError: primary.detail, fallbackError: fallback.detail }));
    }
    catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err?.message || 'Unknown error' }));
    }
}
