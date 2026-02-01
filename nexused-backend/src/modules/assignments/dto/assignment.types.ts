import { InputType, Field, Float } from '@nestjs/graphql';
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
