import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  defaultModel: process.env.AI_DEFAULT_MODEL || 'claude-sonnet-4-20250514',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
  // Per-tenant rate limiting defaults
  rateLimits: {
    maxRequestsPerMinute: parseInt(process.env.AI_RATE_LIMIT_RPM || '30', 10),
    maxTokensPerDay: parseInt(
      process.env.AI_RATE_LIMIT_TOKENS_DAY || '500000',
      10,
    ),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
}));
