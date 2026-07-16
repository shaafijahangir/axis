import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FEAT-018: Office-hours booking — office_hour_blocks + bookings tables.
 *
 * Hand-written (not `migration:generate`) because the worktree has no database
 * env configured and the dev DB is built by synchronize:true — generating
 * against it produces a noisy diff. This follows the BaselineSchema style.
 *
 * SAFETY (mirrors BaselineSchema): dev/CI databases already have these tables
 * from synchronize, so the hasTable guard records the migration as run without
 * touching anything. A migrations-only production database runs the full DDL.
 */
export class OfficeHoursBooking1784570000000 implements MigrationInterface {
  name = 'OfficeHoursBooking1784570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Schema already present (created by synchronize in dev/CI) — record the
    // migration as run without touching anything.
    if (await queryRunner.hasTable('office_hour_blocks')) {
      return;
    }

    // ─── office_hour_blocks ────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."office_hour_blocks_dayofweek_enum" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."office_hour_blocks_locationtype_enum" AS ENUM('in_person', 'zoom')`,
    );
    await queryRunner.query(
      `CREATE TABLE "office_hour_blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "instructorId" uuid NOT NULL, "dayOfWeek" "public"."office_hour_blocks_dayofweek_enum" NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "slotMinutes" integer NOT NULL DEFAULT '15', "locationType" "public"."office_hour_blocks_locationtype_enum" NOT NULL DEFAULT 'in_person', "location" character varying(128), "meetingUrl" character varying(512), "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_office_hour_blocks" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_office_hour_blocks_tenantId" ON "office_hour_blocks" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_office_hour_blocks_instructorId" ON "office_hour_blocks" ("instructorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_office_hour_blocks_instructor_active" ON "office_hour_blocks" ("instructorId", "active") `,
    );

    // ─── bookings ──────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_status_enum" AS ENUM('booked', 'cancelled', 'completed', 'no_show')`,
    );
    await queryRunner.query(
      `CREATE TABLE "bookings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "blockId" uuid NOT NULL, "studentId" uuid NOT NULL, "instructorId" uuid NOT NULL, "date" date NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "status" "public"."bookings_status_enum" NOT NULL DEFAULT 'booked', "note" character varying(500), CONSTRAINT "PK_bookings" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_tenantId" ON "bookings" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_studentId" ON "bookings" ("studentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_instructorId" ON "bookings" ("instructorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_date" ON "bookings" ("date") `,
    );
    // Backs the double-booking re-check in bookSlot() and the availability scan.
    await queryRunner.query(
      `CREATE INDEX "IDX_bookings_block_date_start" ON "bookings" ("blockId", "date", "startTime") `,
    );

    // ─── Foreign keys ──────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "office_hour_blocks" ADD CONSTRAINT "FK_office_hour_blocks_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "office_hour_blocks" ADD CONSTRAINT "FK_office_hour_blocks_instructorId" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_blockId" FOREIGN KEY ("blockId") REFERENCES "office_hour_blocks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_studentId" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_bookings_instructorId" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_instructorId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_studentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_blockId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_bookings_tenantId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "office_hour_blocks" DROP CONSTRAINT "FK_office_hour_blocks_instructorId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "office_hour_blocks" DROP CONSTRAINT "FK_office_hour_blocks_tenantId"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_bookings_block_date_start"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_date"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_instructorId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_studentId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bookings_tenantId"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_office_hour_blocks_instructor_active"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_office_hour_blocks_instructorId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_office_hour_blocks_tenantId"`,
    );
    await queryRunner.query(`DROP TABLE "office_hour_blocks"`);
    await queryRunner.query(
      `DROP TYPE "public"."office_hour_blocks_locationtype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."office_hour_blocks_dayofweek_enum"`,
    );
  }
}
