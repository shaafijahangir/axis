import { Entity, Column, Index } from 'typeorm';
import {
  ObjectType,
  Field,
  Float,
  Int,
  registerEnumType,
} from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
}

registerEnumType(QuestionType, { name: 'QuestionType' });

/**
 * WHY separate ObjectType: JSONB can't be auto-mapped by GraphQL.
 * We define a concrete type so Apollo can serialize/deserialize it.
 */
@ObjectType()
export class QuizOption {
  @Field()
  text: string;

  /**
   * WHY nullable: when serving questions to students we strip isCorrect
   * by setting it to undefined. The nullable field allows this without
   * changing the GraphQL schema type for instructor queries.
   */
  @Field({ nullable: true })
  isCorrect?: boolean;
}

@ObjectType()
@Entity('quiz_questions')
@Index(['tenantId'])
@Index(['assignmentId'])
@Index(['assignmentId', 'order'])
export class QuizQuestion extends TenantScopedEntity {
  @Field()
  @Column()
  assignmentId: string;

  @Field()
  @Column({ type: 'text' })
  questionText: string;

  @Field(() => QuestionType)
  @Column({ type: 'enum', enum: QuestionType })
  questionType: QuestionType;

  /**
   * WHY JSONB: options schema varies by question type (MCQ has 4 options,
   * TF has 2, short_answer has none). JSONB avoids a separate options table
   * with nullable columns — simpler queries and simpler service logic.
   */
  @Field(() => [QuizOption], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  options: QuizOption[] | null;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  points: number;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  order: number;
}
