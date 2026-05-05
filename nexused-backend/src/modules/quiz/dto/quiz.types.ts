import { InputType, Field, Float, Int } from '@nestjs/graphql';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
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
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
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
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
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
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
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
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  submissionId: string;

  @Field(() => [QuizAnswerInput])
  @IsArray()
  answers: QuizAnswerInput[];
}

@InputType()
export class UpdateQuizSettingsInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
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
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  assignmentId: string;

  @Field(() => [String])
  @IsArray()
  orderedIds: string[];
}
