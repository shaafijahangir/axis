import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Fail the production build when NEXT_PUBLIC_API_URL is missing. Every API
 * consumer silently falls back to `http://localhost:3001`, so without this
 * guard a misconfigured prod build would compile cleanly and then ship a
 * frontend pointed at localhost — broken for every real user. We only enforce
 * it for the production build phase so local dev keeps its localhost default.
 */
if (
  process.env.NEXT_PHASE === "phase-production-build" &&
  !process.env.NEXT_PUBLIC_API_URL
) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required for production builds. Set it (e.g. https://api.yourdomain.com/api) before running `next build`. See .env.example.",
  );
}

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withSentryConfig(nextConfig, {
  // Only upload source maps when SENTRY_AUTH_TOKEN and SENTRY_ORG are set
  silent: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
  // Automatically instrument server components and API routes
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  // Suppress the "No SENTRY_AUTH_TOKEN" warning in dev — maps upload is optional
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
