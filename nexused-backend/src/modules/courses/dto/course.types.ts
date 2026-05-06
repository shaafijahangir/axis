import { InputType, Field, Float, Int, ObjectType } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { CourseCategory } from '../../../database/entities/course.entity';
import { Course } from '../../../database/entities/course.entity';

@InputType()
export class CreateCourseInput {
  @Field()
  @IsString()
  code: string;

  @Field()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  credits?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @Field(() => CourseCategory, { nullable: true })
  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  courseLevel?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offeredSemesters?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisiteCourseIds?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  corequisiteCourseIds?: string[];
}

@InputType()
export class UpdateCourseInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  code?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  credits?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @Field(() => CourseCategory, { nullable: true })
  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  courseLevel?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offeredSemesters?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisiteCourseIds?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  corequisiteCourseIds?: string[];
}

@InputType()
export class CatalogFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @Field(() => CourseCategory, { nullable: true })
  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  courseLevel?: number;

  @Field(() => Int, { nullable: true, defaultValue: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
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
  @IsString()
  code: string;

  @Field()
  @IsString()
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  credits?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field(() => CourseCategory, { nullable: true })
  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  courseLevel?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  offeredSemesters?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisiteCodes?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  corequisiteCodes?: string[];
}

// ─── Section Input ────────────────────────────────────────────────────────────

@InputType()
export class CreateSectionInput {
  @Field()
  @IsString()
  courseId: string;

  @Field()
  @IsString()
  termId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  capacity?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  schedule?: string;
}
