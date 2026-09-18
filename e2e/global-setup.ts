import { MOCK_API_URL } from './helpers/mock-api-server';

/**
 * Mock API is started by webServer (e2e/scripts/start-mock-api.mjs) so it is
 * up before `next build`. globalSetup only verifies health.
 */
export default async function globalSetup() {
  const health = await fetch(`${MOCK_API_URL}/health`);
  if (!health.ok) {
    throw new Error(
      `Mock API health check failed at ${MOCK_API_URL}: ${health.status}. ` +
        'Ensure webServer mock entry is running.'
    );
  }
  console.log(`[global-setup] mock API ready at ${MOCK_API_URL}`);
}
