import { registerAs } from '@nestjs/config';

/**
 * LTI 1.3 Configuration
 *
 * WHY: LTI 1.3 uses OAuth 2.0 / OIDC for security. We need our own keypair
 * for signing JWTs, and we need to configure our tool endpoints.
 *
 * PATTERN: Use RS256 (asymmetric) for LTI JWTs so platforms can verify
 * our signatures using our public JWKS endpoint.
 */
export default registerAs('lti', () => ({
  // Tool configuration (Axis as an LTI Tool/Provider)
  toolUrl: process.env.LTI_TOOL_URL || 'http://localhost:3001',
  toolName: process.env.LTI_TOOL_NAME || 'Axis',

  // OIDC endpoints (relative paths, will be prefixed with toolUrl)
  loginPath: '/api/lti/login',
  launchPath: '/api/lti/launch',
  jwksPath: '/api/lti/.well-known/jwks.json',
  deepLinkPath: '/api/lti/deep-link',

  // JWT configuration
  // IMPORTANT: In production, generate a proper RSA keypair
  // and store in environment variables or secrets manager
  privateKey: process.env.LTI_PRIVATE_KEY || null,
  publicKey: process.env.LTI_PUBLIC_KEY || null,
  keyId: process.env.LTI_KEY_ID || 'Axis-lti-key-1',

  // State/nonce expiration (in seconds)
  stateExpiry: parseInt(process.env.LTI_STATE_EXPIRY || '600', 10), // 10 minutes
  nonceExpiry: parseInt(process.env.LTI_NONCE_EXPIRY || '3600', 10), // 1 hour

  // Deep linking configuration
  deepLinkingEnabled: process.env.LTI_DEEP_LINKING_ENABLED === 'true' || true,

  // Names and Roles Provisioning Service
  nrpsEnabled: process.env.LTI_NRPS_ENABLED === 'true' || true,

  // Assignment and Grade Services
  agsEnabled: process.env.LTI_AGS_ENABLED === 'true' || true,
}));
