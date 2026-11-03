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
  // PGlite (local comments database) loads its WebAssembly from its own folder: keep it unbundled.
  serverExternalPackages: ['@electric-sql/pglite'],
  // Routes that read the posts at request time (to check a comment's post, to name posts in
  // the moderation panel) need the Markdown files in their deployment.
  outputFileTracingIncludes: {
    '/api/comments': ['./content/blog/**/*.md'],
    '/admin/comentarios': ['./content/blog/**/*.md'],
  },
  // Security headers on every response (see src/lib/security-headers.ts).
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders(process.env.NODE_ENV === 'development') }];
  },
  // Portuguese is served at the root (the home and the blog); /pt only exists internally.
  async rewrites() {
    return [
      { source: '/', destination: '/pt' },
      { source: '/blog', destination: '/pt/blog' },
      { source: '/blog/:path*', destination: '/pt/blog/:path*' },
    ];
  },
  async redirects() {
    return [
      { source: '/pt', destination: '/', permanent: true },
      { source: '/pt/blog/:path*', destination: '/blog/:path*', permanent: true },
    ];
  },
};
export default config;
