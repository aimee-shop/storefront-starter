import type { NextConfig } from 'next';

// CSP is owned by middleware.ts (per-request nonce on restricted paths);
// no static headers() here.
const nextConfig: NextConfig = {
  images: {
    // Aimee asset CDN, per platform env: dev / staging / production.
    remotePatterns: [
      { protocol: 'https', hostname: 'assets-dev.aimee.shop', pathname: '/**' },
      { protocol: 'https', hostname: 'assets-staging.aimee.shop', pathname: '/**' },
      { protocol: 'https', hostname: 'assets.aimee.shop', pathname: '/**' },
    ],
  },
  // Tree-shake lucide-react icon imports into per-icon modules.
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
