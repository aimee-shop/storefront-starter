/**
 * Fail-closed privileged script injection.
 * Never evals strings; only sets src + integrity + crossOrigin on a script element.
 */

export interface InjectScriptSpec {
  scriptUrl: string;
  integrity: string;
  crossOrigin: 'anonymous' | 'use-credentials';
  maxLoadMs: number;
  /** Stable DOM id so we do not double-inject. */
  mountId: string;
}

export type InjectScriptResult =
  | { ok: true; durationMs: number }
  | {
      ok: false;
      reason: 'timeout' | 'error' | 'invalid' | 'duplicate' | 'exception';
      durationMs: number;
      message?: string;
    };

function validateSpec(spec: InjectScriptSpec): string | null {
  if (!spec.scriptUrl || typeof spec.scriptUrl !== 'string') {
    return 'missing scriptUrl';
  }
  if (!spec.integrity || typeof spec.integrity !== 'string') {
    return 'missing integrity';
  }
  if (!spec.mountId) return 'missing mountId';
  if (!Number.isFinite(spec.maxLoadMs) || spec.maxLoadMs <= 0) {
    return 'invalid maxLoadMs';
  }
  // Reject javascript: and data: even if verify missed them
  const lower = spec.scriptUrl.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('vbscript:')
  ) {
    return 'disallowed scriptUrl scheme';
  }
  return null;
}

/**
 * Inject a single verified remote script. Resolves on load, error, or timeout.
 * Safe to call multiple times: duplicate mountId returns duplicate without re-inject.
 */
export function injectVerifiedScript(
  spec: InjectScriptSpec,
  doc: Document = document,
): Promise<InjectScriptResult> {
  const started = performance.now();
  const invalid = validateSpec(spec);
  if (invalid) {
    return Promise.resolve({
      ok: false,
      reason: 'invalid',
      durationMs: 0,
      message: invalid,
    });
  }

  const domId = `aimee-app-script-${spec.mountId}`;
  if (doc.getElementById(domId)) {
    return Promise.resolve({
      ok: false,
      reason: 'duplicate',
      durationMs: 0,
    });
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: InjectScriptResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    let el: HTMLScriptElement;
    try {
      el = doc.createElement('script');
      el.id = domId;
      el.async = true;
      el.integrity = spec.integrity;
      el.crossOrigin = spec.crossOrigin;
      // Set src last so integrity is attached before fetch begins.
      el.src = spec.scriptUrl;
      // Never set text / innerHTML / srcdoc from remote or local strings.
    } catch (err) {
      finish({
        ok: false,
        reason: 'exception',
        durationMs: performance.now() - started,
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    const timer = setTimeout(() => {
      // Enforce the budget: detach handlers and remove the element so a late
      // arrival cannot report success and a retry is not blocked by the DOM id.
      el.onload = null;
      el.onerror = null;
      try {
        el.remove();
      } catch {
        // Already detached; nothing to clean up.
      }
      finish({
        ok: false,
        reason: 'timeout',
        durationMs: performance.now() - started,
        message: `exceeded maxLoadMs=${spec.maxLoadMs}`,
      });
    }, spec.maxLoadMs);

    el.onload = () => {
      finish({
        ok: true,
        durationMs: performance.now() - started,
      });
    };
    el.onerror = () => {
      finish({
        ok: false,
        reason: 'error',
        durationMs: performance.now() - started,
        message: 'script element error (SRI mismatch, network, or CSP)',
      });
    };

    try {
      (doc.head ?? doc.documentElement).appendChild(el);
    } catch (err) {
      finish({
        ok: false,
        reason: 'exception',
        durationMs: performance.now() - started,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
