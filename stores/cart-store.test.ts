import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cart, CartItem } from '@aimee.shop/sdk';
import { NotFoundError, ValidationError } from '@aimee.shop/sdk/storefront';

const updateItemMock = vi.fn();
const removeItemMock = vi.fn();
const getMock = vi.fn();
const createMock = vi.fn();
const addItemMock = vi.fn();

vi.mock('@/lib/storefront-client', () => ({
  getStorefront: () => ({
    carts: {
      updateItem: updateItemMock,
      removeItem: removeItemMock,
      get: getMock,
      create: createMock,
      addItem: addItemMock,
    },
  }),
}));

import { resetCartStoreInternals, useCartStore } from '@/stores/cart-store';
import { useMarketPreferenceStore } from '@/stores/market-preference-store';

function makeItem(overrides: Partial<CartItem> & Pick<CartItem, 'id' | 'quantity'>): CartItem {
  return {
    productId: 'prod-1',
    productVariantId: 'var-1',
    storeId: 'store-1',
    sku: 'SKU-1',
    productName: 'Widget',
    unitPrice: '1000',
    subtotal: '1000',
    title: 'Widget',
    requiresShipping: true,
    taxable: true,
    ...overrides,
  };
}

function makeCart(overrides: Partial<Cart> = {}): Cart {
  const defaultItems = [
    makeItem({ id: 'line-a', quantity: 1, title: 'Alpha', subtotal: '1000' }),
    makeItem({
      id: 'line-b',
      quantity: 2,
      title: 'Beta',
      productId: 'prod-2',
      productVariantId: 'var-2',
      unitPrice: '500',
      subtotal: '1000',
    }),
  ];
  const items = overrides.items ?? defaultItems;
  return {
    id: 'cart-1',
    tenantId: 'tenant-1',
    storeId: 'store-1',
    status: 'active',
    itemsCount: items.reduce((n, i) => n + i.quantity, 0),
    discountsApplied: [],
    subtotal: '2000',
    discountTotal: '0',
    taxTotal: '160',
    shippingTotal: '500',
    total: '2660',
    currency: 'USD',
    locale: 'en-US',
    lastActivityAt: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
    items,
  };
}

function seedCart(cart: Cart = makeCart()) {
  useCartStore.setState({
    cartId: cart.id,
    cart,
    isLoading: false,
    _hasHydrated: true,
  });
}

beforeEach(() => {
  localStorage.clear();
  // No region subtag so seedDerivedCountryCode does not invent a country in unit tests.
  vi.stubGlobal('navigator', { language: 'en' });
  document.cookie = '';
  updateItemMock.mockReset();
  removeItemMock.mockReset();
  getMock.mockReset();
  createMock.mockReset();
  addItemMock.mockReset();
  resetCartStoreInternals();
  useCartStore.setState({
    cartId: null,
    cart: null,
    isLoading: false,
    _hasHydrated: true,
  });
  useMarketPreferenceStore.setState({
    marketId: null,
    countryCode: null,
    _hasHydrated: true,
  });
});

describe('cart-store optimistic updateItem', () => {
  it('patches quantity immediately, keeps money fields, then reconciles from SDK Cart', async () => {
    const initial = makeCart();
    seedCart(initial);

    let resolveUpdate!: (cart: Cart) => void;
    const pending = new Promise<Cart>((resolve) => {
      resolveUpdate = resolve;
    });
    updateItemMock.mockReturnValue(pending);

    const promise = useCartStore.getState().updateItem('line-a', 3);

    const mid = useCartStore.getState().cart;
    expect(mid?.items.find((i) => i.id === 'line-a')?.quantity).toBe(3);
    // Do not invent authoritative money fields during optimistic phase
    expect(mid?.total).toBe(initial.total);
    expect(mid?.subtotal).toBe(initial.subtotal);
    expect(mid?.items.find((i) => i.id === 'line-a')?.subtotal).toBe('1000');
    expect(useCartStore.getState().isLoading).toBe(true);

    const serverCart = makeCart({
      items: [
        makeItem({ id: 'line-a', quantity: 3, title: 'Alpha', subtotal: '3000' }),
        makeItem({
          id: 'line-b',
          quantity: 2,
          title: 'Beta',
          productId: 'prod-2',
          productVariantId: 'var-2',
          unitPrice: '500',
          subtotal: '1000',
        }),
      ],
      subtotal: '4000',
      taxTotal: '320',
      shippingTotal: '500',
      total: '4820',
    });
    resolveUpdate(serverCart);
    await promise;

    expect(updateItemMock).toHaveBeenCalledWith('cart-1', 'line-a', { quantity: 3 });
    expect(useCartStore.getState().cart).toEqual(serverCart);
    expect(useCartStore.getState().isLoading).toBe(false);
  });

  it('rolls back to the exact snapshot when updateItem fails', async () => {
    const initial = makeCart();
    seedCart(initial);
    updateItemMock.mockRejectedValue(new Error('network'));
    getMock.mockRejectedValue(new Error('offline'));

    await expect(useCartStore.getState().updateItem('line-a', 5)).rejects.toThrow('network');

    expect(useCartStore.getState().cart).toBe(initial);
    expect(useCartStore.getState().cart?.items.find((i) => i.id === 'line-a')?.quantity).toBe(1);
    expect(useCartStore.getState().cart?.total).toBe('2660');
    expect(useCartStore.getState().isLoading).toBe(false);
  });
});

describe('cart-store optimistic removeItem', () => {
  it('removes the line immediately then reconciles from SDK Cart', async () => {
    const initial = makeCart();
    seedCart(initial);

    let resolveRemove!: (cart: Cart) => void;
    const pending = new Promise<Cart>((resolve) => {
      resolveRemove = resolve;
    });
    removeItemMock.mockReturnValue(pending);

    const promise = useCartStore.getState().removeItem('line-b');

    const mid = useCartStore.getState().cart;
    expect(mid?.items.map((i) => i.id)).toEqual(['line-a']);
    // Totals not recomputed client-side while pending
    expect(mid?.total).toBe(initial.total);

    const serverCart = makeCart({
      items: [makeItem({ id: 'line-a', quantity: 1, title: 'Alpha', subtotal: '1000' })],
      subtotal: '1000',
      taxTotal: '80',
      shippingTotal: '500',
      total: '1580',
    });
    resolveRemove(serverCart);
    await promise;

    expect(removeItemMock).toHaveBeenCalledWith('cart-1', 'line-b');
    expect(useCartStore.getState().cart).toEqual(serverCart);
    expect(useCartStore.getState().isLoading).toBe(false);
  });

  it('restores the exact snapshot when removeItem fails', async () => {
    const initial = makeCart();
    seedCart(initial);
    removeItemMock.mockRejectedValue(new Error('sdk down'));
    getMock.mockRejectedValue(new Error('offline'));

    await expect(useCartStore.getState().removeItem('line-a')).rejects.toThrow('sdk down');

    expect(useCartStore.getState().cart).toBe(initial);
    expect(useCartStore.getState().cart?.items).toHaveLength(2);
    expect(useCartStore.getState().isLoading).toBe(false);
  });
});

describe('cart-store addItem', () => {
  it('keeps state consistent and rethrows when cart creation fails', async () => {
    let rejectCreate!: (error: Error) => void;
    createMock.mockReturnValueOnce(
      new Promise<Cart>((_resolve, reject) => {
        rejectCreate = reject;
      })
    );

    const add = useCartStore.getState().addItem('prod-1', 'var-1', 1);
    const failure = expect(add).rejects.toThrow('create failed');
    expect(useCartStore.getState().isLoading).toBe(true);

    rejectCreate(new Error('create failed'));
    await failure;

    // No phantom cart, lock released, no line mutation or revalidation attempted.
    expect(useCartStore.getState().cartId).toBeNull();
    expect(useCartStore.getState().cart).toBeNull();
    expect(useCartStore.getState().isLoading).toBe(false);
    expect(addItemMock).not.toHaveBeenCalled();
    expect(getMock).not.toHaveBeenCalled();

    // Lock is actually free: a retry reaches the SDK again and succeeds.
    const created = makeCart({ id: 'cart-9', items: [] });
    const withLine = makeCart({
      id: 'cart-9',
      items: [makeItem({ id: 'line-new', quantity: 1 })],
    });
    createMock.mockResolvedValueOnce(created);
    addItemMock.mockResolvedValueOnce(withLine);
    await useCartStore.getState().addItem('prod-1', 'var-1', 1);
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(useCartStore.getState().cart).toEqual(withLine);
  });

  it('passes countryCode uppercase on create when preference is set', async () => {
    useMarketPreferenceStore.setState({ countryCode: 'de', marketId: null });
    const created = makeCart({ id: 'cart-eu', currency: 'EUR', items: [] });
    const withLine = makeCart({
      id: 'cart-eu',
      currency: 'EUR',
      items: [makeItem({ id: 'line-new', quantity: 1 })],
    });
    createMock.mockResolvedValueOnce(created);
    addItemMock.mockResolvedValueOnce(withLine);

    await useCartStore.getState().addItem('prod-1', 'var-1', 1);

    expect(createMock).toHaveBeenCalledWith({ countryCode: 'DE' });
    expect(useCartStore.getState().cart?.currency).toBe('EUR');
  });

  it('passes marketId on create and prefers it over countryCode', async () => {
    useMarketPreferenceStore.setState({
      marketId: 'mkt-eu',
      countryCode: 'DE',
    });
    const created = makeCart({ id: 'cart-m', currency: 'EUR', items: [] });
    const withLine = makeCart({
      id: 'cart-m',
      currency: 'EUR',
      items: [makeItem({ id: 'line-new', quantity: 1 })],
    });
    createMock.mockResolvedValueOnce(created);
    addItemMock.mockResolvedValueOnce(withLine);

    await useCartStore.getState().addItem('prod-1', 'var-1', 1);

    expect(createMock).toHaveBeenCalledWith({ marketId: 'mkt-eu' });
  });

  it('clears market preference and retries create on market ValidationError', async () => {
    // SDK maps HTTP 400 market codes to ValidationError (not ApiError).
    useMarketPreferenceStore.setState({ marketId: 'mkt-bad', countryCode: null });
    const created = makeCart({ id: 'cart-fallback', items: [] });
    const withLine = makeCart({
      id: 'cart-fallback',
      items: [makeItem({ id: 'line-new', quantity: 1 })],
    });
    createMock
      .mockRejectedValueOnce(
        new ValidationError('Market inactive MARKET_INACTIVE')
      )
      .mockResolvedValueOnce(created);
    addItemMock.mockResolvedValueOnce(withLine);

    await useCartStore.getState().addItem('prod-1', 'var-1', 1);

    expect(createMock).toHaveBeenNthCalledWith(1, { marketId: 'mkt-bad' });
    expect(createMock).toHaveBeenNthCalledWith(2, {});
    expect(useMarketPreferenceStore.getState().marketId).toBeNull();
    expect(useCartStore.getState().cartId).toBe('cart-fallback');
  });

  it('does not clear market preference on unrelated create ValidationError', async () => {
    useMarketPreferenceStore.setState({ marketId: 'mkt-eu', countryCode: null });
    createMock.mockRejectedValueOnce(new ValidationError('bad payload'));

    await expect(
      useCartStore.getState().addItem('prod-1', 'var-1', 1)
    ).rejects.toBeInstanceOf(ValidationError);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({ marketId: 'mkt-eu' });
    expect(useMarketPreferenceStore.getState().marketId).toBe('mkt-eu');
    expect(useCartStore.getState().cartId).toBeNull();
  });

  it('creates a cart and reconciles the new cartId into store state', async () => {
    const created = makeCart({ id: 'cart-9', items: [] });
    let resolveCreate!: (cart: Cart) => void;
    createMock.mockReturnValueOnce(
      new Promise<Cart>((resolve) => {
        resolveCreate = resolve;
      })
    );
    let resolveAdd!: (cart: Cart) => void;
    addItemMock.mockReturnValueOnce(
      new Promise<Cart>((resolve) => {
        resolveAdd = resolve;
      })
    );

    const add = useCartStore.getState().addItem('prod-1', 'var-1', 2);
    // create awaits market-preference hydration (microtask even when hydrated).
    await vi.waitFor(() => expect(createMock).toHaveBeenCalledWith({}));
    expect(useCartStore.getState().cartId).toBeNull();

    resolveCreate(created);
    await vi.waitFor(() => expect(addItemMock).toHaveBeenCalledTimes(1));

    // Created cart is reconciled into store state before the line mutation lands.
    expect(useCartStore.getState().cartId).toBe('cart-9');
    expect(useCartStore.getState().cart).toEqual(created);
    expect(addItemMock).toHaveBeenCalledWith('cart-9', {
      productId: 'prod-1',
      productVariantId: 'var-1',
      quantity: 2,
    });

    const withLine = makeCart({
      id: 'cart-9',
      items: [makeItem({ id: 'line-new', quantity: 2 })],
    });
    resolveAdd(withLine);
    await add;

    expect(useCartStore.getState().cartId).toBe('cart-9');
    expect(useCartStore.getState().cart).toEqual(withLine);
    expect(useCartStore.getState().isLoading).toBe(false);
  });

  it('reconciles the live cart when addItem returns NotFound but the cart still exists', async () => {
    seedCart(makeCart());
    addItemMock.mockRejectedValueOnce(new NotFoundError('Variant not found'));
    const reconciled = makeCart({
      items: [makeItem({ id: 'line-b', quantity: 2, subtotal: '1000' })],
      updatedAt: '2026-07-12T00:00:00.000Z',
    });
    getMock.mockResolvedValueOnce(reconciled);

    await expect(useCartStore.getState().addItem('prod-1', 'var-1', 1)).rejects.toThrow(
      'Variant not found'
    );

    expect(getMock).toHaveBeenCalledWith('cart-1');
    expect(useCartStore.getState().cartId).toBe('cart-1');
    expect(useCartStore.getState().cart).toEqual(reconciled);
    expect(useCartStore.getState().isLoading).toBe(false);
  });

  it('clears cart state when addItem and cart revalidation both return NotFound', async () => {
    seedCart(makeCart());
    addItemMock.mockRejectedValueOnce(new NotFoundError('Cart not found'));
    getMock.mockRejectedValueOnce(new NotFoundError('Cart not found'));

    await expect(useCartStore.getState().addItem('prod-1', 'var-1', 1)).rejects.toThrow(
      'Cart not found'
    );

    expect(getMock).toHaveBeenCalledWith('cart-1');
    expect(useCartStore.getState().cartId).toBeNull();
    expect(useCartStore.getState().cart).toBeNull();
    expect(useCartStore.getState().isLoading).toBe(false);
  });
});

describe('cart-store concurrency', () => {
  it('rejects overlapping mutations so rollback state cannot be corrupted', async () => {
    seedCart(makeCart());

    let resolveUpdate!: (cart: Cart) => void;
    updateItemMock.mockReturnValue(
      new Promise<Cart>((resolve) => {
        resolveUpdate = resolve;
      })
    );

    const first = useCartStore.getState().updateItem('line-a', 2);
    await expect(useCartStore.getState().removeItem('line-b')).rejects.toThrow(
      'Cart mutation already in progress'
    );

    // First mutation still owns the optimistic cart (qty patched, line-b present)
    expect(useCartStore.getState().cart?.items).toHaveLength(2);
    expect(useCartStore.getState().cart?.items.find((i) => i.id === 'line-a')?.quantity).toBe(2);

    resolveUpdate(makeCart({ items: [makeItem({ id: 'line-a', quantity: 2, subtotal: '2000' })] }));
    await first;
    expect(useCartStore.getState().isLoading).toBe(false);
  });

  it('deduplicates concurrent refreshes and applies the shared response once', async () => {
    const initial = makeCart();
    const refreshed = makeCart({ updatedAt: '2026-07-02T00:00:00.000Z' });
    seedCart(initial);

    let resolveRefresh!: (cart: Cart) => void;
    getMock.mockReturnValue(
      new Promise<Cart>((resolve) => {
        resolveRefresh = resolve;
      })
    );

    const first = useCartStore.getState().refreshCart();
    const second = useCartStore.getState().refreshCart();

    expect(getMock).toHaveBeenCalledTimes(1);
    expect(getMock).toHaveBeenCalledWith('cart-1');

    resolveRefresh(refreshed);
    await Promise.all([first, second]);

    expect(useCartStore.getState().cart).toEqual(refreshed);
  });

  it('does not let a refresh started before updateItem overwrite the mutation result', async () => {
    const initial = makeCart();
    const staleRefresh = makeCart({ updatedAt: '2026-07-02T00:00:00.000Z' });
    const updated = makeCart({
      items: [makeItem({ id: 'line-a', quantity: 4, subtotal: '4000' })],
      updatedAt: '2026-07-03T00:00:00.000Z',
    });
    seedCart(initial);

    let resolveRefresh!: (cart: Cart) => void;
    getMock.mockReturnValue(
      new Promise<Cart>((resolve) => {
        resolveRefresh = resolve;
      })
    );
    let resolveUpdate!: (cart: Cart) => void;
    updateItemMock.mockReturnValue(
      new Promise<Cart>((resolve) => {
        resolveUpdate = resolve;
      })
    );

    const refresh = useCartStore.getState().refreshCart();
    const mutation = useCartStore.getState().updateItem('line-a', 4);
    resolveUpdate(updated);
    await mutation;
    resolveRefresh(staleRefresh);
    await refresh;

    expect(useCartStore.getState().cart).toEqual(updated);
  });

  it('does not start a refresh while a mutation owns the cart state', async () => {
    seedCart(makeCart());

    let resolveRemove!: (cart: Cart) => void;
    removeItemMock.mockReturnValue(
      new Promise<Cart>((resolve) => {
        resolveRemove = resolve;
      })
    );

    const mutation = useCartStore.getState().removeItem('line-b');
    await useCartStore.getState().refreshCart();

    expect(getMock).not.toHaveBeenCalled();
    const next = makeCart({
      items: [makeItem({ id: 'line-a', quantity: 1, subtotal: '1000' })],
    });
    resolveRemove(next);
    await mutation;
    expect(useCartStore.getState().cart).toEqual(next);
  });

  it('clears a dead cart when a failed mutation revalidation returns NotFound', async () => {
    seedCart(makeCart());

    let resolveStaleRefresh!: (cart: Cart) => void;
    getMock
      .mockReturnValueOnce(
        new Promise<Cart>((resolve) => {
          resolveStaleRefresh = resolve;
        })
      )
      .mockRejectedValueOnce(new NotFoundError('Cart not found'));
    updateItemMock.mockRejectedValue(new Error('mutation failed'));

    const staleRefresh = useCartStore.getState().refreshCart();
    await expect(useCartStore.getState().updateItem('line-a', 2)).rejects.toThrow(
      'mutation failed'
    );

    expect(getMock).toHaveBeenCalledTimes(2);
    expect(useCartStore.getState().cartId).toBeNull();
    expect(useCartStore.getState().cart).toBeNull();

    resolveStaleRefresh(makeCart({ updatedAt: '2026-07-04T00:00:00.000Z' }));
    await staleRefresh;
    expect(useCartStore.getState().cartId).toBeNull();
    expect(useCartStore.getState().cart).toBeNull();
  });

  it('scopes refresh deduplication to the cart id and ignores the replaced cart response', async () => {
    const firstCart = makeCart();
    const secondCart = makeCart({ id: 'cart-2', updatedAt: '2026-07-03T00:00:00.000Z' });
    seedCart(firstCart);

    let resolveFirst!: (cart: Cart) => void;
    let resolveSecond!: (cart: Cart) => void;
    getMock
      .mockReturnValueOnce(
        new Promise<Cart>((resolve) => {
          resolveFirst = resolve;
        })
      )
      .mockReturnValueOnce(
        new Promise<Cart>((resolve) => {
          resolveSecond = resolve;
        })
      );

    const first = useCartStore.getState().refreshCart();
    useCartStore.setState({ cartId: secondCart.id, cart: secondCart });
    const second = useCartStore.getState().refreshCart();

    expect(getMock).toHaveBeenNthCalledWith(1, 'cart-1');
    expect(getMock).toHaveBeenNthCalledWith(2, 'cart-2');

    resolveFirst(makeCart({ updatedAt: '2026-07-04T00:00:00.000Z' }));
    await first;
    expect(useCartStore.getState().cart).toEqual(secondCart);

    const refreshedSecond = makeCart({
      id: 'cart-2',
      updatedAt: '2026-07-05T00:00:00.000Z',
    });
    resolveSecond(refreshedSecond);
    await second;
    expect(useCartStore.getState().cart).toEqual(refreshedSecond);
  });

  it('clears a rejected shared refresh so the next call retries the SDK', async () => {
    seedCart(makeCart());
    getMock
      .mockRejectedValueOnce(new Error('temporary outage'))
      .mockResolvedValueOnce(makeCart({ updatedAt: '2026-07-06T00:00:00.000Z' }));

    const first = useCartStore.getState().refreshCart();
    const second = useCartStore.getState().refreshCart();
    await expect(Promise.all([first, second])).rejects.toThrow('temporary outage');
    expect(getMock).toHaveBeenCalledTimes(1);

    await useCartStore.getState().refreshCart();
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(useCartStore.getState().cart?.updatedAt).toBe('2026-07-06T00:00:00.000Z');
  });

  it('does not let an older failed mutation release a newer mutation lock', async () => {
    seedCart(makeCart());

    let rejectFirst!: (error: Error) => void;
    updateItemMock.mockReturnValueOnce(
      new Promise<Cart>((_resolve, reject) => {
        rejectFirst = reject;
      })
    );
    let resolveRevalidation!: (cart: Cart) => void;
    getMock.mockReturnValueOnce(
      new Promise<Cart>((resolve) => {
        resolveRevalidation = resolve;
      })
    );
    let resolveSecond!: (cart: Cart) => void;
    removeItemMock.mockReturnValueOnce(
      new Promise<Cart>((resolve) => {
        resolveSecond = resolve;
      })
    );

    const first = useCartStore.getState().updateItem('line-a', 2);
    const firstFailure = expect(first).rejects.toThrow('first failed');
    rejectFirst(new Error('first failed'));
    await vi.waitFor(() => expect(getMock).toHaveBeenCalledTimes(1));

    const second = useCartStore.getState().removeItem('line-b');
    expect(useCartStore.getState().isLoading).toBe(true);

    resolveRevalidation(makeCart({ updatedAt: '2026-07-07T00:00:00.000Z' }));
    await firstFailure;
    expect(useCartStore.getState().isLoading).toBe(true);
    await expect(useCartStore.getState().updateItem('line-a', 3)).rejects.toThrow(
      'Cart mutation already in progress'
    );

    const afterRemove = makeCart({
      items: [makeItem({ id: 'line-a', quantity: 1, subtotal: '1000' })],
    });
    resolveSecond(afterRemove);
    await second;
    expect(useCartStore.getState().cart).toEqual(afterRemove);
    expect(useCartStore.getState().isLoading).toBe(false);
  });

  it('ignores an update response after the active cart is replaced', async () => {
    seedCart(makeCart());
    let resolveUpdate!: (cart: Cart) => void;
    updateItemMock.mockReturnValueOnce(
      new Promise<Cart>((resolve) => {
        resolveUpdate = resolve;
      })
    );

    const update = useCartStore.getState().updateItem('line-a', 2);
    const replacement = makeCart({ id: 'cart-2', updatedAt: '2026-07-08T00:00:00.000Z' });
    useCartStore.setState({ cartId: replacement.id, cart: replacement });
    resolveUpdate(makeCart({ updatedAt: '2026-07-09T00:00:00.000Z' }));
    await update;

    expect(useCartStore.getState().cartId).toBe('cart-2');
    expect(useCartStore.getState().cart).toEqual(replacement);
  });

  it('ignores rollback after the active cart is replaced', async () => {
    seedCart(makeCart());
    let rejectRemove!: (error: Error) => void;
    removeItemMock.mockReturnValueOnce(
      new Promise<Cart>((_resolve, reject) => {
        rejectRemove = reject;
      })
    );

    const remove = useCartStore.getState().removeItem('line-b');
    const failure = expect(remove).rejects.toThrow('remove failed');
    const replacement = makeCart({ id: 'cart-2', updatedAt: '2026-07-10T00:00:00.000Z' });
    useCartStore.setState({ cartId: replacement.id, cart: replacement });
    rejectRemove(new Error('remove failed'));
    await failure;

    expect(getMock).not.toHaveBeenCalled();
    expect(useCartStore.getState().cartId).toBe('cart-2');
    expect(useCartStore.getState().cart).toEqual(replacement);
  });

  it('reconciles the live cart when only the mutated line returns NotFound', async () => {
    seedCart(makeCart());
    updateItemMock.mockRejectedValueOnce(new NotFoundError('Cart not found'));
    const reconciled = makeCart({
      items: [makeItem({ id: 'line-b', quantity: 2, subtotal: '1000' })],
      updatedAt: '2026-07-11T00:00:00.000Z',
    });
    getMock.mockResolvedValueOnce(reconciled);

    await expect(useCartStore.getState().updateItem('line-a', 2)).rejects.toThrow(
      'Cart not found'
    );

    expect(getMock).toHaveBeenCalledWith('cart-1');
    expect(useCartStore.getState().cartId).toBe('cart-1');
    expect(useCartStore.getState().cart).toEqual(reconciled);
    expect(useCartStore.getState().isLoading).toBe(false);
  });

  it('clears cart state when mutation and cart revalidation both return NotFound', async () => {
    seedCart(makeCart());
    removeItemMock.mockRejectedValueOnce(new NotFoundError('Line not found'));
    getMock.mockRejectedValueOnce(new NotFoundError('Cart not found'));

    await expect(useCartStore.getState().removeItem('line-a')).rejects.toThrow(
      'Line not found'
    );

    expect(getMock).toHaveBeenCalledWith('cart-1');
    expect(useCartStore.getState().cartId).toBeNull();
    expect(useCartStore.getState().cart).toBeNull();
    expect(useCartStore.getState().isLoading).toBe(false);
  });
});

describe('clearCart', () => {
  it('nulls cartId and cart immediately after successful checkout', () => {
    seedCart(makeCart());
    expect(useCartStore.getState().cartId).toBe('cart-1');

    useCartStore.getState().clearCart();

    expect(useCartStore.getState().cartId).toBeNull();
    expect(useCartStore.getState().cart).toBeNull();
    expect(useCartStore.getState().isLoading).toBe(false);
  });
});
