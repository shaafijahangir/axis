import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import {
  ObjectType,
  Field,
  Float,
  Int,
  registerEnumType,
} from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';
import { CourseSection } from './course-section.entity';

export enum AssignmentType {
  ASSIGNMENT = 'assignment',
  QUIZ = 'quiz',
  EXAM = 'exam',
  DISCUSSION = 'discussion',
  PROJECT = 'project',
}

registerEnumType(AssignmentType, { name: 'AssignmentType' });

/**
 * DATA-001: Added tenantId for direct tenant filtering without joins.
 * WHY: Previously required joining section → course to get tenantId.
 */
@ObjectType()
@Entity('assignments')
@Index(['tenantId'])
@Index(['sectionId'])
@Index(['dueAt'])
export class Assignment extends TenantScopedEntity {
  @Field()
  @Column()
  sectionId: string;

  @ManyToOne(() => CourseSection)
  @JoinColumn({ name: 'sectionId' })
  section: CourseSection;

  @Field({ nullable: true })
  @Column({ nullable: true })
  moduleId: string;

  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string;

  @Field(() => AssignmentType)
  @Column({
    type: 'enum',
    enum: AssignmentType,
    default: AssignmentType.ASSIGNMENT,
  })
  type: AssignmentType;

  @Field(() => Float)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pointsPossible: number;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  dueAt: Date;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  unlockAt: Date;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  lockAt: Date;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  rubric: Record<string, any>;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  // ── Quiz-specific fields ──

  /**
   * WHY nullable: only quiz/exam types use these. Standard assignments ignore them.
   * null maxAttempts = unlimited attempts. null timeLimitMinutes = no time limit.
   */
  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  maxAttempts: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  timeLimitMinutes: number | null;

  /**
   * all_at_once: all questions visible simultaneously (default for short quizzes).
   * one_at_a_time: one question per screen with Next/Prev (better for long exams).
   */
  @Field({ nullable: true })
  @Column({ nullable: true, default: 'all_at_once' })
  displayMode: string | null;
}
