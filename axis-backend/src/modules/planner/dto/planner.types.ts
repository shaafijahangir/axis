import {
  ObjectType,
  Field,
  Int,
  Float,
  InputType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  ValidateNested,
  IsArray,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DegreeProgramStatus } from '../../../database/entities/degree-program.entity';

// ─── Degree Program DTOs ────────────────────────────────────────────────

@InputType()
export class RequirementGroupInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  type: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  creditsRequired: number;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  courseIds: string[];

  @Field(() => Int)
  @IsInt()
  @Min(0)
  minCoursesRequired: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  /** Lowest letter grade that counts toward this group, e.g. 'C'. Null = any pass. */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  minGrade?: string | null;
}

@InputType()
export class CreateDegreeProgramInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float)
  @IsNumber()
  @Min(1)
  @Max(500)
  totalCreditsRequired: number;

  @Field(() => [RequirementGroupInput])
  @IsArray()
  requirements: RequirementGroupInput[];
}

@InputType()
export class UpdateDegreeProgramInput {
  @Field()
  @IsString()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  code?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  department?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  totalCreditsRequired?: number;

  @Field(() => [RequirementGroupInput], { nullable: true })
  @IsOptional()
  @IsArray()
  requirements?: RequirementGroupInput[];

  @Field(() => DegreeProgramStatus, { nullable: true })
  @IsOptional()
  @IsEnum(DegreeProgramStatus)
  status?: DegreeProgramStatus;
}

// ─── Student Degree Profile DTOs ────────────────────────────────────────

@InputType()
export class CompletedCourseInput {
  @Field()
  @IsString()
  courseId: string;

  /** UVic letter grade (A+..F) or COM/CR; null when not recorded. */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  grade?: string | null;
}

@InputType()
export class CreateStudentProfileInput {
  @Field()
  @IsString()
  userId: string;

  @Field()
  @IsString()
  degreeProgramId: string;

  @Field(() => Int)
  @IsInt()
  enrollmentYear: number;

  /** Calendar year whose rules apply; defaults to enrollmentYear. */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  catalogYear?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  expectedGraduationYear?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  completedCourseIds?: string[];

  /** Completed courses with grades; when set, completedCourseIds is derived from it. */
  @Field(() => [CompletedCourseInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletedCourseInput)
  completedCourses?: CompletedCourseInput[];
}

@InputType()
export class UpdateStudentProfileInput {
  @Field()
  @IsString()
  id: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  completedCourseIds?: string[];

  /** Completed courses with grades; when set, completedCourseIds is derived from it. */
  @Field(() => [CompletedCourseInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletedCourseInput)
  completedCourses?: CompletedCourseInput[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  currentCourseIds?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  expectedGraduationYear?: number;

  /** Changing it re-picks the program version for that year. */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  catalogYear?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Progress Calculation Types ─────────────────────────────────────────

@ObjectType()
export class RequirementProgress {
  @Field()
  groupName: string;

  @Field()
  type: string;

  @Field(() => Float)
  creditsRequired: number;

  @Field(() => Float)
  creditsCompleted: number;

  @Field(() => Int)
  coursesRequired: number;

  @Field(() => Int)
  coursesCompleted: number;

  @Field()
  fulfilled: boolean;

  @Field(() => [String])
  completedCourseIds: string[];

  @Field(() => [String])
  remainingCourseIds: string[];
}

@ObjectType()
export class DegreeProgress {
  @Field(() => Float)
  overallPercentage: number;

  @Field(() => Float)
  totalCreditsRequired: number;

  /** Raw credits across groups, surplus included. */
  @Field(() => Float)
  totalCreditsCompleted: number;

  /** Credits counted toward the degree (each group capped); drives the %. */
  @Field(() => Float)
  countedCredits: number;

  /** Raw minus counted: units that don't count toward any requirement. */
  @Field(() => Float)
  extraCredits: number;

  @Field(() => Float)
  creditsRemaining: number;

  /** Year of the worksheet being applied (from the program's catalogYear). */
  @Field(() => Int, { nullable: true })
  ruleYear: number | null;

  /** Year the student follows: profile.catalogYear ?? enrollmentYear. */
  @Field(() => Int, { nullable: true })
  entryYear: number | null;

  /** True when ruleYear != entryYear (that year's worksheet isn't on file). */
  @Field()
  catalogFallback: boolean;

  /** Human-readable fallback note, null when the exact year is applied. */
  @Field(() => String, { nullable: true })
  catalogNotice: string | null;

  @Field(() => [RequirementProgress])
  requirementProgress: RequirementProgress[];

  @Field(() => Int)
  estimatedSemestersRemaining: number;
}

@ObjectType()
export class EligibleCourse {
  @Field()
  id: string;

  @Field()
  code: string;

  @Field()
  title: string;

  @Field(() => Float, { nullable: true })
  credits: number;

  @Field()
  fulfillsRequirement: string;

  @Field()
  prerequisitesMet: boolean;
}

// ─── ENROLL-006: Prerequisite Check Types ─────────────────────────────────

export enum PrerequisiteStatusType {
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  MISSING = 'missing',
}

registerEnumType(PrerequisiteStatusType, { name: 'PrerequisiteStatusType' });

/**
 * Status of a single prerequisite course relative to the calling student.
 */
@ObjectType()
export class PrerequisiteStatus {
  @Field()
  courseId: string;

  @Field()
  courseCode: string;

  @Field()
  courseTitle: string;

  /** COMPLETED — student has passed this course.
   *  IN_PROGRESS — student is currently enrolled.
   *  MISSING — student has not taken it. */
  @Field(() => PrerequisiteStatusType)
  status: PrerequisiteStatusType;
}

/**
 * Result of checking whether a student meets the prerequisites for a course.
 *
 * allMet: true even if prerequisites is empty (no prerequisites required).
 * metCount/totalRequired allow "any N of M" prerequisite rules.
 */
@ObjectType()
export class PrerequisiteCheckResult {
  @Field()
  courseId: string;

  @Field()
  courseCode: string;

  @Field()
  allMet: boolean;

  @Field(() => Int)
  metCount: number;

  @Field(() => Int)
  totalRequired: number;

  @Field(() => [PrerequisiteStatus])
  prerequisites: PrerequisiteStatus[];
}
