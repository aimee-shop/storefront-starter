#!/usr/bin/env bash
# Start mock API, wait until healthy, then build+start the storefront.
# Single webServer entry so the mock is always up before next build.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

MOCK_URL="${E2E_MOCK_API_URL:-http://127.0.0.1:3099}"
MOCK_PID=""

cleanup() {
  if [[ -n "${MOCK_PID}" ]] && kill -0 "${MOCK_PID}" 2>/dev/null; then
    kill "${MOCK_PID}" 2>/dev/null || true
    wait "${MOCK_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

npx tsx e2e/scripts/start-mock-api.mjs &
MOCK_PID=$!

echo "[e2e] waiting for mock API at ${MOCK_URL}/health"
# Node fetch (not curl/wget): curl is missing on bookworm-slim and alpine CI images.
deadline=$((SECONDS + 30))
until node -e "fetch(process.argv[1]).then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" "${MOCK_URL}/health"; do
  if ! kill -0 "${MOCK_PID}" 2>/dev/null; then
    echo "[e2e] mock API exited before becoming ready" >&2
    exit 1
  fi
  if (( SECONDS >= deadline )); then
    echo "[e2e] timed out waiting for mock API" >&2
    exit 1
  fi
  sleep 0.2
done
echo "[e2e] mock API ready"

npm run build
# Start stays in foreground; Playwright kills the process group on exit.
exec npm run start
