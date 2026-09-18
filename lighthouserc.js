/**
 * Lighthouse CI budgets for storefront MR gates (issue #22).
 *
 * Tuning:
 * - Purpose is regression gating, not perfect Core Web Vitals scores.
 * - Baseline (CI, simulated mobile, 2026-07-13, numberOfRuns=1):
 *     home LCP ~3.3s; products LCP ~3.2s / CLS ~0.43; PDP LCP ~3.1s /
 *     CLS ~0.26; cart LCP ~2.6s / CLS ~0.12; checkout CLS ~0.11.
 * - Starting budgets below sit just above that baseline (+ headroom for
 *   single-run noise). Aspirational CWV targets remain LCP 2.5s / CLS 0.1;
 *   tighten toward them after ~2 weeks of green MR medians.
 * - numberOfRuns=3 + median (2026-07-27). At numberOfRuns=1 the lab timings
 *   were noise-dominated on shared runners: the same commit measured PDP TBT
 *   527ms then 415ms, and cart TBT passed then hit 750ms, with no code change.
 *   Three runs at the median costs ~3x job time (~5 -> ~15 min) and buys a
 *   gate that fails on regressions instead of on runner load.
 * - Complements k6 API thresholds in testing (server latency vs
 *   browser-perceived speed).
 *
 * URL list is owned by scripts/lhci-ci.sh (sets LHCI_URLS after resolving a
 * live product slug from the sitemap). Run via `npm run lhci`, not raw lhci.
 */
if (!process.env.LHCI_URLS) {
  throw new Error(
    'LHCI_URLS is required. Run via npm run lhci (scripts/lhci-ci.sh), which starts the server and sets URLs.'
  );
}

const urls = process.env.LHCI_URLS.split(',')
  .map((u) => u.trim())
  .filter(Boolean);

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      // Server is started by scripts/lhci-ci.sh so we can resolve PDP URLs
      // from the live sitemap before collect. Leave startServerCommand unset.
      url: urls,
      settings: {
        onlyCategories: ['performance'],
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --headless=new',
      },
    },
    assert: {
      assertions: {
        // Aspirational: 2500. Current CI baseline ~3.3s.
        'largest-contentful-paint': [
          'error',
          { maxNumericValue: 4000, aggregationMethod: 'median' },
        ],
        'total-blocking-time': [
          'error',
          { maxNumericValue: 300, aggregationMethod: 'median' },
        ],
        // Aspirational: 0.1. Current CI baseline worst ~0.43 on /products.
        'cumulative-layout-shift': [
          'error',
          { maxNumericValue: 0.5, aggregationMethod: 'median' },
        ],
        // 350 KiB script transfer budget (bytes).
        'resource-summary:script:size': [
          'error',
          { maxNumericValue: 358400, aggregationMethod: 'median' },
        ],
      },
    },
    upload: {
      // Job artifacts only -- no temporary-public-storage (issue AC).
      target: 'filesystem',
      outputDir: './lhci-reports',
    },
  },
};
