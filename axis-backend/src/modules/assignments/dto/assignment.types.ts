import { InputType, ObjectType, Field, Float } from '@nestjs/graphql';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AssignmentType } from '../../../database/entities/assignment.entity';

@InputType()
export class CreateAssignmentInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
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

  /**
   * SPRINT-2: IDs of confirmed FileUploads (UploadContext = ASSIGNMENT_INSTRUCTIONS)
   * to attach as instructions for this assignment. The client uploads via the
   * existing requestUpload → PUT → confirmUpload flow, then passes the resulting
   * fileIds here so the service links them via attachToContext().
   */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileUploadIds?: string[];
}

@InputType()
export class CreateSubmissionInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  assignmentId: string;

  /** JSON string representing the submission content */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  content?: string;

  /**
   * SPRINT-2: IDs of confirmed FileUploads (UploadContext = ASSIGNMENT_SUBMISSION)
   * to attach to this submission attempt.
   */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileUploadIds?: string[];
}

@InputType()
export class UpdateAssignmentInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  id: string;

  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
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

  /**
   * SPRINT-2: Optional updated instruction file list. When provided, the
   * service unlinks any current instruction attachments and links these
   * in their place (full replace semantics). Pass [] to remove all.
   */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileUploadIds?: string[];
}

@InputType()
export class ExtendDeadlinesInput {
  @Field(() => [String])
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    each: true,
  })
  assignmentIds: string[];

  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  sectionId: string;

  @Field()
  @IsDateString()
  newDueAt: string;
}

@InputType()
export class GradeSubmissionInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  submissionId: string;

  @Field(() => Float)
  @IsNumber()
  score: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  feedback?: string;
}

// ─── Override Grade Input ───────────────────────────────────────────────────

@InputType()
export class OverrideGradeInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  sectionId: string;

  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  studentId: string;

  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  assignmentId: string;

  @Field(() => Float)
  @IsNumber()
  score: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  feedback?: string;
}

// ─── Student Grades Response Types ─────────────────────────────────────────

@ObjectType()
export class StudentGradeAssignment {
  @Field()
  assignmentId: string;

  @Field()
  assignmentTitle: string;

  @Field(() => String)
  assignmentType: string;

  @Field(() => Float)
  pointsPossible: number;

  @Field(() => Float)
  score: number;

  @Field(() => Float)
  percentage: number;

  @Field()
  gradedAt: Date;

  @Field({ nullable: true })
  feedback?: string;
}

@ObjectType()
export class StudentCourseGrades {
  @Field()
  sectionId: string;

  @Field()
  courseId: string;

  @Field()
  courseCode: string;

  @Field()
  courseTitle: string;

  @Field({ nullable: true })
  sectionInstructor?: string;

  @Field(() => Float)
  totalPointsEarned: number;

  @Field(() => Float)
  totalPointsPossible: number;

  @Field(() => Float)
  overallPercentage: number;

  @Field(() => [StudentGradeAssignment])
  assignments: StudentGradeAssignment[];
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
