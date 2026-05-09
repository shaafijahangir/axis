/**
 * TypeORM Data Source Configuration for CLI
 *
 * WHY: TypeORM CLI needs a separate DataSource configuration to run
 * migrations outside of the NestJS application context.
 *
 * USAGE:
 *   pnpm migration:generate -- src/database/migrations/MigrationName
 *   pnpm migration:run
 *   pnpm migration:revert
 *
 * PATTERN: This file exports a DataSource instance that the CLI can use
 * directly. It reads from environment variables (or .env file via dotenv).
 */

import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Import entities array - same source as app.module.ts
import { entities } from './entities';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'Axis',
  schema: process.env.DATABASE_SCHEMA || 'public',
  entities,
  migrations: ['src/database/migrations/*.ts'],
  // IMPORTANT: Never use synchronize in production
  // Migrations handle schema changes safely
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

// Export DataSource instance for TypeORM CLI
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
