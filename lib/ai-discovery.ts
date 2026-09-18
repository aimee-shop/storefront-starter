/**
 * Server-side AI Discovery data fetching.
 *
 * Fetches JSON-LD structured data from the Core API for injection into page <head>.
 * Uses Next.js ISR (Incremental Static Regeneration) for 5-minute caching.
 *
 * This MUST be server-side rendered (not client-side) because:
 * - AI crawlers (GPTBot, ClaudeBot) don't execute JavaScript
 * - Search engine crawlers need JSON-LD in the initial HTML response
 */

import { config } from './config';

interface AiDiscoveryResponse {
  jsonLd?: Record<string, unknown>;
  files?: Array<{
    type: string;
    content: string;
  }>;
}

/**
 * Fetch JSON-LD structured data for the current store.
 *
 * Returns the JSON-LD object to be injected into <head>, or null if unavailable.
 * Gracefully degrades - never throws, just returns null on any error.
 */
export async function getAiDiscoveryJsonLd(): Promise<Record<string, unknown> | null> {
  const { coreApiUrl, storeId, apiKey } = config;

  if (!coreApiUrl || !storeId || !apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${coreApiUrl}/stores/${storeId}/ai-discovery`,
      {
        headers: { 'x-api-key': apiKey },
        next: { revalidate: 300 }, // 5-minute ISR cache
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: AiDiscoveryResponse = await response.json();

    // Only return if API provides structured jsonLd field
    return data.jsonLd ?? null;
  } catch {
    // Graceful degradation - page renders normally without JSON-LD
    return null;
  }
}
