import { InputType, ObjectType, Field, Float } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { AssignmentType } from '../../../database/entities/assignment.entity';

@InputType()
export class CreateAssignmentInput {
  @Field()
  @IsUUID()
  sectionId: string;

  @Field()
  @IsString()
  @MaxLength(255)
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(AssignmentType)
  type?: AssignmentType;

  @Field(() => Float)
  @IsNumber()
  pointsPossible: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  unlockAt?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  lockAt?: string;

  /** JSON string representing the rubric structure */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  rubric?: string;

  /** JSON string for assignment settings */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  settings?: string;
}

@InputType()
export class CreateSubmissionInput {
  @Field()
  @IsUUID()
  assignmentId: string;

  /** JSON string representing the submission content */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  content?: string;
}

@InputType()
export class UpdateAssignmentInput {
  @Field()
  @IsUUID()
  id: string;

  @Field()
  @IsUUID()
  sectionId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  unlockAt?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  lockAt?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  pointsPossible?: number;
}

@InputType()
export class ExtendDeadlinesInput {
  @Field(() => [String])
  @IsUUID('4', { each: true })
  assignmentIds: string[];

  @Field()
  @IsUUID()
  sectionId: string;

  @Field()
  @IsDateString()
  newDueAt: string;
}

@InputType()
export class GradeSubmissionInput {
  @Field()
  @IsUUID()
  submissionId: string;

  @Field(() => Float)
  @IsNumber()
  score: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  feedback?: string;
}

// ─── Gradebook Response Types ───────────────────────────────────────────────

@ObjectType()
export class GradebookGrade {
  @Field()
  assignmentId: string;

  @Field({ nullable: true })
  submissionId?: string;

  @Field(() => Float, { nullable: true })
  score?: number;

  @Field({ nullable: true })
  submittedAt?: Date;

  @Field({ nullable: true })
  gradedAt?: Date;
}

@ObjectType()
export class GradebookStudentRow {
  @Field()
  studentId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field(() => [GradebookGrade])
  grades: GradebookGrade[];

  @Field(() => Float)
  totalEarned: number;

  @Field(() => Float)
  totalPossible: number;

  @Field(() => Float)
  percentage: number;
}

@ObjectType()
export class GradebookAssignmentColumn {
  @Field()
  id: string;

  @Field()
  title: string;

  @Field(() => String)
  type: string;

  @Field(() => Float)
  pointsPossible: number;

  @Field({ nullable: true })
  dueAt?: Date;

  @Field(() => Float, { nullable: true })
  averageScore?: number;

  @Field(() => Float, { nullable: true })
  medianScore?: number;
}

@ObjectType()
export class SectionGradebook {
  @Field(() => [GradebookAssignmentColumn])
  assignments: GradebookAssignmentColumn[];

  @Field(() => [GradebookStudentRow])
  students: GradebookStudentRow[];

  @Field(() => Float)
  classAverage: number;
}
