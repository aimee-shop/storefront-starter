import type { CheckoutCompletionResult, Order } from '@aimee.shop/sdk';

/**
 * Human-readable order number for confirmation URLs.
 * Does not fall back to UUID orderId -- confirmation lookup is by order number.
 */
export function resolveConfirmationOrderParam(
  completion: Pick<CheckoutCompletionResult, 'orderId' | 'orderSummary'>
): string | null {
  const fromSummary = completion.orderSummary?.orderNumber?.trim();
  return fromSummary || null;
}

export function isOrderOwnedByCustomer(
  order: Pick<Order, 'customerId'>,
  customerId: string
): boolean {
  return Boolean(customerId) && order.customerId === customerId;
}

export interface ConfirmationAccessInput {
  orderParam: string | null | undefined;
  hasSession: boolean;
  lookupFailed: boolean;
  order: Pick<Order, 'customerId'> | null;
  customerId: string | null;
}

/**
 * Whether the signed-in confirmation page should redirect away (home) instead
 * of rendering order details. Guest confirmation uses handoff helpers instead.
 */
export function shouldRedirectAwayFromConfirmation(
  input: ConfirmationAccessInput
): boolean {
  const param = input.orderParam?.trim();
  if (!param) return true;
  if (!input.hasSession || !input.customerId) return true;
  if (input.lookupFailed || !input.order) return true;
  if (!isOrderOwnedByCustomer(input.order, input.customerId)) return true;
  return false;
}

/** sessionStorage key for post-checkout guest thank-you handoff. */
export const GUEST_CONFIRMATION_STORAGE_KEY = 'aimee-guest-order-confirmation';

export interface GuestConfirmationHandoff {
  orderNumber: string;
  totalAmount: string;
  currency: string;
  itemsCount: number;
  estimatedDelivery?: string;
  email?: string;
  completedAt: string;
}

/**
 * Build a guest-safe confirmation payload from checkout completion.
 * Contains only data the complete response already returned to the browser.
 */
export function buildGuestConfirmationHandoff(
  completion: Pick<
    CheckoutCompletionResult,
    'orderSummary' | 'completedAt' | 'fulfillmentDetails'
  >,
  options?: { email?: string | null }
): GuestConfirmationHandoff | null {
  const orderNumber = completion.orderSummary?.orderNumber?.trim();
  if (!orderNumber) return null;

  const estimated =
    completion.orderSummary?.estimatedDelivery ??
    completion.fulfillmentDetails?.estimatedDeliveryDate;

  return {
    orderNumber,
    totalAmount: completion.orderSummary.totalAmount ?? '0',
    currency: completion.orderSummary.currency ?? 'usd',
    itemsCount: completion.orderSummary.itemsCount ?? 0,
    ...(estimated ? { estimatedDelivery: estimated } : {}),
    ...(options?.email?.trim() ? { email: options.email.trim() } : {}),
    completedAt: completion.completedAt || new Date().toISOString(),
  };
}

export function saveGuestConfirmationHandoff(
  handoff: GuestConfirmationHandoff
): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      GUEST_CONFIRMATION_STORAGE_KEY,
      JSON.stringify(handoff)
    );
  } catch {
    // Private mode / quota -- guest confirmation may fall back to soft message.
  }
}

export function readGuestConfirmationHandoff(): GuestConfirmationHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(GUEST_CONFIRMATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestConfirmationHandoff>;
    if (!parsed.orderNumber?.trim()) return null;
    return {
      orderNumber: parsed.orderNumber.trim(),
      totalAmount: String(parsed.totalAmount ?? '0'),
      currency: String(parsed.currency ?? 'usd'),
      itemsCount: Number(parsed.itemsCount) || 0,
      ...(parsed.estimatedDelivery
        ? { estimatedDelivery: parsed.estimatedDelivery }
        : {}),
      ...(parsed.email ? { email: parsed.email } : {}),
      completedAt: parsed.completedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Drop the guest handoff after a successful confirmation render (same-tab reuse). */
export function clearGuestConfirmationHandoff(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(GUEST_CONFIRMATION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Whether a stored guest handoff may be shown for the confirmation URL.
 */
export function isGuestHandoffValidForOrder(
  handoff: GuestConfirmationHandoff | null,
  orderParam: string | null | undefined
): handoff is GuestConfirmationHandoff {
  const param = orderParam?.trim();
  if (!param || !handoff) return false;
  return handoff.orderNumber === param;
}
