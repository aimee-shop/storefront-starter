import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import {
  CACHE_WEBHOOK_SIGNATURE_HEADER,
  verifyCacheWebhookSignature,
} from '@/lib/cache-webhook';
import { expireTagNow } from '@/lib/expire-tag';

const seenCorrelationIds = new Set<string>();

interface CacheWebhookBody {
  correlationId?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.AIMEE_CACHE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'unconfigured' }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get(CACHE_WEBHOOK_SIGNATURE_HEADER) ?? '';
  if (!verifyCacheWebhookSignature(payload, signature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let correlationId: string | null = null;
  try {
    const body = JSON.parse(payload) as CacheWebhookBody;
    if (typeof body.correlationId === 'string') {
      correlationId = body.correlationId;
    }
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (correlationId && seenCorrelationIds.has(correlationId)) {
    return NextResponse.json({ revalidated: true, duplicate: true, correlationId });
  }
  if (correlationId) {
    seenCorrelationIds.add(correlationId);
  }

  // No-profile delete. A cacheLife profile (including { expire: 0 }) is
  // unproven on Vercel -- profile presence may map to SWR invalidation.
  expireTagNow('cms');
  revalidatePath('/');
  revalidatePath('/', 'layout');

  return NextResponse.json({ revalidated: true, correlationId });
}
