import { createHmac, timingSafeEqual } from 'crypto';

export const CACHE_WEBHOOK_SIGNATURE_HEADER = 'x-aimee-webhook-signature';

/**
 * Verify the HMAC used by core-api cache webhooks.
 * Signature string is `t={unixSeconds},v1={hex}` over `{unixSeconds}.{rawBody}`.
 * Same format as UCP outbound webhooks.
 */
export function verifyCacheWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  nowSecs = Math.floor(Date.now() / 1000),
  toleranceSecs = 300,
): boolean {
  const parsed = parseCacheWebhookSignature(signature);
  if (!parsed) return false;
  if (Math.abs(nowSecs - parsed.timestamp) > toleranceSecs) return false;

  const expected = createHmac('sha256', secret)
    .update(`${parsed.timestamp}.${payload}`)
    .digest('hex');
  return timingSafeEqualHex(parsed.hash, expected);
}

export function parseCacheWebhookSignature(
  signature: string,
): { timestamp: number; hash: string } | null {
  let timestamp: number | undefined;
  let hash: string | undefined;
  for (const part of signature.split(',')) {
    if (part.startsWith('t=')) timestamp = Number.parseInt(part.slice(2), 10);
    if (part.startsWith('v1=')) hash = part.slice(3);
  }
  if (timestamp === undefined || Number.isNaN(timestamp) || !hash) {
    return null;
  }
  return { timestamp, hash };
}

function timingSafeEqualHex(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
