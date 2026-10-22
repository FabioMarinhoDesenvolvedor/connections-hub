/*
  The site's security rules, in one place: next.config.ts sends them as response headers on
  every route, and the Security section shows (and encrypts) this same list as the code the
  visitor reads. Everything the page loads is served from its own origin (fonts included,
  self-hosted by next/font), so the policy can refuse every other origin.

  'unsafe-inline' stays for scripts and styles: the page is static, so per-request nonces are
  not available, and Next inlines its boot data. Other origins are still refused.
*/
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
] as const;

/** The headers sent with every response. `dev` adds what the development server needs. */
export function securityHeaders(dev = false) {
  const csp = dev ? CSP.map(rule => rule.startsWith('script-src') ? `${rule} 'unsafe-eval'` : rule) : [...CSP];
  return [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
    { key: 'Content-Security-Policy', value: [...csp, ...(dev ? [] : ['upgrade-insecure-requests'])].join('; ') },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}

/** The excerpt the Security section encrypts: the policy above, as it reads in code. */
export const CSP_SOURCE = ['// next.config.ts - CSP', 'const csp = [', ...CSP.map(rule => `  "${rule}",`), "].join('; ');"].join('\n');
