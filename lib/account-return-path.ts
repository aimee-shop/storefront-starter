/**
 * Allow only a product PDP path as a post-login return. Blocks protocol-relative
 * URLs, extra segments, query strings, and anything that is not `/products/{slug}`.
 */
const PRODUCT_PDP_PATH = /^\/products\/[a-zA-Z0-9_-]+$/;

export function safeAccountReturnPath(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;

  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }

  if (
    decoded.includes('\\') ||
    decoded.includes('//') ||
    decoded.includes('\\0') ||
    decoded.includes('\n') ||
    decoded.includes('\r')
  ) {
    return null;
  }

  if (!PRODUCT_PDP_PATH.test(decoded)) return null;
  return decoded;
}
