import type { NextConfig } from "next";

// Baseline security headers, applied app-side so deployments without a
// reverse proxy (e.g. the plain docker-compose setup) are not left bare.
// A full Content-Security-Policy is intentionally not set here - it needs
// per-request nonces to work with Next.js inline scripts and is better
// configured at the reverse proxy (Traefik middleware or nginx headers),
// which can also override any of the headers below.
const securityHeaders = [
  // Clickjacking: the app never needs to be framed by other origins.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Browsers only honor HSTS over HTTPS, so this is inert for local HTTP.
  { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  // Remove the X-Powered-By: Next.js header to reduce fingerprinting surface
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
