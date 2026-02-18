import { InputType, Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { CourseCategory } from '../../../database/entities/course.entity';
import { Course } from '../../../database/entities/course.entity';

@InputType()
export class CreateCourseInput {
  @Field()
  code: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  credits?: number;

  @Field({ nullable: true })
  departmentId?: string;

  @Field(() => CourseCategory, { nullable: true })
  category?: CourseCategory;

  @Field(() => Int, { nullable: true })
  courseLevel?: number;

  @Field(() => [String], { nullable: true })
  offeredSemesters?: string[];

  @Field(() => [String], { nullable: true })
  prerequisiteCourseIds?: string[];

  @Field(() => [String], { nullable: true })
  corequisiteCourseIds?: string[];
}

@InputType()
export class UpdateCourseInput {
  @Field({ nullable: true })
  code?: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  credits?: number;

  @Field({ nullable: true })
  departmentId?: string;

  @Field(() => CourseCategory, { nullable: true })
  category?: CourseCategory;

  @Field(() => Int, { nullable: true })
  courseLevel?: number;

  @Field(() => [String], { nullable: true })
  offeredSemesters?: string[];

  @Field(() => [String], { nullable: true })
  prerequisiteCourseIds?: string[];

  @Field(() => [String], { nullable: true })
  corequisiteCourseIds?: string[];
}

@InputType()
export class CatalogFilterInput {
  @Field({ nullable: true })
  search?: string;

  @Field({ nullable: true })
  departmentId?: string;

  @Field(() => CourseCategory, { nullable: true })
  category?: CourseCategory;

  @Field(() => Int, { nullable: true })
  courseLevel?: number;

  @Field(() => Int, { nullable: true, defaultValue: 50 })
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  offset?: number;
}

@ObjectType()
export class CatalogPage {
  @Field(() => [Course])
  items: Course[];

  @Field(() => Int)
  total: number;
}

// ─── CSV Import Types ────────────────────────────────────────────────────────

@ObjectType()
export class ImportError {
  @Field(() => Int)
  row: number;

  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
export class ImportResult {
  @Field(() => Int)
  imported: number;

  @Field()
  success: boolean;

  @Field(() => [ImportError])
  errors: ImportError[];
}

// ─── Batch Course Import (from AI extraction review) ─────────────────────────

/**
 * One course item from the AI-extraction review step.
 * Uses prerequisiteCodes (strings) instead of prerequisiteCourseIds (UUIDs)
 * because the extraction gives us course codes, not database IDs.
 * The service resolves codes → IDs before persisting.
 */
@InputType()
export class BatchCourseItem {
  @Field()
  code: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float, { nullable: true })
  credits?: number;

  @Field({ nullable: true })
  department?: string;

  @Field(() => CourseCategory, { nullable: true })
  category?: CourseCategory;

  @Field(() => Int, { nullable: true })
  courseLevel?: number;

  @Field(() => [String], { nullable: true })
  offeredSemesters?: string[];

  @Field(() => [String], { nullable: true })
  prerequisiteCodes?: string[];

  @Field(() => [String], { nullable: true })
  corequisiteCodes?: string[];
}

// ─── Section Input ────────────────────────────────────────────────────────────

@InputType()
export class CreateSectionInput {
  @Field()
  courseId: string;

  @Field()
  termId: string;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  capacity?: number;

  @Field({ nullable: true })
  schedule?: string;
}
