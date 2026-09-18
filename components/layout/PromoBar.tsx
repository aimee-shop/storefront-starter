import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { resolveSlot } from '@/lib/resolve-slot';

type PromoBarFields = {
  message: string;
  linkLabel?: string;
  linkHref?: string;
};

/** Static fallback when CMS promo-bar/default is missing (deploy-order free). */
const FALLBACK: PromoBarFields = {
  message: 'Free shipping on orders over $50',
  linkLabel: 'Shop now',
  linkHref: '/products',
};

/** CMS-controlled href: only relative paths and https URLs. */
function isSafeHref(href: string): boolean {
  return href.startsWith('/') || href.startsWith('https://');
}

function parsePromoFields(
  raw: Record<string, unknown> | undefined,
): PromoBarFields | null {
  const message =
    typeof raw?.message === 'string' ? raw.message.trim() : '';
  if (!message) return null;

  const linkLabel =
    typeof raw?.linkLabel === 'string' ? raw.linkLabel.trim() : '';
  const linkHref =
    typeof raw?.linkHref === 'string' ? raw.linkHref.trim() : '';

  const safePair =
    linkLabel && linkHref && isSafeHref(linkHref)
      ? { linkLabel, linkHref }
      : {};

  return {
    message,
    ...safePair,
  };
}

/**
 * Load promo-bar fields. Miss/outage -> FALLBACK. Suppress or a successful
 * CMS entry with empty message -> null (bar hidden). Cached on tag `cms`
 * so a missing entry does not hit core-api on every layout render.
 */
async function loadPromoFields(): Promise<PromoBarFields | null> {
  const resolved = await resolveSlot('promo-bar');
  if (resolved?.source === 'suppress') {
    return null;
  }
  if (resolved?.source === 'cms' && resolved.payload.kind === 'entry') {
    return parsePromoFields(resolved.payload.entry.fields);
  }
  return FALLBACK;
}

const getPromoFields = unstable_cache(loadPromoFields, ['promo-bar', 'default'], {
  revalidate: false,
  tags: ['cms'],
});

/**
 * Slim promo strip above the header. Reads CMS collection `promo-bar`
 * entry `default` (fields: message, linkLabel?, linkHref?). Any error
 * or missing entry renders the static fallback -- safe regardless of
 * core-api chrome seed / public-delivery deploy order. Explicitly empty
 * CMS message hides the bar.
 */
export async function PromoBar() {
  const fields = await getPromoFields();
  if (!fields) return null;

  const { message, linkLabel, linkHref } = fields;
  const showLink = Boolean(linkLabel && linkHref);

  return (
    <div
      role="region"
      aria-label="Promotion"
      className="bg-[var(--color-dark)] text-center text-sm text-white"
    >
      <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
        <p>
          {message}
          {showLink && linkLabel && linkHref ? (
            <>
              {' '}
              <Link
                href={linkHref}
                className="font-medium underline underline-offset-2 hover:text-gray-200"
              >
                {linkLabel}
              </Link>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
