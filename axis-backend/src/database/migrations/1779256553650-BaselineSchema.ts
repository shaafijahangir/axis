import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline schema — full DDL generated from the entity definitions
 * (2026-06-11) against an empty database.
 *
 * HISTORY: This migration originally shipped as an empty "marker" while dev
 * relied on synchronize:true. That left a fresh production database with NO
 * way to get a schema (synchronize is off in prod, and the marker created
 * nothing). The up() now contains the real schema so `migration:run` against
 * an empty DB produces a complete, correct database.
 *
 * SAFETY:
 * - Databases that already recorded this migration (existing dev DBs) never
 *   re-run it — TypeORM skips recorded migrations by name.
 * - Databases built by synchronize (CI, fresh dev) hit the hasTable guard
 *   below and skip the DDL instead of colliding with existing tables.
 * - Truly empty databases (first prod deploy) run the full DDL.
 */
export class BaselineSchema1779256553650 implements MigrationInterface {
  name = 'BaselineSchema1779256553650';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Schema already present (created by synchronize in dev/CI) — record
    // the migration as run without touching anything.
    if (await queryRunner.hasTable('users')) {
      return;
    }

    // uuid_generate_v4() lives in uuid-ossp; a brand-new database does
    // not have it loaded.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "public"."users_roles_enum" AS ENUM('student', 'instructor', 'admin', 'parent', 'ta')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended', 'pending')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "email" character varying NOT NULL, "passwordHash" character varying, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "roles" "public"."users_roles_enum" array NOT NULL DEFAULT '{student}', "profile" jsonb, "preferences" jsonb, "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "lastLoginAt" TIMESTAMP, "googleId" character varying, "resetToken" character varying, "resetTokenExpiry" TIMESTAMP WITH TIME ZONE, "gradeLevel" integer, "homeroomTeacherId" uuid, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d007658e942bc8eab9cff63928" ON "users" ("homeroomTeacherId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e4798214580fee9882b92f9d43" ON "users" ("gradeLevel") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7346b08032078107fce81e014f" ON "users" ("email", "tenantId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c58f7e88c286e5e3478960a998" ON "users" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."parent_students_relationship_enum" AS ENUM('parent', 'guardian', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "parent_students" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "parentId" uuid NOT NULL, "studentId" uuid NOT NULL, "relationship" "public"."parent_students_relationship_enum" NOT NULL DEFAULT 'parent', CONSTRAINT "PK_2707b9be03fad93515167debe7a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d7c9a214501c7c4f7a892930de" ON "parent_students" ("parentId", "studentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e5eaa6a5814ca0b7add6c47b90" ON "parent_students" ("studentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d75bfe2068e448c910ba129611" ON "parent_students" ("parentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cad3b6229f37d8cfb2c3941432" ON "parent_students" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenants_subscriptionplan_enum" AS ENUM('free', 'basic', 'professional', 'enterprise')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."tenants_billingstatus_enum" AS ENUM('active', 'past_due', 'suspended', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "domain" character varying NOT NULL, "subdomain" character varying NOT NULL, "settings" jsonb, "subscriptionPlan" "public"."tenants_subscriptionplan_enum" NOT NULL DEFAULT 'free', "billingStatus" "public"."tenants_billingstatus_enum" NOT NULL DEFAULT 'active', CONSTRAINT "UQ_32731f181236a46182a38c992a8" UNIQUE ("name"), CONSTRAINT "UQ_da4054294eaae43ec7f85b6a3a1" UNIQUE ("domain"), CONSTRAINT "UQ_21bb89e012fa5b58532009c1601" UNIQUE ("subdomain"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."file_uploads_context_enum" AS ENUM('assignment_submission', 'assignment_instructions', 'profile_picture', 'course_content', 'import_document')`,
    );
    await queryRunner.query(
      `CREATE TABLE "file_uploads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "key" character varying NOT NULL, "originalName" character varying NOT NULL, "mimeType" character varying NOT NULL, "size" integer NOT NULL, "context" "public"."file_uploads_context_enum" NOT NULL, "contextId" character varying, "uploadedById" uuid NOT NULL, "confirmed" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_b3ebfc99a8b660f0bc64a052b42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9be61740ee528d2f71c1697e57" ON "file_uploads" ("context", "contextId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_81af9cdc39f64dbeac126b005d" ON "file_uploads" ("uploadedById") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b17c68bf6f92cd9bb77a4d56b" ON "file_uploads" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "academic_terms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "name" character varying NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "isCurrent" boolean NOT NULL DEFAULT false, "enrollmentWindowStart" TIMESTAMP, "enrollmentWindowEnd" TIMESTAMP, "dropDeadline" TIMESTAMP, "withdrawDeadline" TIMESTAMP, "settings" jsonb, CONSTRAINT "PK_1440ed092c70addfe5d5257e364" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6c6f874a8baae1757ac7eed543" ON "academic_terms" ("tenantId", "isCurrent") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8a492c4e3fb55ee0ff255ea708" ON "academic_terms" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."courses_category_enum" AS ENUM('core', 'elective', 'general_education', 'lab', 'seminar')`,
    );
    await queryRunner.query(
      `CREATE TABLE "courses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "code" character varying NOT NULL, "title" character varying NOT NULL, "description" text, "credits" numeric(4,2), "departmentId" character varying, "category" "public"."courses_category_enum", "courseLevel" integer, "offeredSemesters" jsonb, "prerequisiteCourseIds" jsonb, "corequisiteCourseIds" jsonb, "prerequisites" jsonb, "settings" jsonb, CONSTRAINT "PK_3f70a487cc718ad8eda4e6d58c9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_95b51eb9e386e595cd408fd9bd" ON "courses" ("courseLevel") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1ac2924c6479e5fa4fc5d1eec9" ON "courses" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2a26294560102d94bc4c67ecfe" ON "courses" ("departmentId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5367f2afd01117ea5a5f11f621" ON "courses" ("tenantId", "code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_61c9baadf12783792db0161320" ON "courses" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."course_sections_enrollmentmode_enum" AS ENUM('open', 'invite_only')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."course_sections_status_enum" AS ENUM('draft', 'active', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "course_sections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "courseId" uuid NOT NULL, "termId" uuid NOT NULL, "instructorId" uuid NOT NULL, "meetingDays" text array NOT NULL DEFAULT '{}', "startTime" TIME, "endTime" TIME, "room" character varying(64), "schedule" jsonb, "location" character varying, "capacity" integer, "enrollmentMode" "public"."course_sections_enrollmentmode_enum" NOT NULL DEFAULT 'open', "inviteCode" character varying(6), "autoApprove" boolean NOT NULL DEFAULT true, "status" "public"."course_sections_status_enum" NOT NULL DEFAULT 'draft', CONSTRAINT "PK_03086ef0602f2721612a5ce610d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ee450adc679c23644107f7d10c" ON "course_sections" ("termId", "instructorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bcdd1b5944c0eb925784f550a2" ON "course_sections" ("enrollmentMode") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f60ebb96e34051d16da7ca1579" ON "course_sections" ("termId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_71374d26b78c712e1cb77bca51" ON "course_sections" ("instructorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_86cf0cbf22034eea0ec79ab7ab" ON "course_sections" ("courseId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."enrollments_role_enum" AS ENUM('student', 'ta', 'observer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."enrollments_status_enum" AS ENUM('pending', 'active', 'completed', 'dropped', 'withdrawn', 'waitlisted', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "enrollments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "userId" uuid NOT NULL, "sectionId" uuid NOT NULL, "role" "public"."enrollments_role_enum" NOT NULL DEFAULT 'student', "status" "public"."enrollments_status_enum" NOT NULL DEFAULT 'active', "enrolledAt" TIMESTAMP NOT NULL, "completedAt" TIMESTAMP, "finalGrade" character varying(2), "waitlistPosition" integer, "waitlistConfirmBy" TIMESTAMP, CONSTRAINT "PK_7c0f752f9fb68bf6ed7367ab00f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3816714ab4c719d70e6b848744" ON "enrollments" ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ce27d2681a45b6f4797b92b234" ON "enrollments" ("userId", "sectionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e0edac70a2adb9b921a8437bfa" ON "enrollments" ("sectionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_de33d443c8ae36800c37c58c92" ON "enrollments" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7cedad2b122aa289b15691a6e7" ON "enrollments" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."assignments_type_enum" AS ENUM('assignment', 'quiz', 'exam', 'discussion', 'project')`,
    );
    await queryRunner.query(
      `CREATE TABLE "assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "sectionId" uuid NOT NULL, "moduleId" character varying, "title" character varying NOT NULL, "description" text, "type" "public"."assignments_type_enum" NOT NULL DEFAULT 'assignment', "pointsPossible" numeric(10,2) NOT NULL, "dueAt" TIMESTAMP, "unlockAt" TIMESTAMP, "lockAt" TIMESTAMP, "rubric" jsonb, "settings" jsonb, "maxAttempts" integer, "timeLimitMinutes" integer, "displayMode" character varying DEFAULT 'all_at_once', CONSTRAINT "PK_c54ca359535e0012b04dcbd80ee" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_83606a3578b34afae3476b9efa" ON "assignments" ("dueAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dfb1935b711a420d68429ff713" ON "assignments" ("sectionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17243441128671c88362a0a7cc" ON "assignments" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "submissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "assignmentId" uuid NOT NULL, "userId" uuid NOT NULL, "attempt" integer NOT NULL DEFAULT '1', "content" jsonb, "submittedAt" TIMESTAMP, "score" numeric(10,2), "gradedAt" TIMESTAMP, "gradedBy" character varying, "feedback" text, "answers" jsonb, "autoScore" numeric(10,2), "startedAt" TIMESTAMP, CONSTRAINT "PK_10b3be95b8b2fb1e482e07d706b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_769e57960012a2f9b973c6491e" ON "submissions" ("assignmentId", "userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eae888413ab8fc63cc48759d46" ON "submissions" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c2611c601f49945ceff5c0909a" ON "submissions" ("assignmentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0fd585abacd4e0c53ea6578d97" ON "submissions" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."announcements_scope_enum" AS ENUM('section', 'grade', 'school_wide')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."announcements_priority_enum" AS ENUM('normal', 'urgent')`,
    );
    await queryRunner.query(
      `CREATE TABLE "announcements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "sectionId" uuid, "scope" "public"."announcements_scope_enum" NOT NULL DEFAULT 'section', "targetGrade" integer, "authorId" uuid NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "priority" "public"."announcements_priority_enum" NOT NULL DEFAULT 'normal', "pinned" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_b3ad760876ff2e19d58e05dc8b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c6c63fdba98f637c468bdedaf5" ON "announcements" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb02e7ee3bb4dfffa79ebfeb38" ON "announcements" ("scope") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4ee0ed876f66ec56aa62bbe691" ON "announcements" ("sectionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_29f5be1631fdc08ce2ad6a9c03" ON "announcements" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."attendance_status_enum" AS ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "attendance" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "sectionId" uuid NOT NULL, "userId" uuid NOT NULL, "date" date NOT NULL, "status" "public"."attendance_status_enum" NOT NULL, "notes" character varying(255), CONSTRAINT "PK_ee0ffe42c1f1a01e72b725c0cb2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1e3d8b11ea5204a3c8dcc43397" ON "attendance" ("sectionId", "userId", "date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f59153ebcb27e4b1b2ab098a11" ON "attendance" ("userId", "tenantId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e834473f94ac1ef83e9e1e795c" ON "attendance" ("sectionId", "date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_180d196307c19bf2f3adcf04dc" ON "attendance" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."report_cards_status_enum" AS ENUM('DRAFT', 'PUBLISHED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "report_cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "studentId" uuid NOT NULL, "sectionId" uuid NOT NULL, "termId" uuid NOT NULL, "status" "public"."report_cards_status_enum" NOT NULL DEFAULT 'DRAFT', "teacherComment" text, "finalGrade" character varying(2), "gradeSummary" jsonb, "attendanceSummary" jsonb, "publishedAt" TIMESTAMP, CONSTRAINT "PK_ad580db1af279fb14a78f4eb274" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_870314f53522b79d909bfe073a" ON "report_cards" ("studentId", "sectionId", "termId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b040e1f56c30c3f26d9a59f65" ON "report_cards" ("studentId", "tenantId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5ec17cfc7822e6d398b7d639fd" ON "report_cards" ("sectionId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_060ad419c691fd5f45ea693ced" ON "report_cards" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."degree_programs_programtype_enum" AS ENUM('major', 'minor', 'certificate', 'diploma')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."degree_programs_status_enum" AS ENUM('active', 'archived', 'draft')`,
    );
    await queryRunner.query(
      `CREATE TABLE "degree_programs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "name" character varying(200) NOT NULL, "code" character varying(20) NOT NULL, "department" character varying, "description" text, "programType" "public"."degree_programs_programtype_enum", "totalCreditsRequired" integer NOT NULL, "expectedDurationSemesters" integer, "catalogYear" character varying(9), "requirements" jsonb NOT NULL DEFAULT '[]', "status" "public"."degree_programs_status_enum" NOT NULL DEFAULT 'draft', CONSTRAINT "PK_8f2a6d6acadd5335efec7dc0f42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ba63f191eaaf766956d3f4489f" ON "degree_programs" ("tenantId", "code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a6f1ee0e5bcc3acb32266eb42" ON "degree_programs" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."student_degree_profiles_status_enum" AS ENUM('active', 'on_leave', 'graduated', 'withdrawn')`,
    );
    await queryRunner.query(
      `CREATE TABLE "student_degree_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "userId" uuid NOT NULL, "degreeProgramId" uuid NOT NULL, "enrollmentYear" integer NOT NULL, "expectedGraduationYear" integer, "completedCourseIds" jsonb NOT NULL DEFAULT '[]', "currentCourseIds" jsonb NOT NULL DEFAULT '[]', "status" "public"."student_degree_profiles_status_enum" NOT NULL DEFAULT 'active', "notes" text, CONSTRAINT "PK_fa4578a0e156830b822de290498" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2c58aa4b0392b2e1d0e6e7af0f" ON "student_degree_profiles" ("tenantId", "userId", "degreeProgramId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb408ba78b4e67d160e20be7f6" ON "student_degree_profiles" ("degreeProgramId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ede32978bd53eb101d8e80085a" ON "student_degree_profiles" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_962423bb4c01c5dfcbbf80085e" ON "student_degree_profiles" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ai_conversations_status_enum" AS ENUM('active', 'closed', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "userId" uuid NOT NULL, "agentType" character varying NOT NULL, "courseId" uuid, "status" "public"."ai_conversations_status_enum" NOT NULL DEFAULT 'active', "contextSnapshot" jsonb, CONSTRAINT "PK_60db12765b82858ba00c8aa4ae2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d392a9bee27e6de55ab4cda367" ON "ai_conversations" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_38a66d41ffe49d8d3e22b0ec20" ON "ai_conversations" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fc52f001fec42b3d7d8d247081" ON "ai_conversations" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ai_messages_role_enum" AS ENUM('user', 'assistant', 'system', 'tool_call', 'tool_result')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversationId" uuid NOT NULL, "role" "public"."ai_messages_role_enum" NOT NULL, "content" text NOT NULL, "toolCalls" jsonb, "toolResults" jsonb, "tokenCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a390434d4a515ba18a41bc996c2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4dc0ba82778135333d4b5a0734" ON "ai_messages" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed5a9d697a9b12f88d6cab2316" ON "ai_messages" ("conversationId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "ai_usage_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "userId" uuid NOT NULL, "agentType" character varying NOT NULL, "conversationId" uuid, "inputTokens" integer NOT NULL, "outputTokens" integer NOT NULL, "estimatedCostUsd" numeric(10,6) NOT NULL, "model" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7f42670987a1de5cb209a77e925" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87f5cddbcd402ecfff2cc6bc2f" ON "ai_usage_logs" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_95540e2816ce80527c6e86b97d" ON "ai_usage_logs" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_46bf6d423181f639ab0cadcba2" ON "ai_usage_logs" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tenant_ai_configs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "toolOverrides" jsonb NOT NULL DEFAULT '{}', "maxRequestsPerMinute" integer, "maxTokensPerDay" integer, "monthlyBudgetUsd" numeric(10,2), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ba63b8f4d81ffb8521d06d56c24" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_af36dd02656890b7e2e21726b0" ON "tenant_ai_configs" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "custom_agents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "slug" character varying(100) NOT NULL, "displayName" character varying(100) NOT NULL, "description" text NOT NULL, "systemPrompt" text NOT NULL, "tools" jsonb NOT NULL DEFAULT '[]', "allowedRoles" jsonb NOT NULL DEFAULT '["student"]', "maxTurns" integer NOT NULL DEFAULT '10', "model" character varying NOT NULL DEFAULT 'claude-sonnet-4-20250514', "isActive" boolean NOT NULL DEFAULT true, "courseId" uuid, "createdById" uuid NOT NULL, CONSTRAINT "PK_75f2ab4b43c8577a4257115b6bd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0da2e726913dab9f6c994857b2" ON "custom_agents" ("tenantId", "slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eff953059197356dd516ffa7ae" ON "custom_agents" ("createdById") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_addd820e2be21dc2c1645b4628" ON "custom_agents" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "course_contents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sectionId" uuid NOT NULL, "tenantId" uuid NOT NULL, "authorId" uuid NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "publishedAt" TIMESTAMP, "position" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e56de21b785ba03619207ce8f58" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_59a06b9754ce46a8a28e53cd2b" ON "course_contents" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5427da338e8dd89275cfa6ca31" ON "course_contents" ("sectionId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "conversation_participants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversationId" uuid NOT NULL, "userId" uuid NOT NULL, "lastReadAt" TIMESTAMP, "joinedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e43efbfa3b850160b5b2c50e3ec" UNIQUE ("conversationId", "userId"), CONSTRAINT "PK_61b51428ad9453f5921369fbe94" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4453e20858b14ab765a09ad728" ON "conversation_participants" ("conversationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_18c4ba3b127461649e5f5039db" ON "conversation_participants" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "direct_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conversationId" uuid NOT NULL, "senderId" uuid NOT NULL, "content" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8373c1bb93939978ef05ae650d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c80940d0a25034a392176543e4" ON "direct_messages" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6cc4e96821d3e38549665b0ac3" ON "direct_messages" ("conversationId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "title" character varying, CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b4c6967d118be0f2483aee3804" ON "conversations" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "career_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "title" character varying(200) NOT NULL, "category" character varying(100) NOT NULL, "description" text, "medianSalaryMin" integer, "medianSalaryMax" integer, "requiredSkills" jsonb NOT NULL DEFAULT '[]', "recommendedDegreeIds" jsonb NOT NULL DEFAULT '[]', "recommendedCourseIds" jsonb NOT NULL DEFAULT '[]', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_46df357ae46b2e66524657a7cb9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_534a317f0b09c0f71c49ba30be" ON "career_profiles" ("tenantId", "isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2523f094f95511212843827c12" ON "career_profiles" ("tenantId", "category") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."graduation_plans_status_enum" AS ENUM('draft', 'active', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "graduation_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "userId" character varying NOT NULL, "profileId" character varying NOT NULL, "degreeProgramId" character varying NOT NULL, "status" "public"."graduation_plans_status_enum" NOT NULL DEFAULT 'draft', "constraints" jsonb NOT NULL, "semesters" jsonb NOT NULL DEFAULT '[]', "totalSemesters" integer NOT NULL DEFAULT '0', "estimatedGraduationTerm" character varying(20) NOT NULL, "estimatedGraduationYear" integer NOT NULL, "totalCreditsPlanned" numeric(8,2) NOT NULL DEFAULT '0', "totalCreditsCompleted" numeric(8,2) NOT NULL DEFAULT '0', "overallCompletionPercentage" numeric(5,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_a93fde36076207f42b782198380" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_367c2caabb06259e1bb1fa9c43" ON "graduation_plans" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b69ad02f943de4649a38344bbe" ON "graduation_plans" ("profileId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_faee305ce75912752586a4e0f0" ON "graduation_plans" ("tenantId", "userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "lti_deployments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "platform_id" uuid NOT NULL, "deployment_id" character varying NOT NULL, "label" character varying, "isActive" boolean NOT NULL DEFAULT true, "services" jsonb, CONSTRAINT "PK_4fad585ac0c411e2c08136bced5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3724573b1684458db47cfc7ced" ON "lti_deployments" ("platform_id", "deployment_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3605f1f8ffee1a64835b6454ed" ON "lti_deployments" ("platform_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_855d4c1abfd611d56d5c4fb845" ON "lti_deployments" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lti_platforms_status_enum" AS ENUM('active', 'inactive', 'pending')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lti_platforms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "name" character varying NOT NULL, "issuer" character varying NOT NULL, "clientId" character varying NOT NULL, "authorizationEndpoint" character varying NOT NULL, "tokenEndpoint" character varying NOT NULL, "jwksEndpoint" character varying NOT NULL, "status" "public"."lti_platforms_status_enum" NOT NULL DEFAULT 'pending', "metadata" jsonb, CONSTRAINT "PK_d4c8406fcb347bf7b1fc8a12441" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35e9062a49ee79f150630293c1" ON "lti_platforms" ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e173db3b4ea66af1de0db708f3" ON "lti_platforms" ("tenantId", "issuer", "clientId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ffbcce00d37538911c44b9c3a0" ON "lti_platforms" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "lti_contexts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "deployment_id" uuid NOT NULL, "context_id" character varying NOT NULL, "contextType" character varying, "title" character varying, "label" character varying, "section_id" uuid, "isLinked" boolean NOT NULL DEFAULT false, "services" jsonb, CONSTRAINT "PK_7e424c25e79ee5b3a1cedf2fc25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3fee80933fd1aa080ef6181116" ON "lti_contexts" ("section_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ec7890b04b30251fc5fa8b7dd7" ON "lti_contexts" ("deployment_id", "context_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92a5af4bb3dd8813f3ebd9b3f4" ON "lti_contexts" ("deployment_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b17ceb3fcc2e1a99eff04e2ec7" ON "lti_contexts" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "lti_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "platform_id" uuid NOT NULL, "lti_user_id" character varying NOT NULL, "user_id" uuid NOT NULL, "email" character varying, "name" character varying, "ltiRoles" jsonb, "last_launch_at" TIMESTAMP, CONSTRAINT "PK_da6575bbbda8017b197cb674efc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9993d1f3d8c94b2298d7628849" ON "lti_users" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_981ba0bef55cdc2bc4a72c5cd9" ON "lti_users" ("platform_id", "lti_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b5288e8a27e03db0ba63034c40" ON "lti_users" ("platform_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19e286614b369eaec36e0c7543" ON "lti_users" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "lti_states" ("state" character varying NOT NULL, "platform_id" character varying NOT NULL, "tenant_id" character varying NOT NULL, "nonce" character varying NOT NULL, "target_link_uri" character varying, "login_hint" character varying, "lti_message_hint" text, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_72886b2fbbae8a31fd2589aa969" PRIMARY KEY ("state"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_27a3f85911f86515be132f7c57" ON "lti_states" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."feed_engagements_eventtype_enum" AS ENUM('click', 'impression', 'dismiss')`,
    );
    await queryRunner.query(
      `CREATE TABLE "feed_engagements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "userId" uuid NOT NULL, "eventType" "public"."feed_engagements_eventtype_enum" NOT NULL, "feedItemType" character varying NOT NULL, "feedItemId" character varying NOT NULL, "courseCode" character varying, "sectionId" uuid, "dwellTimeMs" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_759cc1a15e52338dde7675e8ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4f32ce533c066fc7b1fd14be5f" ON "feed_engagements" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4a7791013af78bef478070d11e" ON "feed_engagements" ("userId", "feedItemType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0cd49f0d658f13169c7b0455cf" ON "feed_engagements" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_21138f83dc4077586fc3a4808e" ON "feed_engagements" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('submission_graded', 'assignment_created', 'enrollment_confirmed', 'due_date_reminder', 'new_message', 'announcement', 'discussion_reply', 'discussion_mention', 'system')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "userId" character varying NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "data" jsonb, "read" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_21e65af2f4f242d4c85a92aff4" ON "notifications" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d60c47e715847c8aa792ba6d1e" ON "notifications" ("userId", "read") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d5b86bc522af7cc9e3e13960ff" ON "notifications" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."device_tokens_platform_enum" AS ENUM('web', 'ios', 'android')`,
    );
    await queryRunner.query(
      `CREATE TABLE "device_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "userId" character varying NOT NULL, "platform" "public"."device_tokens_platform_enum" NOT NULL, "token" text NOT NULL, "lastUsedAt" TIMESTAMP, CONSTRAINT "PK_84700be257607cfb1f9dc2e52c3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_511957e3e8443429dc3fb00120" ON "device_tokens" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_73b09363a7d6b7c33a1a294af8" ON "device_tokens" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "discussions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "sectionId" character varying NOT NULL, "authorId" uuid NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "isPinned" boolean NOT NULL DEFAULT false, "isLocked" boolean NOT NULL DEFAULT false, "isAnswered" boolean NOT NULL DEFAULT false, "replyCount" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_4b3d110d8e5d9077ddc0a0d1b4c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf5b23d7b198412dda419c7309" ON "discussions" ("authorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_baea5e3e7c2c13a4ea3b6295f6" ON "discussions" ("sectionId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b8c87169eedda808be9c8b2cdb" ON "discussions" ("sectionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_433f7ba80d890d890a316e38c6" ON "discussions" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "discussion_replies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "discussionId" character varying NOT NULL, "authorId" uuid NOT NULL, "parentReplyId" character varying, "body" text NOT NULL, "isInstructorAnswer" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_4edf52f48af13c113eb7b1bb518" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_989b8ad8a5ba0bfd0092301117" ON "discussion_replies" ("authorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0a9cb513bbf6832054303ccba8" ON "discussion_replies" ("discussionId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6aad4e719e04df8260b690a88b" ON "discussion_replies" ("discussionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b983855ca788411854d5adcaa5" ON "discussion_replies" ("tenantId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."quiz_questions_questiontype_enum" AS ENUM('multiple_choice', 'true_false', 'short_answer')`,
    );
    await queryRunner.query(
      `CREATE TABLE "quiz_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "assignmentId" character varying NOT NULL, "questionText" text NOT NULL, "questionType" "public"."quiz_questions_questiontype_enum" NOT NULL, "options" jsonb, "points" numeric(10,2) NOT NULL, "order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_ec0447fd30d9f5c182e7653bfd3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_80c09aa0f259609b6128accd34" ON "quiz_questions" ("assignmentId", "order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_29d89f2e836c141d0388ca7721" ON "quiz_questions" ("assignmentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2c98df0e229b0ede6f1668f306" ON "quiz_questions" ("tenantId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_c58f7e88c286e5e3478960a998b" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_d007658e942bc8eab9cff63928b" FOREIGN KEY ("homeroomTeacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parent_students" ADD CONSTRAINT "FK_cad3b6229f37d8cfb2c39414320" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parent_students" ADD CONSTRAINT "FK_d75bfe2068e448c910ba1296116" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parent_students" ADD CONSTRAINT "FK_e5eaa6a5814ca0b7add6c47b90c" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" ADD CONSTRAINT "FK_3b17c68bf6f92cd9bb77a4d56b7" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" ADD CONSTRAINT "FK_81af9cdc39f64dbeac126b005d2" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "academic_terms" ADD CONSTRAINT "FK_8a492c4e3fb55ee0ff255ea7085" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD CONSTRAINT "FK_61c9baadf12783792db01613201" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_sections" ADD CONSTRAINT "FK_86cf0cbf22034eea0ec79ab7ab3" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_sections" ADD CONSTRAINT "FK_f60ebb96e34051d16da7ca15794" FOREIGN KEY ("termId") REFERENCES "academic_terms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_sections" ADD CONSTRAINT "FK_71374d26b78c712e1cb77bca511" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD CONSTRAINT "FK_7cedad2b122aa289b15691a6e74" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD CONSTRAINT "FK_de33d443c8ae36800c37c58c929" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" ADD CONSTRAINT "FK_e0edac70a2adb9b921a8437bfa7" FOREIGN KEY ("sectionId") REFERENCES "course_sections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD CONSTRAINT "FK_17243441128671c88362a0a7ccb" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD CONSTRAINT "FK_dfb1935b711a420d68429ff7134" FOREIGN KEY ("sectionId") REFERENCES "course_sections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_0fd585abacd4e0c53ea6578d974" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_c2611c601f49945ceff5c0909a2" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "FK_eae888413ab8fc63cc48759d46a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD CONSTRAINT "FK_29f5be1631fdc08ce2ad6a9c034" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD CONSTRAINT "FK_4ee0ed876f66ec56aa62bbe691c" FOREIGN KEY ("sectionId") REFERENCES "course_sections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" ADD CONSTRAINT "FK_92d72877cc8c092c83f37c62752" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance" ADD CONSTRAINT "FK_180d196307c19bf2f3adcf04dc6" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance" ADD CONSTRAINT "FK_3f926e47900bab693840a58f579" FOREIGN KEY ("sectionId") REFERENCES "course_sections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance" ADD CONSTRAINT "FK_466e85b813d871bfb693f443528" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_cards" ADD CONSTRAINT "FK_060ad419c691fd5f45ea693cedb" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_cards" ADD CONSTRAINT "FK_435d59076f1c15d98035b7cd1dd" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_cards" ADD CONSTRAINT "FK_d09df0be6023073dd4c5b3a7964" FOREIGN KEY ("sectionId") REFERENCES "course_sections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_cards" ADD CONSTRAINT "FK_3aac028a5b97cc2784528054656" FOREIGN KEY ("termId") REFERENCES "academic_terms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "degree_programs" ADD CONSTRAINT "FK_9a6f1ee0e5bcc3acb32266eb42d" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_degree_profiles" ADD CONSTRAINT "FK_962423bb4c01c5dfcbbf80085e8" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_degree_profiles" ADD CONSTRAINT "FK_ede32978bd53eb101d8e80085a1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_degree_profiles" ADD CONSTRAINT "FK_cb408ba78b4e67d160e20be7f6c" FOREIGN KEY ("degreeProgramId") REFERENCES "degree_programs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversations" ADD CONSTRAINT "FK_fc52f001fec42b3d7d8d2470816" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversations" ADD CONSTRAINT "FK_38a66d41ffe49d8d3e22b0ec208" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversations" ADD CONSTRAINT "FK_ccbe75137832c6bfeddf77514a1" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_messages" ADD CONSTRAINT "FK_ed5a9d697a9b12f88d6cab23169" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "FK_46bf6d423181f639ab0cadcba23" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "FK_95540e2816ce80527c6e86b97d2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "FK_8cde1bfa0a47c082fde867ff0c8" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_ai_configs" ADD CONSTRAINT "FK_af36dd02656890b7e2e21726b0c" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_agents" ADD CONSTRAINT "FK_addd820e2be21dc2c1645b46286" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_agents" ADD CONSTRAINT "FK_ce8456b759dc006fd90d4072314" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_agents" ADD CONSTRAINT "FK_eff953059197356dd516ffa7aec" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_contents" ADD CONSTRAINT "FK_5427da338e8dd89275cfa6ca319" FOREIGN KEY ("sectionId") REFERENCES "course_sections"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_contents" ADD CONSTRAINT "FK_59a06b9754ce46a8a28e53cd2b2" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_contents" ADD CONSTRAINT "FK_f1b3f68dd7cbb34ce2ce4c9be25" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "FK_4453e20858b14ab765a09ad728c" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" ADD CONSTRAINT "FK_18c4ba3b127461649e5f5039dbf" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "direct_messages" ADD CONSTRAINT "FK_6cc4e96821d3e38549665b0ac3b" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "direct_messages" ADD CONSTRAINT "FK_7aedd4c96c0e01b95b87b8cea5a" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_b4c6967d118be0f2483aee38047" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_profiles" ADD CONSTRAINT "FK_444fa3e79b490ea4b6c2177bd4a" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "graduation_plans" ADD CONSTRAINT "FK_daa11e9a6079ecce9c7913bed97" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_deployments" ADD CONSTRAINT "FK_855d4c1abfd611d56d5c4fb8450" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_deployments" ADD CONSTRAINT "FK_3605f1f8ffee1a64835b6454ed3" FOREIGN KEY ("platform_id") REFERENCES "lti_platforms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_platforms" ADD CONSTRAINT "FK_ffbcce00d37538911c44b9c3a04" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_contexts" ADD CONSTRAINT "FK_b17ceb3fcc2e1a99eff04e2ec72" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_contexts" ADD CONSTRAINT "FK_92a5af4bb3dd8813f3ebd9b3f4e" FOREIGN KEY ("deployment_id") REFERENCES "lti_deployments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_contexts" ADD CONSTRAINT "FK_3fee80933fd1aa080ef61811165" FOREIGN KEY ("section_id") REFERENCES "course_sections"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_users" ADD CONSTRAINT "FK_19e286614b369eaec36e0c7543f" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_users" ADD CONSTRAINT "FK_b5288e8a27e03db0ba63034c400" FOREIGN KEY ("platform_id") REFERENCES "lti_platforms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_users" ADD CONSTRAINT "FK_9993d1f3d8c94b2298d7628849e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "feed_engagements" ADD CONSTRAINT "FK_21138f83dc4077586fc3a4808e8" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "feed_engagements" ADD CONSTRAINT "FK_0cd49f0d658f13169c7b0455cf2" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_d5b86bc522af7cc9e3e13960ffb" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" ADD CONSTRAINT "FK_73b09363a7d6b7c33a1a294af8e" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "discussions" ADD CONSTRAINT "FK_433f7ba80d890d890a316e38c64" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "discussions" ADD CONSTRAINT "FK_bf5b23d7b198412dda419c7309d" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "discussion_replies" ADD CONSTRAINT "FK_b983855ca788411854d5adcaa53" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "discussion_replies" ADD CONSTRAINT "FK_989b8ad8a5ba0bfd00923011176" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_questions" ADD CONSTRAINT "FK_2c98df0e229b0ede6f1668f306c" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quiz_questions" DROP CONSTRAINT "FK_2c98df0e229b0ede6f1668f306c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discussion_replies" DROP CONSTRAINT "FK_989b8ad8a5ba0bfd00923011176"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discussion_replies" DROP CONSTRAINT "FK_b983855ca788411854d5adcaa53"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discussions" DROP CONSTRAINT "FK_bf5b23d7b198412dda419c7309d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discussions" DROP CONSTRAINT "FK_433f7ba80d890d890a316e38c64"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_tokens" DROP CONSTRAINT "FK_73b09363a7d6b7c33a1a294af8e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_d5b86bc522af7cc9e3e13960ffb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feed_engagements" DROP CONSTRAINT "FK_0cd49f0d658f13169c7b0455cf2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feed_engagements" DROP CONSTRAINT "FK_21138f83dc4077586fc3a4808e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_users" DROP CONSTRAINT "FK_9993d1f3d8c94b2298d7628849e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_users" DROP CONSTRAINT "FK_b5288e8a27e03db0ba63034c400"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_users" DROP CONSTRAINT "FK_19e286614b369eaec36e0c7543f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_contexts" DROP CONSTRAINT "FK_3fee80933fd1aa080ef61811165"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_contexts" DROP CONSTRAINT "FK_92a5af4bb3dd8813f3ebd9b3f4e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_contexts" DROP CONSTRAINT "FK_b17ceb3fcc2e1a99eff04e2ec72"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_platforms" DROP CONSTRAINT "FK_ffbcce00d37538911c44b9c3a04"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_deployments" DROP CONSTRAINT "FK_3605f1f8ffee1a64835b6454ed3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lti_deployments" DROP CONSTRAINT "FK_855d4c1abfd611d56d5c4fb8450"`,
    );
    await queryRunner.query(
      `ALTER TABLE "graduation_plans" DROP CONSTRAINT "FK_daa11e9a6079ecce9c7913bed97"`,
    );
    await queryRunner.query(
      `ALTER TABLE "career_profiles" DROP CONSTRAINT "FK_444fa3e79b490ea4b6c2177bd4a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_b4c6967d118be0f2483aee38047"`,
    );
    await queryRunner.query(
      `ALTER TABLE "direct_messages" DROP CONSTRAINT "FK_7aedd4c96c0e01b95b87b8cea5a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "direct_messages" DROP CONSTRAINT "FK_6cc4e96821d3e38549665b0ac3b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_18c4ba3b127461649e5f5039dbf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_participants" DROP CONSTRAINT "FK_4453e20858b14ab765a09ad728c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_contents" DROP CONSTRAINT "FK_f1b3f68dd7cbb34ce2ce4c9be25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_contents" DROP CONSTRAINT "FK_59a06b9754ce46a8a28e53cd2b2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_contents" DROP CONSTRAINT "FK_5427da338e8dd89275cfa6ca319"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_agents" DROP CONSTRAINT "FK_eff953059197356dd516ffa7aec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_agents" DROP CONSTRAINT "FK_ce8456b759dc006fd90d4072314"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_agents" DROP CONSTRAINT "FK_addd820e2be21dc2c1645b46286"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tenant_ai_configs" DROP CONSTRAINT "FK_af36dd02656890b7e2e21726b0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_usage_logs" DROP CONSTRAINT "FK_8cde1bfa0a47c082fde867ff0c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_usage_logs" DROP CONSTRAINT "FK_95540e2816ce80527c6e86b97d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_usage_logs" DROP CONSTRAINT "FK_46bf6d423181f639ab0cadcba23"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_messages" DROP CONSTRAINT "FK_ed5a9d697a9b12f88d6cab23169"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversations" DROP CONSTRAINT "FK_ccbe75137832c6bfeddf77514a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversations" DROP CONSTRAINT "FK_38a66d41ffe49d8d3e22b0ec208"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_conversations" DROP CONSTRAINT "FK_fc52f001fec42b3d7d8d2470816"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_degree_profiles" DROP CONSTRAINT "FK_cb408ba78b4e67d160e20be7f6c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_degree_profiles" DROP CONSTRAINT "FK_ede32978bd53eb101d8e80085a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_degree_profiles" DROP CONSTRAINT "FK_962423bb4c01c5dfcbbf80085e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "degree_programs" DROP CONSTRAINT "FK_9a6f1ee0e5bcc3acb32266eb42d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_cards" DROP CONSTRAINT "FK_3aac028a5b97cc2784528054656"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_cards" DROP CONSTRAINT "FK_d09df0be6023073dd4c5b3a7964"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_cards" DROP CONSTRAINT "FK_435d59076f1c15d98035b7cd1dd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_cards" DROP CONSTRAINT "FK_060ad419c691fd5f45ea693cedb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance" DROP CONSTRAINT "FK_466e85b813d871bfb693f443528"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance" DROP CONSTRAINT "FK_3f926e47900bab693840a58f579"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendance" DROP CONSTRAINT "FK_180d196307c19bf2f3adcf04dc6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP CONSTRAINT "FK_92d72877cc8c092c83f37c62752"`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP CONSTRAINT "FK_4ee0ed876f66ec56aa62bbe691c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "announcements" DROP CONSTRAINT "FK_29f5be1631fdc08ce2ad6a9c034"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_eae888413ab8fc63cc48759d46a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_c2611c601f49945ceff5c0909a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "submissions" DROP CONSTRAINT "FK_0fd585abacd4e0c53ea6578d974"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP CONSTRAINT "FK_dfb1935b711a420d68429ff7134"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP CONSTRAINT "FK_17243441128671c88362a0a7ccb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" DROP CONSTRAINT "FK_e0edac70a2adb9b921a8437bfa7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" DROP CONSTRAINT "FK_de33d443c8ae36800c37c58c929"`,
    );
    await queryRunner.query(
      `ALTER TABLE "enrollments" DROP CONSTRAINT "FK_7cedad2b122aa289b15691a6e74"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_sections" DROP CONSTRAINT "FK_71374d26b78c712e1cb77bca511"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_sections" DROP CONSTRAINT "FK_f60ebb96e34051d16da7ca15794"`,
    );
    await queryRunner.query(
      `ALTER TABLE "course_sections" DROP CONSTRAINT "FK_86cf0cbf22034eea0ec79ab7ab3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" DROP CONSTRAINT "FK_61c9baadf12783792db01613201"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academic_terms" DROP CONSTRAINT "FK_8a492c4e3fb55ee0ff255ea7085"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" DROP CONSTRAINT "FK_81af9cdc39f64dbeac126b005d2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "file_uploads" DROP CONSTRAINT "FK_3b17c68bf6f92cd9bb77a4d56b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parent_students" DROP CONSTRAINT "FK_e5eaa6a5814ca0b7add6c47b90c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parent_students" DROP CONSTRAINT "FK_d75bfe2068e448c910ba1296116"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parent_students" DROP CONSTRAINT "FK_cad3b6229f37d8cfb2c39414320"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_d007658e942bc8eab9cff63928b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_c58f7e88c286e5e3478960a998b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2c98df0e229b0ede6f1668f306"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29d89f2e836c141d0388ca7721"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_80c09aa0f259609b6128accd34"`,
    );
    await queryRunner.query(`DROP TABLE "quiz_questions"`);
    await queryRunner.query(
      `DROP TYPE "public"."quiz_questions_questiontype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b983855ca788411854d5adcaa5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6aad4e719e04df8260b690a88b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0a9cb513bbf6832054303ccba8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_989b8ad8a5ba0bfd0092301117"`,
    );
    await queryRunner.query(`DROP TABLE "discussion_replies"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_433f7ba80d890d890a316e38c6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b8c87169eedda808be9c8b2cdb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_baea5e3e7c2c13a4ea3b6295f6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bf5b23d7b198412dda419c7309"`,
    );
    await queryRunner.query(`DROP TABLE "discussions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_73b09363a7d6b7c33a1a294af8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_511957e3e8443429dc3fb00120"`,
    );
    await queryRunner.query(`DROP TABLE "device_tokens"`);
    await queryRunner.query(`DROP TYPE "public"."device_tokens_platform_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d5b86bc522af7cc9e3e13960ff"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d60c47e715847c8aa792ba6d1e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_21e65af2f4f242d4c85a92aff4"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_21138f83dc4077586fc3a4808e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0cd49f0d658f13169c7b0455cf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4a7791013af78bef478070d11e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4f32ce533c066fc7b1fd14be5f"`,
    );
    await queryRunner.query(`DROP TABLE "feed_engagements"`);
    await queryRunner.query(
      `DROP TYPE "public"."feed_engagements_eventtype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_27a3f85911f86515be132f7c57"`,
    );
    await queryRunner.query(`DROP TABLE "lti_states"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_19e286614b369eaec36e0c7543"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b5288e8a27e03db0ba63034c40"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_981ba0bef55cdc2bc4a72c5cd9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9993d1f3d8c94b2298d7628849"`,
    );
    await queryRunner.query(`DROP TABLE "lti_users"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b17ceb3fcc2e1a99eff04e2ec7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_92a5af4bb3dd8813f3ebd9b3f4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ec7890b04b30251fc5fa8b7dd7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3fee80933fd1aa080ef6181116"`,
    );
    await queryRunner.query(`DROP TABLE "lti_contexts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ffbcce00d37538911c44b9c3a0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e173db3b4ea66af1de0db708f3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_35e9062a49ee79f150630293c1"`,
    );
    await queryRunner.query(`DROP TABLE "lti_platforms"`);
    await queryRunner.query(`DROP TYPE "public"."lti_platforms_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_855d4c1abfd611d56d5c4fb845"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3605f1f8ffee1a64835b6454ed"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3724573b1684458db47cfc7ced"`,
    );
    await queryRunner.query(`DROP TABLE "lti_deployments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_faee305ce75912752586a4e0f0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b69ad02f943de4649a38344bbe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_367c2caabb06259e1bb1fa9c43"`,
    );
    await queryRunner.query(`DROP TABLE "graduation_plans"`);
    await queryRunner.query(
      `DROP TYPE "public"."graduation_plans_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2523f094f95511212843827c12"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_534a317f0b09c0f71c49ba30be"`,
    );
    await queryRunner.query(`DROP TABLE "career_profiles"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b4c6967d118be0f2483aee3804"`,
    );
    await queryRunner.query(`DROP TABLE "conversations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6cc4e96821d3e38549665b0ac3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c80940d0a25034a392176543e4"`,
    );
    await queryRunner.query(`DROP TABLE "direct_messages"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_18c4ba3b127461649e5f5039db"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4453e20858b14ab765a09ad728"`,
    );
    await queryRunner.query(`DROP TABLE "conversation_participants"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5427da338e8dd89275cfa6ca31"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_59a06b9754ce46a8a28e53cd2b"`,
    );
    await queryRunner.query(`DROP TABLE "course_contents"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_addd820e2be21dc2c1645b4628"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eff953059197356dd516ffa7ae"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0da2e726913dab9f6c994857b2"`,
    );
    await queryRunner.query(`DROP TABLE "custom_agents"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_af36dd02656890b7e2e21726b0"`,
    );
    await queryRunner.query(`DROP TABLE "tenant_ai_configs"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_46bf6d423181f639ab0cadcba2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_95540e2816ce80527c6e86b97d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_87f5cddbcd402ecfff2cc6bc2f"`,
    );
    await queryRunner.query(`DROP TABLE "ai_usage_logs"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed5a9d697a9b12f88d6cab2316"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4dc0ba82778135333d4b5a0734"`,
    );
    await queryRunner.query(`DROP TABLE "ai_messages"`);
    await queryRunner.query(`DROP TYPE "public"."ai_messages_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fc52f001fec42b3d7d8d247081"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_38a66d41ffe49d8d3e22b0ec20"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d392a9bee27e6de55ab4cda367"`,
    );
    await queryRunner.query(`DROP TABLE "ai_conversations"`);
    await queryRunner.query(
      `DROP TYPE "public"."ai_conversations_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_962423bb4c01c5dfcbbf80085e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ede32978bd53eb101d8e80085a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb408ba78b4e67d160e20be7f6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2c58aa4b0392b2e1d0e6e7af0f"`,
    );
    await queryRunner.query(`DROP TABLE "student_degree_profiles"`);
    await queryRunner.query(
      `DROP TYPE "public"."student_degree_profiles_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a6f1ee0e5bcc3acb32266eb42"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ba63f191eaaf766956d3f4489f"`,
    );
    await queryRunner.query(`DROP TABLE "degree_programs"`);
    await queryRunner.query(`DROP TYPE "public"."degree_programs_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."degree_programs_programtype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_060ad419c691fd5f45ea693ced"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5ec17cfc7822e6d398b7d639fd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4b040e1f56c30c3f26d9a59f65"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_870314f53522b79d909bfe073a"`,
    );
    await queryRunner.query(`DROP TABLE "report_cards"`);
    await queryRunner.query(`DROP TYPE "public"."report_cards_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_180d196307c19bf2f3adcf04dc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e834473f94ac1ef83e9e1e795c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f59153ebcb27e4b1b2ab098a11"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1e3d8b11ea5204a3c8dcc43397"`,
    );
    await queryRunner.query(`DROP TABLE "attendance"`);
    await queryRunner.query(`DROP TYPE "public"."attendance_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29f5be1631fdc08ce2ad6a9c03"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4ee0ed876f66ec56aa62bbe691"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb02e7ee3bb4dfffa79ebfeb38"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c6c63fdba98f637c468bdedaf5"`,
    );
    await queryRunner.query(`DROP TABLE "announcements"`);
    await queryRunner.query(`DROP TYPE "public"."announcements_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."announcements_scope_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0fd585abacd4e0c53ea6578d97"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c2611c601f49945ceff5c0909a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eae888413ab8fc63cc48759d46"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_769e57960012a2f9b973c6491e"`,
    );
    await queryRunner.query(`DROP TABLE "submissions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17243441128671c88362a0a7cc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dfb1935b711a420d68429ff713"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_83606a3578b34afae3476b9efa"`,
    );
    await queryRunner.query(`DROP TABLE "assignments"`);
    await queryRunner.query(`DROP TYPE "public"."assignments_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7cedad2b122aa289b15691a6e7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_de33d443c8ae36800c37c58c92"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e0edac70a2adb9b921a8437bfa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ce27d2681a45b6f4797b92b234"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3816714ab4c719d70e6b848744"`,
    );
    await queryRunner.query(`DROP TABLE "enrollments"`);
    await queryRunner.query(`DROP TYPE "public"."enrollments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."enrollments_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_86cf0cbf22034eea0ec79ab7ab"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_71374d26b78c712e1cb77bca51"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f60ebb96e34051d16da7ca1579"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bcdd1b5944c0eb925784f550a2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ee450adc679c23644107f7d10c"`,
    );
    await queryRunner.query(`DROP TABLE "course_sections"`);
    await queryRunner.query(`DROP TYPE "public"."course_sections_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."course_sections_enrollmentmode_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_61c9baadf12783792db0161320"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5367f2afd01117ea5a5f11f621"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2a26294560102d94bc4c67ecfe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1ac2924c6479e5fa4fc5d1eec9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_95b51eb9e386e595cd408fd9bd"`,
    );
    await queryRunner.query(`DROP TABLE "courses"`);
    await queryRunner.query(`DROP TYPE "public"."courses_category_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8a492c4e3fb55ee0ff255ea708"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6c6f874a8baae1757ac7eed543"`,
    );
    await queryRunner.query(`DROP TABLE "academic_terms"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3b17c68bf6f92cd9bb77a4d56b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_81af9cdc39f64dbeac126b005d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9be61740ee528d2f71c1697e57"`,
    );
    await queryRunner.query(`DROP TABLE "file_uploads"`);
    await queryRunner.query(`DROP TYPE "public"."file_uploads_context_enum"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP TYPE "public"."tenants_billingstatus_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."tenants_subscriptionplan_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cad3b6229f37d8cfb2c3941432"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d75bfe2068e448c910ba129611"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e5eaa6a5814ca0b7add6c47b90"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d7c9a214501c7c4f7a892930de"`,
    );
    await queryRunner.query(`DROP TABLE "parent_students"`);
    await queryRunner.query(
      `DROP TYPE "public"."parent_students_relationship_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c58f7e88c286e5e3478960a998"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7346b08032078107fce81e014f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e4798214580fee9882b92f9d43"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d007658e942bc8eab9cff63928"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_roles_enum"`);
  }
}
