import { InputType, Field, Float, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { QuestionType } from '../entities/quiz-question.entity';

@InputType()
export class QuizOptionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  text: string;

  @Field()
  @IsBoolean()
  isCorrect: boolean;
}

@InputType()
export class AddQuizQuestionInput {
  @Field()
  @IsUUID()
  assignmentId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @Field(() => QuestionType)
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @Field(() => [QuizOptionInput], { nullable: true })
  @IsOptional()
  @IsArray()
  options?: QuizOptionInput[];

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  points: number;
}

@InputType()
export class UpdateQuizQuestionInput {
  @Field()
  @IsUUID()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  questionText?: string;

  @Field(() => [QuizOptionInput], { nullable: true })
  @IsOptional()
  @IsArray()
  options?: QuizOptionInput[];

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  points?: number;
}

@InputType()
export class QuizAnswerInput {
  @Field()
  @IsUUID()
  questionId: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  selectedOption?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  textAnswer?: string;
}

@InputType()
export class SubmitQuizInput {
  @Field()
  @IsUUID()
  submissionId: string;

  @Field(() => [QuizAnswerInput])
  @IsArray()
  answers: QuizAnswerInput[];
}

@InputType()
export class UpdateQuizSettingsInput {
  @Field()
  @IsUUID()
  assignmentId: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxAttempts?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1)
  timeLimitMinutes?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  displayMode?: string;
}

@InputType()
export class ReorderQuestionsInput {
  @Field()
  @IsUUID()
  assignmentId: string;

  @Field(() => [String])
  @IsArray()
  orderedIds: string[];
}
