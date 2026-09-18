import type { CSSProperties } from 'react';

export interface ReferenceBannerProps {
  config: { headline: string };
}

/** Reference signed storefront package block (fixture). */
export function ReferenceBanner({ config }: ReferenceBannerProps) {
  const style: CSSProperties = {
    padding: '1rem',
    border: '1px solid #ccc',
    borderRadius: 8,
  };
  return (
    <div data-app-package="reference-banner" style={style}>
      <p>{config.headline}</p>
    </div>
  );
}
