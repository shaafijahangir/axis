import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Degree programs versioned per catalog year.
 *
 * - degree_programs unique (tenantId, code) -> (tenantId, code, catalogYear),
 *   so the 2020 and 2026 worksheets of one program can coexist.
 * - student_degree_profiles.catalogYear int: the calendar year whose rules
 *   the student follows. Null means use enrollmentYear.
 */
export class DegreeProgramCatalogVersions1784840000000 implements MigrationInterface {
  name = 'DegreeProgramCatalogVersions1784840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_ba63f191eaaf766956d3f4489f"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_degree_programs_tenant_code_catalog" ON "degree_programs" ("tenantId", "code", "catalogYear") `,
    );
    await queryRunner.query(
      `ALTER TABLE "student_degree_profiles" ADD COLUMN IF NOT EXISTS "catalogYear" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The old (tenantId, code) index cannot hold several catalog versions.
    // Refuse rather than delete program rows (profiles point at them).
    const dupes: { tenantId: string; code: string }[] = await queryRunner.query(
      `SELECT "tenantId", "code" FROM "degree_programs" GROUP BY "tenantId", "code" HAVING COUNT(*) > 1`,
    );
    if (dupes.length > 0) {
      throw new Error(
        `Cannot revert DegreeProgramCatalogVersions: ${dupes.length} program code(s) have several catalog versions (${dupes
          .map((d) => d.code)
          .join(', ')}). Merge or delete the extra versions first.`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "student_degree_profiles" DROP COLUMN IF EXISTS "catalogYear"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_degree_programs_tenant_code_catalog"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ba63f191eaaf766956d3f4489f" ON "degree_programs" ("tenantId", "code") `,
    );
  }
}
