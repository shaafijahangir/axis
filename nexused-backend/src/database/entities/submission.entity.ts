import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, Float, Int } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';
import { Assignment } from './assignment.entity';
import { User } from './user.entity';

/**
 * DATA-001: Added tenantId for direct tenant filtering without joins.
 * WHY: Previously required joining assignment → section → course to get tenantId.
 */
@ObjectType()
@Entity('submissions')
@Index(['tenantId'])
@Index(['assignmentId'])
@Index(['userId'])
@Index(['assignmentId', 'userId'])
export class Submission extends TenantScopedEntity {
  @Field()
  @Column()
  assignmentId: string;

  @ManyToOne(() => Assignment)
  @JoinColumn({ name: 'assignmentId' })
  assignment: Assignment;

  @Field()
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field(() => Int)
  @Column({ type: 'int', default: 1 })
  attempt: number;

  @Column({ type: 'jsonb', nullable: true })
  content: Record<string, any>;

  /**
   * GraphQL can't serialize a JS object as a String scalar.
   * Expose the JSONB content as a stringified JSON field for the API.
   */
  @Field(() => String, { name: 'content', nullable: true })
  get contentJson(): string | null {
    return this.content ? JSON.stringify(this.content) : null;
  }

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  score: number;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  gradedAt: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  gradedBy: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  feedback: string;

  // ── Quiz-specific fields ──

  /**
   * WHY JSONB: answers schema is [{ questionId, selectedOption?, textAnswer? }].
   * Storing alongside the submission avoids a separate answers table and keeps
   * the submission self-contained for grading and audit purposes.
   */
  @Field(() => String, { name: 'answers', nullable: true })
  get answersJson(): string | null {
    return this.answers ? JSON.stringify(this.answers) : null;
  }

  @Column({ type: 'jsonb', nullable: true })
  answers: Array<{
    questionId: string;
    selectedOption?: number; // index into options array (MCQ/TF)
    textAnswer?: string; // short_answer
  }> | null;

  /**
   * Auto-calculated sum of points for correct MCQ/TF answers.
   * null until the quiz is submitted. short_answer questions excluded —
   * instructor must grade those manually and override the score field.
   */
  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  autoScore: number | null;

  /**
   * Set when the student starts the quiz (startQuiz mutation).
   * Used to enforce timeLimitMinutes on submitQuiz.
   */
  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;
}
