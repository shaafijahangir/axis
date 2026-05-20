// T3-003: Sentry must be initialized before any other imports
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    profilesSampleRate: 0.1,
    beforeSend(event) {
      // Strip PII from breadcrumbs — no student emails or names in error reports
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter(
          (b) => !b.message?.match(/email|password|token/i),
        );
      }
      return event;
    },
  });
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';

/**
 * SPRINT-7: Refuse to boot in production if JWT_SECRET still has the
 * example placeholder value. Catches the "shipped the example .env to
 * prod" failure mode at startup instead of at first auth attempt.
 */
const KNOWN_INSECURE_SECRETS = new Set([
  'your-secret-key-change-in-production',
  'changeme',
  'secret',
]);

function assertSecureJwtSecret(): void {
  if (process.env.NODE_ENV !== 'production') return;
  const secret = process.env.JWT_SECRET ?? '';
  if (!secret || KNOWN_INSECURE_SECRETS.has(secret.toLowerCase())) {
    throw new Error(
      'JWT_SECRET is missing or set to a known insecure value. Refusing to boot in production.',
    );
  }
  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET is shorter than 32 characters. Refusing to boot in production.',
    );
  }
}

const isProduction = process.env.NODE_ENV === 'production';

const winstonLogger = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: false }),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(
              ({ level, message, timestamp }) =>
                `${timestamp} ${level}: ${message}`,
            ),
          ),
    }),
  ],
});

async function bootstrap() {
  assertSecureJwtSecret();

  const app = await NestFactory.create(AppModule, { logger: winstonLogger });
  const configService = app.get(ConfigService);

  // SPRINT-7: helmet sets sensible security headers (CSP, X-Frame-Options,
  // X-Content-Type-Options, Strict-Transport-Security, etc). Loosen CSP a
  // bit in dev so the GraphQL Playground / Apollo Sandbox still works.
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cookie parser middleware (must be before CORS)
  app.use(cookieParser());

  // CORS configuration — restrict to the configured frontend origin only
  app.enableCors({
    origin: configService.get<string>('app.frontendUrl'),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix(configService.get<string>('app.apiPrefix') || 'api');

  const port = configService.get<number>('app.port') ?? 3001;
  await app.listen(port);
  app.get(ConfigService); // ensure config is initialized before logging
  winstonLogger.log(
    `Application running on port ${port} [${process.env.NODE_ENV ?? 'development'}]`,
    'Bootstrap',
  );
}
void bootstrap();
