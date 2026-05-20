import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * SPRINT-7: Baseline marker — represents the schema that was already
 * applied to the dev/demo database via `synchronize: true` runs across
 * Sprints 0–7. From this point forward:
 *
 *   - synchronize is OFF in production (NODE_ENV=production)
 *   - dev still synchronizes by default (so the local DB stays current
 *     while iterating on entities). Set DATABASE_SYNCHRONIZE=false to
 *     disable in dev too.
 *   - every entity change must ship with a generated migration:
 *
 *       npm run migration:generate -- src/database/migrations/<Name>
 *       npm run migration:run
 *
 *   - on first prod deploy: run `migration:run` against an empty DB.
 *     The TypeORM schema-create logic inside `synchronize` will not
 *     execute — only explicit migrations.
 *
 * This file is intentionally empty: at the time it was generated, the
 * entities and the DB were already in sync. Future migrations are
 * diffed against this checkpoint.
 */
export class BaselineSchema1779256553650 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {
    // intentionally empty — baseline marker only
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // intentionally empty
  }
}
