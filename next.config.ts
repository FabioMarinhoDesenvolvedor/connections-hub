import { execSync } from 'node:child_process';
import type { NextConfig } from 'next';
import nextPackage from 'next/package.json' with { type: 'json' };
import { securityHeaders } from './src/lib/security-headers';

// Build stamp for the developer console (see components/console-greeting.tsx).
const commit = (() => {
  try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return 'local'; }
})();

const config: NextConfig = {
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
  env: {
    NEXT_PUBLIC_BUILD_COMMIT: commit,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_NEXT_VERSION: nextPackage.version,
  },
  // Security headers on every response (see src/lib/security-headers.ts).
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders(process.env.NODE_ENV === 'development') }];
  },
  // Portuguese is served at the root; /pt only exists internally.
  async rewrites() {
    return [{ source: '/', destination: '/pt' }];
  },
  async redirects() {
    return [{ source: '/pt', destination: '/', permanent: true }];
  },
};
export default config;
