import { ObjectType, Field, Int, Float, InputType } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsEnum,
} from 'class-validator';
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

  @Field(() => Int)
  @IsInt()
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

  @Field(() => Int)
  @IsInt()
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

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
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

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  expectedGraduationYear?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  completedCourseIds?: string[];
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

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  currentCourseIds?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  expectedGraduationYear?: number;

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

  @Field(() => Int)
  creditsRequired: number;

  @Field(() => Int)
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

  @Field(() => Int)
  totalCreditsRequired: number;

  @Field(() => Int)
  totalCreditsCompleted: number;

  @Field(() => Int)
  creditsRemaining: number;

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
