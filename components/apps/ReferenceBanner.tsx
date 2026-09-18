export interface ReferenceBannerProps {
  config: { headline: string };
}

/**
 * Host-side renderer for the reference signed package export.
 * Package contract is verified under fixtures/apps/packages/reference-signed;
 * runtime uses this allowlisted host component + validated config only.
 */
export function ReferenceBanner({ config }: ReferenceBannerProps) {
  return (
    <div
      data-app-package="reference-banner"
      className="rounded-lg border border-border bg-card p-4 text-card-foreground"
    >
      <p className="text-sm font-medium">{config.headline}</p>
    </div>
  );
}
