const originalFetch = global.fetch;

function loadVision(key = 'vision-test-key') {
  jest.resetModules();
  if (key) process.env.GOOGLE_VISION_API_KEY = key;
  else delete process.env.GOOGLE_VISION_API_KEY;
  return require('../src/utils/visionOcr');
}

describe('Cloud Vision business-card OCR', () => {
  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    delete process.env.GOOGLE_VISION_API_KEY;
    jest.restoreAllMocks();
  });

  test('does nothing when the optional Vision key is not configured', async () => {
    global.fetch = jest.fn();
    const { extractTextFromImages } = loadVision('');

    await expect(extractTextFromImages([{ buffer: Buffer.from('front') }])).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('OCRs front and back in one batch request and preserves response order', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        responses: [
          { fullTextAnnotation: { text: 'front text' } },
          { fullTextAnnotation: { text: 'back text' } },
        ],
      }),
    });
    const { extractTextFromImages } = loadVision();

    await expect(
      extractTextFromImages([{ buffer: Buffer.from('front') }, { buffer: Buffer.from('back') }])
    ).resolves.toEqual(['front text', 'back text']);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const request = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(request.requests).toHaveLength(2);
  });

  test('aborts a stalled Vision request and falls back instead of hanging', async () => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    global.fetch = jest.fn((url, options) =>
      new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      })
    );
    const { extractTextFromImages } = loadVision();
    const result = extractTextFromImages([{ buffer: Buffer.from('front') }]);

    await jest.advanceTimersByTimeAsync(3500);
    await expect(result).resolves.toBeNull();
  });
});
