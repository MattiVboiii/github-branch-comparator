import type { NextConfig } from "next";

const cspValue = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://api.github.com https://github.com https://*.upstash.io",
].join("; ");

const securityHeaders = [
  // Prevent clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit referrer information sent to third parties
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: cspValue,
  },
  // Restrict browser feature access
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()",
  },
  // Enable HSTS (Vercel sets this too, but belt-and-suspenders)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
