import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { verifyCacheWebhookSignature } from './cache-webhook';

function sign(payload: string, secret: string, timestamp: number): string {
  const hash = createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  return `t=${timestamp},v1=${hash}`;
}

describe('verifyCacheWebhookSignature', () => {
  const payload = JSON.stringify({ eventType: 'cms.entry.updated' });
  const secret = 'whsec_storefront_cache';
  const now = 1_700_000_000;

  it('accepts a matching signature', () => {
    expect(
      verifyCacheWebhookSignature(
        payload,
        sign(payload, secret, now),
        secret,
        now,
      ),
    ).toBe(true);
  });

  it('rejects a wrong secret or body', () => {
    expect(
      verifyCacheWebhookSignature(
        payload,
        sign(payload, secret, now),
        'other-secret-value',
        now,
      ),
    ).toBe(false);
    expect(
      verifyCacheWebhookSignature(
        '{"tampered":true}',
        sign(payload, secret, now),
        secret,
        now,
      ),
    ).toBe(false);
  });

  it('rejects expired signatures', () => {
    expect(
      verifyCacheWebhookSignature(
        payload,
        sign(payload, secret, now - 600),
        secret,
        now,
      ),
    ).toBe(false);
  });
});
