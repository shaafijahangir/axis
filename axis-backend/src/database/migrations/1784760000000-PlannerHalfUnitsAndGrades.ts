import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Planner: half-unit credits and per-course grades.
 *
 * - degree_programs.totalCreditsRequired int -> numeric(6,2), because UVic
 *   style programs count in 1.5-unit courses. Existing ints cast losslessly.
 * - student_degree_profiles.completedCourses jsonb [{courseId, grade}] so
 *   requirement groups can enforce a minimum grade. completedCourseIds stays
 *   as the membership list for backward compatibility.
 *
 * RequirementGroup.minGrade lives inside the requirements JSONB, no DDL needed.
 */
export class PlannerHalfUnitsAndGrades1784760000000 implements MigrationInterface {
  name = 'PlannerHalfUnitsAndGrades1784760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "degree_programs" ALTER COLUMN "totalCreditsRequired" TYPE numeric(6,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_degree_profiles" ADD COLUMN IF NOT EXISTS "completedCourses" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_degree_profiles" DROP COLUMN IF EXISTS "completedCourses"`,
    );
    await queryRunner.query(
      `ALTER TABLE "degree_programs" ALTER COLUMN "totalCreditsRequired" TYPE integer USING round("totalCreditsRequired")::integer`,
    );
  }
}
