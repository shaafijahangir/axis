import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  apiPrefix: process.env.API_PREFIX || 'api',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  // Auth-cookie SameSite policy. Default: 'strict' in production, 'lax' in
  // dev. Deployments where the frontend and backend live on different
  // registrable domains (e.g. *.onrender.com, which is on the Public Suffix
  // List) MUST set COOKIE_SAMESITE=none or the browser never sends the
  // cookie back. 'none' forces Secure (HTTPS-only).
  cookieSameSite: process.env.COOKIE_SAMESITE as
    | 'strict'
    | 'lax'
    | 'none'
    | undefined,
}));
