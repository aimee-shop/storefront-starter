# storefront-starter

A customer-facing Next.js storefront starter built on the Aimee platform.
Copy it, point it at your store, and replace the "Acme Store" placeholder
branding with your own.

What you get:

- Product catalog: browsing, search, filtering, product detail pages
- CMS content: blog, pages, and landing pages rendered with `@aimee.shop/blocks`
- Cart and checkout, including Aimee Pay card payments
- Customer accounts (Cognito-backed sign-in, addresses, order history)
- App platform mounts for certified storefront packages and scripts

Stack: Next.js 16 (App Router), Tailwind CSS 4, shadcn/ui, `@aimee.shop/sdk` 0.0.2,
`@aimee.shop/blocks` 0.0.2.

Public artifact (anonymous, no GitLab invite or npm token):

- Repository: https://github.com/aimee-shop/storefront-starter
- Versioned tarball: https://github.com/aimee-shop/storefront-starter/archive/refs/tags/v0.1.0.tar.gz

GitLab `aimee.shop/storefront-starter` is the canonical Aimee development
repo and is private. Do not clone it unless you already have workspace access.

## Quick start

Copy the template (do not fork):

```bash
git clone --depth 1 https://github.com/aimee-shop/storefront-starter.git my-store
cd my-store
rm -rf .git
git init
git remote add upstream https://github.com/aimee-shop/storefront-starter.git
npm install
cp .env.example .env.local
```

Or unpack a tagged tarball:

```bash
curl -fsSL https://github.com/aimee-shop/storefront-starter/archive/refs/tags/v0.1.0.tar.gz | tar -xz
cd storefront-starter-0.1.0
```

`npm install` uses the public npm registry. No `NPM_TOKEN` and no private
registry. Dependencies are the published `@aimee.shop/sdk@0.0.2` and
`@aimee.shop/blocks@0.0.2` packages (no local tarballs, overrides, or
workspace artifacts). `@aimee.shop/sdk-platform` is the matching 0.0.2 pair
for optional live app-mount resolution (`APPS_MOUNT_SOURCE=sdk`) and is
not a required install.

Fill `.env.local` (see Configuration), then:

```bash
npm run dev
```

The dev server runs at http://localhost:3010.

With the Aimee Claude Code plugin installed, `/aimee:scaffold` can do this
copy-and-configure step once it is pointed at the public URL above.

## Configuration

Copy `.env.example` to `.env.local`. Required:

```bash
NEXT_PUBLIC_CORE_API_URL=https://api-dev.aimee.shop   # explicit API base URL
NEXT_PUBLIC_STORE_ID=<your-store-id>
AIMEE_API_KEY=<sk-key>                                # server-only, never NEXT_PUBLIC_
NEXT_PUBLIC_AIMEE_PUBLISHABLE_KEY=<pk-key>            # browser-safe
```

Pass the API URL explicitly. The starter does not depend on sdk#6 environment
resolution.

### Secret key vs publishable key

These are two different credentials. Never paste `AIMEE_API_KEY` into a
`NEXT_PUBLIC_*` variable, a client component, or a public git repo.

- `AIMEE_API_KEY` (`sk_...`): server-only. Create with the **Storefront (Default)**
  role. Checkout finalization and PaymentIntent create need `checkout:complete`
  and `payments:process` on this key (the Default preset includes them).
  `lib/config.ts` is `server-only` so this value cannot import into client code.
- `NEXT_PUBLIC_AIMEE_PUBLISHABLE_KEY` (`pk_test_...` / `pk_live_...`): browser
  cart and pre-payment checkout. Create with the **Storefront Publishable**
  role. A `pk_` key cannot call `checkout.complete`.

### Admin handoff (current)

In the Aimee admin: **Settings > API Keys > Create storefront key set**.
That mints the paired sk/pk keys for your store and shows a one-time `.env`
block. A human copies those values into `.env.local` or the host's env UI.
Do not paste secrets into an agent chat. Automated scoped mint (core-api#31)
is not shipped; this starter does not pretend that it is.

Optional variables (site URL, Cognito pool for non-production, payments
service URL, app script allowlists, sandbox noindex) are documented in
`.env.example`.

## Local preview

```bash
cp .env.example .env.local
# paste store id + keys from the admin key-set screen
npm run dev          # http://localhost:3010
npx tsc --noEmit
npm test
```

The homepage should render the store shell. Catalog, cart, and test checkout
need a sandbox store with products and a test-mode payment processor. This
is a preview against your sandbox, not a production launch.

## Vercel (one secure path)

Use **your** Vercel account. Do not attach this copy to Aimee's
`storefront-starter-dev` project or reuse Acme keys.

1. Push `my-store` to a git remote you own (GitHub/GitLab).
2. Vercel: Add New Project > import that repo. Framework: Next.js. Install
   `npm ci`, build `npm run build`. Node 24.x.
3. Project Settings > Environment Variables (Production + Preview):

   - `NEXT_PUBLIC_CORE_API_URL` -- your API origin (for example `https://api-dev.aimee.shop`)
   - `NEXT_PUBLIC_STORE_ID` -- store UUID
   - `NEXT_PUBLIC_SITE_URL` -- this deployment origin (`https://...vercel.app` or your domain)
   - `NEXT_PUBLIC_AIMEE_PUBLISHABLE_KEY` -- `pk_` value (not sensitive as a secret, still store-scoped)
   - `AIMEE_API_KEY` -- `sk_` value, marked **Sensitive**
   - `NEXT_PUBLIC_NOINDEX=true` -- required for sandbox/preview so crawlers stay off
   - Cognito pool/client id when not on production Aimee

4. Deploy. Confirm you (not Aimee) own the Vercel project.
5. Open `/`, load a product, add to cart, complete a **test-mode** checkout
   only. Do not capture live cards or treat this URL as production.

Leave `NEXT_PUBLIC_NOINDEX=true` until the store is a real production host
with `NEXT_PUBLIC_AIMEE_ENV=production` (or unset) and noindex turned off.
CSP, checkout/account restrictions, and theming are unchanged from the
template; do not disable them for a preview.

## Commands

```bash
npm run dev          # Start dev server (localhost:3010)
npm run build        # Verify app packages, then production build
npm run start        # Run the production build
npm run lint         # ESLint
npm test             # Vitest unit tests
npm run e2e          # Playwright end-to-end tests
npm run pack:release:check   # Public archive exclusions + secret scan
```

## Theming

Demo colors live in `app/globals.css` (brand tokens) with matching defaults
in `lib/theme.ts`. Merchant theme settings from the Aimee admin override
them at runtime, including the header logo and favicon. The demo Aimee
lockups and default OG card ship in `public/brand/`. Merchant branding
overrides remain unchanged.

## Keeping up with the template

Copy-per-merchant, not a required GitHub fork. Keep `upstream` pointing at
the public template and merge **tagged releases** so your store-specific
diff stays small:

```bash
git remote add upstream https://github.com/aimee-shop/storefront-starter.git
git fetch upstream --tags
git merge v0.1.0
```

Do not open pull requests on the GitHub copy. Aimee develops on GitLab.

## Docs

Preview docs host: https://docs-dev.aimee.shop

The canonical `https://docs.aimee.shop` host is a separate launch/DNS gate
and may not resolve yet. Signup and production API DNS are also separate
gates. This template is usable against a reachable API URL with keys from
admin; it is not proof that production onboarding is live.
