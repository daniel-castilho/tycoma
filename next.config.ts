import type { NextConfig } from "next";

const s3Base = process.env.S3_PUBLIC_BASE_URL ?? "http://localhost:4566/tycoma-media";
const s3Url = new URL(s3Base);
const s3Port = s3Url.port ? { port: s3Url.port } : {};

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const isProduction = process.env.NODE_ENV === "production";
const isHttps = appUrl.startsWith("https://");

const cspDirectives = [
  "default-src 'self'",
  "img-src 'self' data: blob: " + s3Url.origin,
  "media-src 'self' " + s3Url.origin,
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' " + s3Url.origin,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders: Array<{ key: string; value: string }> = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // CSP ships as Report-Only in Phase A so the admin UI is not blocked by
  // an over-strict directive. Tighten to enforce in a follow-up.
  { key: "Content-Security-Policy-Report-Only", value: cspDirectives },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

if (isProduction && isHttps) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: s3Url.protocol === "https:" ? "https" : "http",
        hostname: s3Url.hostname,
        ...s3Port,
      },
    ],
    dangerouslyAllowSVG: false,
    // The S3 origin runs on localhost (LocalStack) in the dev environment; the
    // default SSRF guard would block image optimization for it. Production uses
    // a public S3 origin, so this flag is a no-op there.
    dangerouslyAllowLocalIP: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Phase C: isolate the admin origin from cross-window references. The
      // public site is unaffected (it does not depend on same-origin window
      // handles for ads, OAuth popups, etc.). If a future flow needs to relax
      // this, scope the override to a single path — do not remove COOP
      // globally.
      {
        source: "/admin/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;