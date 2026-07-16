/**
 * Database Configuration
 *
 * WHY: Centralized database connection config with environment-based settings.
 *
 * IMPORTANT: synchronize is ALWAYS false. We use migrations for schema changes.
 * Using synchronize: true in production can cause data loss.
 *
 * PATTERN: Use migrationsRun: true to auto-run pending migrations on startup.
 * This is safe because migrations are idempotent (already-run migrations are skipped).
 */
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'Axis',
  schema: process.env.DATABASE_SCHEMA || 'public',
  // NEVER use synchronize: true with migrations - it can cause data loss
  synchronize: false,
  // Auto-run pending migrations on application startup
  migrationsRun: process.env.DATABASE_MIGRATIONS_RUN !== 'false',
  logging: process.env.NODE_ENV === 'development',
  // Managed Postgres providers (Render, Neon, RDS, ...) require TLS.
  // rejectUnauthorized: false because these providers terminate TLS with
  // certs that aren't in Node's default CA bundle.
  ssl: process.env.DATABASE_SSL === 'true',
}));
