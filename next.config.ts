import type { NextConfig } from "next";

const baseSecurityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
]

// Everything except /widget gets X-Frame-Options (no external framing).
const securityHeaders = [
  ...baseSecurityHeaders,
  { key: "X-Frame-Options", value: "SAMEORIGIN" }, // SAMEORIGIN (ikke DENY) — iframe i builder-preview
]

// /widget/* must be embeddable in the self-hosted Xibo signage iframe. We drop
// X-Frame-Options and allowlist only the Xibo origins via CSP frame-ancestors.
const XIBO_ORIGINS = "https://xibo.framtidtech.no http://157.180.73.205"
const widgetHeaders = [
  ...baseSecurityHeaders,
  { key: "Content-Security-Policy", value: `frame-ancestors 'self' ${XIBO_ORIGINS}` },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // All paths except /widget — negative lookahead keeps X-Frame-Options off /widget.
        source: "/((?!widget).*)",
        headers: securityHeaders,
      },
      {
        source: "/widget/:path*",
        headers: widgetHeaders,
      },
    ]
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/admin",
        permanent: false,
      },
    ]
  },
};

export default nextConfig;
