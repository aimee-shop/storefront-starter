/**
 * Starts the mock Core/Payments API and keeps the process alive.
 * Invoked by e2e/scripts/run-storefront-e2e.sh (and optionally standalone).
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const port = Number(process.env.E2E_MOCK_API_PORT || 3099);
  const modPath = path.join(__dirname, '../helpers/mock-api-server.ts');
  const { startMockApiServer } = await import(pathToFileURL(modPath).href);
  await startMockApiServer(port);
  await new Promise(() => {});
}

main().catch((err) => {
  console.error('[start-mock-api]', err);
  process.exit(1);
});
