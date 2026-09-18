import type { NextConfig } from 'next';

// CSP is owned by middleware.ts (per-request nonce on restricted paths);
// no static headers() here.
const nextConfig: NextConfig = {
  // Tree-shake lucide-react icon imports into per-icon modules.
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
