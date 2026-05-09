import { ObjectType, Field, Int, Float, InputType } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsBoolean,
  Min,
  MaxLength,
  MinLength,
} from 'class-validator';

// ─── Input Types ──────────────────────────────────────────────────────────────

@InputType()
export class CreateCareerInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  medianSalaryMin?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  medianSalaryMax?: number;

  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  @IsString({ each: true })
  requiredSkills: string[];

  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  @IsString({ each: true })
  recommendedDegreeIds: string[];

  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  @IsString({ each: true })
  recommendedCourseIds: string[];
}

@InputType()
export class UpdateCareerInput {
  @Field()
  @IsString()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  medianSalaryMin?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  medianSalaryMax?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedDegreeIds?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedCourseIds?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Output Types ─────────────────────────────────────────────────────────────

/**
 * A single course in the skill gap analysis result.
 * The status tells the student how they relate to this course.
 */
@ObjectType()
export class SkillGapCourse {
  @Field()
  courseId: string;

  @Field()
  code: string;

  @Field()
  title: string;

  @Field(() => Float)
  credits: number;

  /**
   * 'completed'   — student has already taken this course
   * 'in_progress' — student is enrolled in it this term
   * 'missing'     — student has not taken or started this course
   */
  @Field()
  status: 'completed' | 'in_progress' | 'missing';
}

/**
 * Result of a career skill gap analysis for a specific student profile.
 *
 * WHY: The student needs to know exactly which career-recommended courses
 * they've already done, which they're currently taking, and which they still
 * need. This data drives the "How far am I from this career?" UI.
 */
@ObjectType()
export class CareerSkillGap {
  @Field()
  careerId: string;

  @Field()
  careerTitle: string;

  /** All career-recommended courses with their gap status for this student */
  @Field(() => [SkillGapCourse])
  courses: SkillGapCourse[];

  /** Number of career-recommended courses already completed */
  @Field(() => Int)
  completedCount: number;

  /** Number of career-recommended courses currently in progress */
  @Field(() => Int)
  inProgressCount: number;

  /** Number of career-recommended courses not yet started */
  @Field(() => Int)
  missingCount: number;

  /** Overall readiness: completedCount / total recommended courses × 100 */
  @Field(() => Float)
  readinessPercent: number;
}
