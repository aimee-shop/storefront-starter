/**
 * SetupIntent shape returned by core-api POST /v1/storefront/payment-methods/setup-intents.
 * publishableKey comes from that JSON -- never from a starter env Stripe pk.
 */
export interface VaultSetupIntent {
  clientSecret: string;
  setupIntentId: string;
  publishableKey: string;
  status: string;
}

export function isValidSetupIntent(
  intent: Partial<VaultSetupIntent> | null | undefined
): intent is VaultSetupIntent {
  return (
    !!intent &&
    typeof intent.clientSecret === 'string' &&
    intent.clientSecret.length > 0 &&
    typeof intent.setupIntentId === 'string' &&
    intent.setupIntentId.length > 0 &&
    typeof intent.publishableKey === 'string' &&
    intent.publishableKey.length > 0 &&
    typeof intent.status === 'string' &&
    intent.status.length > 0
  );
}
