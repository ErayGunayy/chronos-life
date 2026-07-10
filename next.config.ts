import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Security headers for the public launch (CLAUDE.md web/security). The app has
 * no dangerouslySetInnerHTML and no eval, and all data flows through same-origin
 * /api routes or Supabase, so the policy below is tight while staying compatible
 * with Next's inline bootstrap.
 *
 * script-src still allows 'unsafe-inline': a nonce-based script-src (generated
 * in middleware) is the stricter follow-up. Dev additionally needs 'unsafe-eval'
 * and websockets for HMR — added only in development, never shipped to prod.
 * microphone is deliberately allowed (=self) because voice capture (§5.8.3)
 * uses the Web Speech API; camera/geolocation stay off.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${
    isDev ? " ws://localhost:* http://localhost:*" : ""
  }`,
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(self), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
