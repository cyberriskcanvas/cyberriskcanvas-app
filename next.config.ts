import type { NextConfig } from "next";

// Security headers (CSP, HSTS, X-Frame-Options, etc.) are intentionally not set here.
// They must be configured at the reverse proxy level (Traefik middleware or nginx headers).
const nextConfig: NextConfig = {
  // Remove the X-Powered-By: Next.js header to reduce fingerprinting surface
  poweredByHeader: false,
};

export default nextConfig;
