import { afterEach, describe, expect, it, vi } from 'vitest';
import { injectVerifiedScript } from './inject-script';

const SRI =
  'sha384-9ZkDOxyLpBxLRa1vAYIOvMOy6ddblTk5mH4vppXVL+eHS293nHzdukxXlIU+fImY';

function spec(mountId: string, overrides: { scriptUrl?: string; maxLoadMs?: number } = {}) {
  return {
    scriptUrl: overrides.scriptUrl ?? 'https://scripts.example.com/v1/app.js',
    integrity: SRI,
    crossOrigin: 'anonymous' as const,
    maxLoadMs: overrides.maxLoadMs ?? 1000,
    mountId,
  };
}

function mountedElement(mountId: string): HTMLScriptElement | null {
  const el = document.getElementById(`aimee-app-script-${mountId}`);
  return el instanceof HTMLScriptElement ? el : null;
}

afterEach(() => {
  vi.useRealTimers();
  for (const el of [...document.querySelectorAll('script[id^="aimee-app-script-"]')]) {
    el.remove();
  }
});

describe('injectVerifiedScript', () => {
  it('rejects disallowed schemes without injecting', async () => {
    const result = await injectVerifiedScript(spec('m1', { scriptUrl: 'javascript:alert(1)' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('invalid');
    expect(mountedElement('m1')).toBeNull();
  });

  it('sets integrity and crossOrigin before load completes', async () => {
    const promise = injectVerifiedScript(spec('m2'));
    const el = mountedElement('m2');
    expect(el).not.toBeNull();
    expect(el?.integrity).toMatch(/^sha384-/);
    expect(el?.crossOrigin).toBe('anonymous');
    expect(el?.async).toBe(true);
    expect(el?.src).toBe('https://scripts.example.com/v1/app.js');
    el?.onload?.call(el, new Event('load'));
    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it('does not double-inject same mountId', async () => {
    const first = injectVerifiedScript(spec('m3'));
    const el = mountedElement('m3');
    el?.onload?.call(el, new Event('load'));
    await first;
    const second = await injectVerifiedScript(spec('m3'));
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe('duplicate');
  });

  it('removes the element on timeout so a retry is possible', async () => {
    vi.useFakeTimers();
    const promise = injectVerifiedScript(spec('slow', { maxLoadMs: 50 }));
    expect(mountedElement('slow')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(60);
    const result = await promise;
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('timeout');
    // Budget enforcement: the element must be gone after the deadline.
    expect(mountedElement('slow')).toBeNull();

    // Retry is no longer blocked by the stale DOM id.
    const retry = injectVerifiedScript(spec('slow', { maxLoadMs: 50 }));
    const el = mountedElement('slow');
    expect(el).not.toBeNull();
    el?.onload?.call(el, new Event('load'));
    const retryResult = await retry;
    expect(retryResult.ok).toBe(true);
  });
});
