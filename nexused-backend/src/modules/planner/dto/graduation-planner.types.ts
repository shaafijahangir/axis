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
  IsInt,
  IsBoolean,
  IsOptional,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { GraduationPlanStatus } from '../entities/graduation-plan.entity';

// ─── Plan Diff Types ──────────────────────────────────────────────────────────

/**
 * A course that appears in one plan's semester timeline.
 * Used for added/removed entries in a PlanDiff.
 */
@ObjectType()
export class DiffCourse {
  @Field()
  courseId: string;

  @Field()
  code: string;

  @Field()
  title: string;

  /** The term this course was scheduled in (e.g. 'fall_2026') */
  @Field()
  termKey: string;
}

/**
 * A course that moved from one semester to another between two plan versions.
 */
@ObjectType()
export class MovedCourse {
  @Field()
  courseId: string;

  @Field()
  code: string;

  @Field()
  title: string;

  @Field()
  fromTermKey: string;

  @Field()
  toTermKey: string;
}

/**
 * Structural diff between an old graduation plan and a freshly generated one.
 *
 * WHY: When a student adjusts a constraint (e.g. drops summer terms, reduces
 * credits/semester), they need to see exactly what changed — not just a new
 * plan. "3 courses moved, graduation pushed 1 semester" is actionable;
 * a silent full-replacement is not.
 *
 * Computed transiently in GraduationPlannerService.computeDiff() at generation
 * time. Not persisted — included only in the generateGraduationPlan mutation
 * response (null on first-ever generation when there's no prior plan to diff).
 */
@ObjectType()
export class PlanDiff {
  /** Courses present in the new plan but not the old (e.g. newly required). */
  @Field(() => [DiffCourse])
  added: DiffCourse[];

  /** Courses present in the old plan but dropped from the new. */
  @Field(() => [DiffCourse])
  removed: DiffCourse[];

  /** Courses that appear in both plans but shifted to a different semester. */
  @Field(() => [MovedCourse])
  moved: MovedCourse[];

  /** Number of new semester slots that didn't exist in the old plan. */
  @Field(() => Int)
  semestersAdded: number;

  /** Number of old semester slots that were removed from the new plan. */
  @Field(() => Int)
  semestersRemoved: number;

  /**
   * Human-readable description of the graduation date change.
   * e.g. "+2 semesters (Fall 2028 → Spring 2029)"
   * Absent when the graduation date is unchanged.
   */
  @Field({ nullable: true })
  graduationDateChange?: string;
}

// Re-export so resolver can reference it without circular import
export { GraduationPlanStatus };

registerEnumType(GraduationPlanStatus, { name: 'GraduationPlanStatus' });

// ─── Input Types ──────────────────────────────────────────────────────────────

/**
 * Input for generating a new graduation plan.
 *
 * WHY: All constraint parameters are optional and have sensible defaults
 * so a student can call generateGraduationPlan({ profileId }) and get
 * a reasonable plan with no further configuration.
 */
@InputType()
export class GenerateGraduationPlanInput {
  @Field()
  @IsString()
  profileId: string;

  /**
   * Maximum credits per semester. Controls plan density.
   * Default: 15 (typical full-time load).
   * Range: 1–25 (enforced here and in the algorithm).
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(25)
  maxCreditsPerSemester?: number;

  /** First term to start scheduling: 'fall' | 'spring' | 'summer'. Defaults to next upcoming term. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  startTerm?: string;

  /** Calendar year for the first term. Defaults to current year. */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  startYear?: number;

  /** Whether to schedule courses in summer terms. Default: false. */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  includeSummer?: boolean;

  /**
   * Term keys to exclude (e.g. ['summer_2027', 'spring_2028']).
   * Useful for semesters when the student plans to take time off.
   */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  excludedTermKeys?: string[];
}

// ─── Output Types ─────────────────────────────────────────────────────────────

@ObjectType()
export class GraduationPlanConstraintsResult {
  @Field(() => Int)
  maxCreditsPerSemester: number;

  @Field()
  startTerm: string;

  @Field(() => Int)
  startYear: number;

  @Field()
  includeSummer: boolean;

  @Field(() => [String])
  excludedTermKeys: string[];
}

@ObjectType()
export class PlannedCourse {
  @Field()
  courseId: string;

  @Field()
  code: string;

  @Field()
  title: string;

  @Field(() => Float)
  credits: number;

  /** Name of the degree requirement group this course satisfies */
  @Field()
  fulfillsRequirement: string;
}

@ObjectType()
export class PlannedSemester {
  /** e.g. 'fall_2026' — unique key for this slot */
  @Field()
  termKey: string;

  /** 'fall' | 'spring' | 'summer' */
  @Field()
  term: string;

  @Field(() => Int)
  year: number;

  @Field(() => [PlannedCourse])
  courses: PlannedCourse[];

  @Field(() => Float)
  totalCredits: number;

  /** Running total of all credits (including pre-plan completions) */
  @Field(() => Float)
  cumulativeCredits: number;

  /** Cumulative completion percentage relative to totalCreditsRequired */
  @Field(() => Float)
  completionPercentage: number;
}

/**
 * The GraphQL-facing representation of a GraduationPlan entity.
 *
 * WHY separate from entity: The entity stores semesters/constraints as
 * raw JSONB. This type exposes them as proper nested GraphQL fields so
 * the frontend gets full type safety without JSON.parse.
 */
@ObjectType()
export class GraduationPlanResult {
  @Field()
  id: string;

  @Field()
  profileId: string;

  @Field()
  degreeProgramId: string;

  @Field(() => GraduationPlanStatus)
  status: GraduationPlanStatus;

  @Field(() => GraduationPlanConstraintsResult)
  constraints: GraduationPlanConstraintsResult;

  @Field(() => [PlannedSemester])
  semesters: PlannedSemester[];

  @Field(() => Int)
  totalSemesters: number;

  @Field()
  estimatedGraduationTerm: string;

  @Field(() => Int)
  estimatedGraduationYear: number;

  @Field(() => Float)
  totalCreditsPlanned: number;

  @Field(() => Float)
  totalCreditsCompleted: number;

  @Field(() => Float)
  overallCompletionPercentage: number;

  @Field()
  createdAt: Date;

  /**
   * Diff vs. the previous active plan. Null when this is the first plan ever
   * generated for this profile (nothing to compare against).
   */
  @Field(() => PlanDiff, { nullable: true })
  diff?: PlanDiff | null;
}
