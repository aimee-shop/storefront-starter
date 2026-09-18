import { describe, expect, it } from 'vitest';
import { contactSchema, newsletterSchema } from './marketing';

describe('newsletterSchema', () => {
  it('accepts a valid email', () => {
    const result = newsletterSchema.safeParse({ email: 'shopper@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = newsletterSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

describe('contactSchema', () => {
  const valid = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    subject: 'Help',
    message: 'I need help with my order.',
  };

  it('accepts a complete message', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = contactSchema.safeParse({ ...valid, name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = contactSchema.safeParse({ ...valid, email: 'bad' });
    expect(result.success).toBe(false);
  });
});
