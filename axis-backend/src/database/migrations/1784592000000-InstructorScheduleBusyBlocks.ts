import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FEAT-019: Instructor schedule management — busy_blocks table.
 *
 * Recurring weekly unavailability (research time, meetings) that suppresses
 * bookable office-hour slots without the instructor editing their blocks.
 *
 * Hand-written in the OfficeHoursBooking migration's style. The dayOfWeek
 * column reuses the existing "office_hour_blocks_dayofweek_enum" type (the
 * entity pins it via enumName), so no new enum type is created here.
 *
 * SAFETY: dev/CI databases already have this table from synchronize, so the
 * hasTable guard records the migration as run without touching anything.
 */
export class InstructorScheduleBusyBlocks1784592000000 implements MigrationInterface {
  name = 'InstructorScheduleBusyBlocks1784592000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('busy_blocks')) {
      return;
    }

    await queryRunner.query(
      `CREATE TABLE "busy_blocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "instructorId" uuid NOT NULL, "dayOfWeek" "public"."office_hour_blocks_dayofweek_enum" NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "label" character varying(128), CONSTRAINT "PK_busy_blocks" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_busy_blocks_tenantId" ON "busy_blocks" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_busy_blocks_instructorId" ON "busy_blocks" ("instructorId") `,
    );

    await queryRunner.query(
      `ALTER TABLE "busy_blocks" ADD CONSTRAINT "FK_busy_blocks_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "busy_blocks" ADD CONSTRAINT "FK_busy_blocks_instructorId" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "busy_blocks" DROP CONSTRAINT "FK_busy_blocks_instructorId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "busy_blocks" DROP CONSTRAINT "FK_busy_blocks_tenantId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_busy_blocks_instructorId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_busy_blocks_tenantId"`);
    await queryRunner.query(`DROP TABLE "busy_blocks"`);
    // The dayOfWeek enum type belongs to OfficeHoursBooking1784570000000 —
    // not dropped here.
  }
}
