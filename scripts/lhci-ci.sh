#!/usr/bin/env bash
# Start production server, resolve Lighthouse URLs (incl. a live PDP slug),
# run lhci autorun, then tear down. Used by the GitLab lighthouse job.
set -euo pipefail

BASE_URL="${LHCI_BASE_URL:-http://localhost:3010}"
READY_TIMEOUT_SEC="${LHCI_READY_TIMEOUT_SEC:-90}"
SERVER_PID=""

cleanup() {
  if [[ -n "${SERVER_PID}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "[lhci-ci] starting next start (package.json uses -p 3010)"
npm run start &
SERVER_PID=$!

echo "[lhci-ci] waiting for ${BASE_URL} (timeout ${READY_TIMEOUT_SEC}s)"
deadline=$((SECONDS + READY_TIMEOUT_SEC))
until curl -sf -o /dev/null "${BASE_URL}/"; do
  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    echo "[lhci-ci] server exited before becoming ready" >&2
    exit 1
  fi
  if (( SECONDS >= deadline )); then
    echo "[lhci-ci] timed out waiting for server" >&2
    exit 1
  fi
  sleep 1
done
echo "[lhci-ci] server ready"

# Prefer a real product from the sitemap so PDP budgets reflect a real page.
# If the catalog is empty or the storefront API key cannot list products
# (e.g. api-dev RBAC permission snapshot empty for API keys), fall back to
# LHCI_PRODUCT_SLUG so we still gate JS/LCP on a PDP URL shape.
sitemap="$(curl -sf "${BASE_URL}/sitemap.xml" || true)"
slug=""
if [[ -n "${sitemap}" ]]; then
  # Match /products/<slug> (not query-string category filters).
  slug="$(
    printf '%s' "${sitemap}" \
      | grep -oE '/products/[a-zA-Z0-9][a-zA-Z0-9_-]*' \
      | head -n 1 \
      | sed 's|^/products/||' \
      || true
  )"
fi

if [[ -z "${slug}" ]]; then
  slug="${LHCI_PRODUCT_SLUG:-test}"
  echo "[lhci-ci] no product slug in sitemap; using fallback slug=${slug}" >&2
else
  echo "[lhci-ci] product slug from sitemap: ${slug}"
fi

export LHCI_BASE_URL="${BASE_URL}"
export LHCI_URLS="${BASE_URL}/,${BASE_URL}/products,${BASE_URL}/products/${slug},${BASE_URL}/cart,${BASE_URL}/checkout"
echo "[lhci-ci] URLs: ${LHCI_URLS}"

if [[ -n "${CHROME_PATH:-}" ]]; then
  export CHROME_PATH
  echo "[lhci-ci] CHROME_PATH=${CHROME_PATH}"
fi

npx lhci autorun
