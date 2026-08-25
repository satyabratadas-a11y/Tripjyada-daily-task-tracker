// Dedicated OCR (Google Cloud Vision's TEXT_DETECTION) — the same category of tech behind Google
// Lens/Photos text scanning, not a generative model reasoning over the image. Sub-second on
// high-throughput infrastructure, and not subject to the "model overloaded" behavior an LLM vision
// call has. Separate product/API key from Gemini's Generative Language API — see server/.env.example.
const VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;
const VISION_TIMEOUT_MS = 3500;

function isVisionEnabled() {
  return Boolean(VISION_API_KEY);
}

/**
 * OCRs every image (front, optionally back) and returns one raw-text string per image, in the
 * same order — or null if Vision isn't configured, or any image's OCR call fails, so the caller
 * can fall back to the slower-but-still-working direct-image Gemini path instead of failing the
 * whole scan over what should be a pure speed optimization.
 */
async function extractTextFromImages(images) {
  if (!isVisionEnabled()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);
  try {
    // images:annotate is a batch endpoint, so front and back can share one HTTP round trip instead
    // of opening two separate requests. The response order matches the request order.
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        requests: images.map(({ buffer }) => ({
          image: { content: buffer.toString('base64') },
          features: [{ type: 'TEXT_DETECTION' }],
        })),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Vision API request failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const results = data.responses || [];
    if (results.length !== images.length) throw new Error('Vision API returned an incomplete response');
    const failed = results.find((result) => result?.error);
    if (failed) throw new Error(failed.error.message || 'Vision API returned an error');
    const texts = results.map((result) => result?.fullTextAnnotation?.text || '');
    if (texts.every((t) => !t.trim())) return null;
    return texts;
  } catch (err) {
    console.log(`[vision] OCR failed (${err.message}) — falling back to a direct Gemini vision call`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { isVisionEnabled, extractTextFromImages };
