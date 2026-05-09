import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
