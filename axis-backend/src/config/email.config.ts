import { registerAs } from '@nestjs/config';

/**
 * WHY Resend over SendGrid/SES: Developer-first API, better TypeScript support,
 * built for transactional email. Zero config needed beyond an API key.
 */
export default registerAs('email', () => ({
  resendApiKey: process.env.RESEND_API_KEY || '',
  fromAddress: process.env.EMAIL_FROM || 'Axis <noreply@Axis.app>',
  replyTo: process.env.EMAIL_REPLY_TO || '',
  // Set to false in production after verifying domain in Resend dashboard
  enabled: process.env.EMAIL_ENABLED !== 'false',
}));
