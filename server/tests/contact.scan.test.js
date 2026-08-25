const mockExtractCardFields = jest.fn();

jest.mock('../src/utils/gemini', () => ({
  extractCardFields: (...args) => mockExtractCardFields(...args),
  testConnection: jest.fn(),
}));

const request = require('supertest');
const Contact = require('../src/models/Contact');
const { app, createUser, authCookie } = require('./helpers');

const SCANNED_FIELDS = {
  name: 'Existing Person',
  company: 'Example Co',
  jobTitle: 'Director',
  phone: '+91 98765 43210',
  email: 'person@example.com',
  website: 'example.com',
  address: '1 Test Road',
  state: 'Sikkim',
  pincode: '737101',
};

describe('POST /api/contacts/scan', () => {
  beforeEach(() => {
    mockExtractCardFields.mockReset();
    mockExtractCardFields.mockResolvedValue({ ...SCANNED_FIELDS });
  });

  test('returns normalized scan fields and the matching capturer without populating every candidate', async () => {
    const scanningAgent = await createUser({ role: 'b2b_agent', email: 'scanner@example.com' });
    const originalAgent = await createUser({ role: 'b2b_agent', email: 'original@example.com', name: 'Original Agent' });
    await Contact.create({
      capturedBy: originalAgent._id,
      name: SCANNED_FIELDS.name,
      company: SCANNED_FIELDS.company,
      phone: '9876543210',
      email: SCANNED_FIELDS.email,
    });

    const response = await request(app)
      .post('/api/contacts/scan')
      .set('Cookie', authCookie(scanningAgent))
      .attach('image', Buffer.from('fake jpeg'), { filename: 'card.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.body.fields.phone).toBe('9876543210');
    expect(response.body.duplicate).toMatchObject({
      name: SCANNED_FIELDS.name,
      company: SCANNED_FIELDS.company,
      capturedBy: 'Original Agent',
    });
    expect(mockExtractCardFields).toHaveBeenCalledTimes(1);
  });
});
