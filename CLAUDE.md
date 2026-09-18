# CLAUDE.md - Acme Store Storefront

This is the Acme Store e-commerce storefront, built on the Aimee platform from the
storefront-starter template. ("Acme Store" is placeholder branding -- replace it
with your own store name.)

## Working rules

- Prefer configuration and content over code. Products, pages, theming, and store
  settings are managed through the Aimee admin and CMS. Only write code when the
  platform cannot express the requirement.
- Use the `aimee` MCP server (provided by the `aimee` Claude Code plugin, or the
  project `.mcp.json` if the plugin is not installed) for platform docs, SDK method
  lookups, and store operations.
- Template updates come from the `upstream` git remote (storefront-starter). Keep
  this repo's diff against the template as small as possible.
- Don't work around platform bugs in the storefront. If the SDK or API is missing
  something or misbehaving, treat it as a platform issue to report rather than papering
  over it with storefront-side hacks.

---

## What This Project Is

A customer-facing Next.js storefront built on Aimee:
- Product catalog (browsing, search, filtering)
- CMS content (blog, pages, landing pages via @aimee.shop/blocks)
- Cart and checkout (customer-authenticated)
- Customer accounts

Default branding is "Acme Store" -- replace it with your own brand.

---

## Development Commands

```bash
npm run dev          # Start dev server (localhost:3010)
npm run build        # Production build
npm run start        # Run production build (localhost:3010)
npm run lint         # Run ESLint
```

Default Next.js bundler (Turbopack). Do not pass `--webpack` or stub Node
builtins for the SDK. Client cart/checkout must import `@aimee.shop/sdk/storefront`;
if a Node builtin (`readline`, `fs`) fails the build, the leak is a wrong
SDK entry or the SDK import graph -- not a webpack fallback.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: Tailwind CSS 4 + shadcn/ui + Radix UI (NO MUI)
- **State**: RSC-first (server components fetch via the SDK); no client state libraries yet
- **API**: @aimee.shop/sdk (API key auth for server, Cognito for customer auth)
- **CMS Rendering**: @aimee.shop/blocks (block renderers + CSS theming)
- **Font**: Geist (via next/font)

---

## Architecture

### Auth Model

Everything flows through the SDK. One Cognito pool for both admin and customers.

- **Server-side (RSC)**: SDK initialized with an API key (identifies the tenant)
- **Client-side**: Customer authenticates via Cognito -> JWT for cart/checkout
- **API key role**: "Storefront (Default)"

### SDK Integration

Server-side SDK (for RSC data fetching):
```typescript
import { sdk } from '@/lib/sdk';
const products = await sdk.products.list();
```

Browser SDK (for customer-authenticated operations):
```typescript
import { getStorefront } from '@/lib/storefront-client';
await getStorefront().carts.addItem(cartId, { variantId, quantity: 1 });
```

### @aimee.shop/blocks Integration

CMS content is rendered via the blocks library:
```typescript
import { BlockRenderer } from '@aimee.shop/blocks';
import '@aimee.shop/blocks/styles.css'; // imported once in layout.tsx

const entry = await sdk.cms.public.getContent('blog', slug);
<BlockRenderer blocks={entry.blocks} />
```

Theme customization via CSS custom properties in `app/globals.css`:
```css
:root {
  --zb-heading-color: #1F1F1F;
  --zb-cta-bg: #385CAD;
}
```

### Path Aliases
```typescript
import { sdk } from '@/lib/sdk';  // @/* maps to project root
```

---

## Environment Variables

See `.env.example` for the full list. Core variables:
```bash
NEXT_PUBLIC_CORE_API_URL=http://localhost:3000   # Core API URL (client + server)
NEXT_PUBLIC_STORE_ID=<your-store-id>             # Store context
AIMEE_API_KEY=<your-storefront-api-key>          # Server-only (do NOT prefix NEXT_PUBLIC_)
```

Optional / environment-specific:
```bash
NEXT_PUBLIC_AIMEE_ENV=local                      # omit or "production" for prod
NEXT_PUBLIC_AIMEE_COGNITO_USER_POOL_ID=          # required outside production
NEXT_PUBLIC_AIMEE_COGNITO_CLIENT_ID=
```

Create the API key in the admin under Settings > API Keys with the "Storefront (Default)" role.

SDK and blocks are installed from public npm (`@aimee.shop/sdk`, `@aimee.shop/blocks`).
No private registry token is required.

---

## shadcn/ui Component Usage

Use shadcn/ui for ALL interactive primitives. Do NOT build custom alternatives.

Installed components (in `components/ui/`):
- **Sheet**: Cart drawer, mobile navigation
- **Dialog**: Product quick view, confirmations
- **DropdownMenu**: Sort options, filter menus
- **Accordion**: Product details, FAQ sections
- **Tabs**: Product info sections (overview, reviews, specs)
- **NavigationMenu**: Desktop mega menu
- **Skeleton**: Loading states for async content
- **Badge**: Sale/new/out-of-stock indicators
- **Input + Label**: Checkout forms, auth forms
- **ScrollArea**: Filter sidebars, long lists
- **Popover**: Search suggestions, tooltips
- **Button**: All buttons and CTAs
- **Separator**: Visual dividers

The `cn()` utility (from `lib/utils.ts`) merges Tailwind classes conditionally:
```typescript
import { cn } from '@/lib/utils';
<div className={cn("p-4", isActive && "bg-primary text-primary-foreground")} />
```

---

## Critical Rules

- NO `any` types, NO `as any` casting, NO `@ts-ignore`
- Tailwind + shadcn/ui for all styling (no MUI, no CSS-in-JS, no CSS Modules)
- shadcn/ui for all interactive primitives (no custom dropdowns, modals, sheets)
- @aimee.shop/blocks for CMS content rendering (do not write custom block renderers)
- Mobile-first responsive design (every component must work at 375px)

---

## Key File Locations

```
app/layout.tsx              -- Root layout, Geist font, global CSS, theme injection
app/page.tsx                -- Homepage
app/error.tsx               -- Root error boundary (catalog/list fetch failures land here)
app/not-found.tsx           -- Global 404 page (detail pages map NotFoundError here)
app/globals.css             -- Tailwind + shadcn theme tokens + brand tokens + @aimee.shop/blocks theme
lib/config.ts               -- Central env access (server-only; sole process.env reader)
lib/sdk.ts                  -- Server-side SDK initialization
lib/store-config.ts         -- Store identity + theme settings fetch (300s data cache)
lib/theme.ts                -- Theme resolution, validation, CSS overrides
lib/utils.ts                -- cn() utility for conditional class merging
components/ui/              -- shadcn/ui components (auto-generated, do not manually edit)
components.json              -- shadcn/ui configuration
```

---

## Context7 Library IDs

- Tailwind CSS: `/tailwindlabs/tailwindcss`
- shadcn/ui: `/shadcn-ui/ui`
- Next.js: `/vercel/next.js`

---

## Aimee AI Toolkit (MCP)

The `aimee` MCP server is provided by the `aimee` Claude Code plugin. There is NO
project `.mcp.json` by default when the plugin is installed -- the `/aimee:scaffold`
skill removes it on detected collision (see aimee-claude-plugin 0.2.1). If cloned
WITHOUT the plugin, the starter's own `.mcp.json` still points at the same hosted
gateway, so it works standalone.

Available tools: `search_knowledge`, `get_sdk_method`, `get_type_definition`,
`get_setup_checklist`, `introspect_api`, `use_sdk`. There are no `login` /
`select_tenant` / `validate_launch_readiness` / `scaffold_starter` MCP tools -- older
docs that list them are stale. Launch validation and scaffolding are `aimee:*`
skills, not MCP tools.

Auth: Claude Code runs the OAuth browser flow on first tool use; run `/mcp` if it does
not prompt. The OAuth connection sets your tenant/store context, so `use_sdk` executes
SDK methods AS YOU, with your RBAC role (reads open, writes confirm, destructive
blocked). A "No tenant could be verified" error means the signed-in account is not yet
a member of the store's tenant -- create/join it in the admin dashboard, then retry.

## Deployed environments

- **Dev (template)**: Vercel project `storefront-starter-dev` --
  `https://storefront-starter-dev.vercel.app` (custom domain `store-dev.aimee.shop`
  when Cloudflare CNAME is set). API: `https://api-dev.aimee.shop`.
- Env vars: see `.env.example` and infrastructure `docs/storefront-dev-deploy.md`.
- Pushes to `development` deploy via the Vercel GitLab integration (production
  branch `development` on `storefront-starter-dev`). No CI deploy job or hook.
