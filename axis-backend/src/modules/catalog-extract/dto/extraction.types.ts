import { ObjectType, Field, Float, Int, InputType } from '@nestjs/graphql';
import { CourseCategory } from '../../../database/entities/course.entity';
import { DegreeProgramType } from '../../../database/entities/degree-program.entity';

// ─── Output types returned by the extraction API ─────────────────────────────

@ObjectType()
export class ExtractionFlag {
  /** 'course' or 'program' */
  @Field()
  entityType: string;

  /** The course code or program code this flag is about */
  @Field()
  entityCode: string;

  /** The specific field that was ambiguous */
  @Field()
  field: string;

  /** Human-readable explanation of the ambiguity */
  @Field()
  message: string;
}

@ObjectType()
export class ExtractedCourse {
  @Field()
  code: string;

  @Field()
  title: string;

  @Field(() => Float, { nullable: true })
  credits?: number;

  /** Raw department name as extracted (not a UUID) */
  @Field({ nullable: true })
  department?: string;

  @Field(() => CourseCategory, { nullable: true })
  category?: CourseCategory;

  @Field(() => Int, { nullable: true })
  courseLevel?: number;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String])
  offeredSemesters: string[];

  /** Prerequisite course codes (not UUIDs) — resolved during import */
  @Field(() => [String])
  prerequisiteCodes: string[];

  @Field(() => [String])
  corequisiteCodes: string[];

  /** 0.0–1.0, < 0.75 means this row is flagged for review */
  @Field(() => Float)
  confidence: number;

  @Field()
  flagged: boolean;
}

@ObjectType()
export class ExtractedProgram {
  @Field()
  name: string;

  @Field()
  code: string;

  @Field(() => DegreeProgramType, { nullable: true })
  programType?: DegreeProgramType;

  @Field({ nullable: true })
  department?: string;

  @Field(() => Int, { nullable: true })
  totalCreditsRequired?: number;

  @Field(() => Int, { nullable: true })
  expectedDurationSemesters?: number;

  @Field(() => Float)
  confidence: number;

  @Field()
  flagged: boolean;
}

@ObjectType()
export class ExtractionResult {
  @Field(() => [ExtractedCourse])
  courses: ExtractedCourse[];

  @Field(() => [ExtractedProgram])
  programs: ExtractedProgram[];

  @Field(() => [ExtractionFlag])
  flags: ExtractionFlag[];

  @Field(() => Int)
  inputTokens: number;

  @Field(() => Int)
  outputTokens: number;

  @Field(() => Float)
  estimatedCostUsd: number;
}

// ─── Input types for batch program creation ───────────────────────────────────

@InputType()
export class BatchProgramItem {
  @Field()
  name: string;

  @Field()
  code: string;

  @Field(() => DegreeProgramType, { nullable: true })
  programType?: DegreeProgramType;

  @Field({ nullable: true })
  department?: string;

  @Field(() => Int, { nullable: true })
  totalCreditsRequired?: number;

  @Field(() => Int, { nullable: true })
  expectedDurationSemesters?: number;
}
