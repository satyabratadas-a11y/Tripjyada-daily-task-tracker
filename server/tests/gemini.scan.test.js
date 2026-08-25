const mockGenerateContent = jest.fn();
const mockExtractTextFromImages = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({ models: { generateContent: mockGenerateContent } })),
}));

jest.mock('../src/utils/visionOcr', () => ({
  isVisionEnabled: () => false,
  extractTextFromImages: (...args) => mockExtractTextFromImages(...args),
}));

const FIELDS = {
  name: 'Test Person',
  company: 'Example Co',
  jobTitle: 'Director',
  phone: '9876543210',
  email: 'test@example.com',
  website: 'example.com',
  address: '1 Test Road',
  state: 'Sikkim',
  pincode: '737101',
};

function loadGemini() {
  jest.resetModules();
  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.GEMINI_MODEL;
  return require('../src/utils/gemini');
}

describe('business-card Gemini request', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    mockExtractTextFromImages.mockReset();
    mockExtractTextFromImages.mockResolvedValue(null);
  });

  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  test('uses the stable low-latency model, minimal thinking, and a hard request timeout', async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(FIELDS) });
    const { extractCardFields } = loadGemini();

    await expect(extractCardFields([{ buffer: Buffer.from('image'), mimeType: 'image/jpeg' }])).resolves.toEqual(FIELDS);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const request = mockGenerateContent.mock.calls[0][0];
    expect(request.model).toBe('gemini-3.5-flash-lite');
    expect(request.config).toMatchObject({
      responseMimeType: 'application/json',
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingLevel: 'minimal' },
      httpOptions: { timeout: 10000 },
    });
  });

  test('retries one transient provider failure and then succeeds', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error(JSON.stringify({ error: { code: 503, status: 'UNAVAILABLE' } })))
      .mockResolvedValueOnce({ text: JSON.stringify(FIELDS) });
    const { extractCardFields } = loadGemini();

    await expect(extractCardFields([{ buffer: Buffer.from('image'), mimeType: 'image/jpeg' }])).resolves.toEqual(FIELDS);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  test('does not retry a non-transient provider error', async () => {
    mockGenerateContent.mockRejectedValue(new Error(JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT' } })));
    const { extractCardFields } = loadGemini();

    await expect(extractCardFields([{ buffer: Buffer.from('image'), mimeType: 'image/jpeg' }])).rejects.toMatchObject({ status: 503 });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
