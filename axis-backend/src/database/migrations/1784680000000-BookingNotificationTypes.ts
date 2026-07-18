import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FEAT-020: three new values on the notifications type enum for the
 * office-hours booking lifecycle (confirmed / cancelled / reminder).
 *
 * ADD VALUE IF NOT EXISTS is idempotent, so this is safe on dev/CI databases
 * where synchronize already extended the enum, and on prod where it hasn't.
 * (Postgres ≥12 allows ALTER TYPE ... ADD VALUE inside a transaction as long
 * as the type wasn't created in the same transaction — ours predates this.)
 */
export class BookingNotificationTypes1784680000000 implements MigrationInterface {
  name = 'BookingNotificationTypes1784680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'booking_confirmed'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'booking_cancelled'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'booking_reminder'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres cannot remove enum values; rows using them would break anyway.
    // Intentional no-op.
  }
}
