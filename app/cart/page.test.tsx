import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Cart, CartItem } from '@aimee.shop/sdk';

const updateItem = vi.fn();
const removeItem = vi.fn();
const refreshCart = vi.fn();

let storeState: {
  cart: Cart | null;
  cartId: string | null;
  _hasHydrated: boolean;
  updateItem: typeof updateItem;
  removeItem: typeof removeItem;
  refreshCart: typeof refreshCart;
};

vi.mock('@/stores/cart-store', () => ({
  useCartStore: (selector: (s: typeof storeState) => unknown) => selector(storeState),
}));

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import CartPage from '@/app/cart/page';

function makeItem(overrides: Partial<CartItem> & Pick<CartItem, 'id' | 'quantity' | 'title'>): CartItem {
  return {
    productId: 'prod-1',
    productVariantId: 'var-1',
    storeId: 'store-1',
    sku: 'SKU-1',
    productName: overrides.title,
    unitPrice: '1000',
    subtotal: '1000',
    requiresShipping: true,
    taxable: true,
    ...overrides,
  };
}

function makeCart(items: CartItem[]): Cart {
  return {
    id: 'cart-1',
    tenantId: 'tenant-1',
    storeId: 'store-1',
    status: 'active',
    items,
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
  };
}

beforeEach(() => {
  updateItem.mockReset();
  removeItem.mockReset();
  refreshCart.mockReset();
  refreshCart.mockResolvedValue(undefined);
  updateItem.mockResolvedValue(undefined);
  removeItem.mockResolvedValue(undefined);
  storeState = {
    cart: null,
    cartId: null,
    _hasHydrated: true,
    updateItem,
    removeItem,
    refreshCart,
  };
});

describe('CartPage', () => {
  it('shows a skeleton before hydration (no empty-cart flash)', () => {
    storeState._hasHydrated = false;
    const { container } = render(<CartPage />);
    expect(screen.queryByText('Your cart is empty.')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your Cart' })).not.toBeInTheDocument();
    // Skeleton blocks from CartSkeleton
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('renders empty state with Continue Shopping and disabled checkout', () => {
    render(<CartPage />);
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue Shopping' })).toHaveAttribute(
      'href',
      '/products'
    );
    const checkout = screen.getByRole('button', { name: 'Proceed to Checkout' });
    expect(checkout).toBeDisabled();
  });

  it('shows multi-item cart, qty/remove controls, and checkout link', () => {
    storeState.cartId = 'cart-1';
    storeState.cart = makeCart([
      makeItem({ id: 'line-a', quantity: 1, title: 'Alpha' }),
      makeItem({ id: 'line-b', quantity: 2, title: 'Beta', unitPrice: '500', subtotal: '1000' }),
    ]);

    render(<CartPage />);

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Proceed to Checkout' })).toHaveAttribute(
      'href',
      '/checkout'
    );
    expect(screen.getByLabelText('Increase quantity of Alpha')).toBeEnabled();
    expect(screen.getByLabelText('Remove Beta from cart')).toBeEnabled();
  });

  it('surfaces a per-row error when update fails and disables other rows while pending', async () => {
    const user = userEvent.setup();
    storeState.cartId = 'cart-1';
    storeState.cart = makeCart([
      makeItem({ id: 'line-a', quantity: 1, title: 'Alpha' }),
      makeItem({ id: 'line-b', quantity: 2, title: 'Beta' }),
    ]);

    let resolveUpdate!: () => void;
    updateItem.mockReturnValue(
      new Promise<void>((resolve, reject) => {
        resolveUpdate = () => reject(new Error('fail'));
      })
    );

    render(<CartPage />);

    await user.click(screen.getByLabelText('Increase quantity of Alpha'));

    expect(updateItem).toHaveBeenCalledWith('line-a', 2);
    // While pending, other row actions are disabled
    expect(screen.getByLabelText('Remove Beta from cart')).toBeDisabled();
    expect(screen.getByLabelText('Increase quantity of Beta')).toBeDisabled();

    resolveUpdate();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Could not update quantity. Please try again.'
      );
    });
    expect(screen.getByLabelText('Remove Beta from cart')).toBeEnabled();
  });

  it('surfaces a per-row error when remove fails', async () => {
    const user = userEvent.setup();
    storeState.cartId = 'cart-1';
    storeState.cart = makeCart([
      makeItem({ id: 'line-a', quantity: 1, title: 'Alpha' }),
      makeItem({ id: 'line-b', quantity: 1, title: 'Beta' }),
    ]);
    removeItem.mockRejectedValue(new Error('nope'));

    render(<CartPage />);
    await user.click(screen.getByLabelText('Remove Alpha from cart'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Could not remove item. Please try again.'
      );
    });
  });

  it('shows a soft refresh failure banner without crashing', async () => {
    storeState.cartId = 'cart-1';
    storeState.cart = makeCart([makeItem({ id: 'line-a', quantity: 1, title: 'Alpha' })]);
    refreshCart.mockRejectedValue(new Error('offline'));

    render(<CartPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Could not refresh cart totals. Showing the last saved cart.')
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
