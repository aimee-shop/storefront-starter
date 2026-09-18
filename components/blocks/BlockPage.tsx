'use client';

import { BlockRenderer } from '@aimee.shop/blocks';
import type { BlockRendererProps } from '@aimee.shop/blocks';

/**
 * Client wrapper for @aimee.shop/blocks BlockRenderer.
 *
 * The blocks library includes client components (Gallery, Accordion, Tabs)
 * that use React hooks. To import it from Server Components, we need this
 * thin 'use client' boundary. Server Components fetch the data, then pass
 * blocks/products to this component for rendering.
 */
export function StorefrontBlockRenderer(props: BlockRendererProps) {
  return <BlockRenderer {...props} />;
}
