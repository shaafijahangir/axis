import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';
import { User } from './user.entity';
import { DegreeProgram } from './degree-program.entity';

export enum DegreeProfileStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  GRADUATED = 'graduated',
  WITHDRAWN = 'withdrawn',
}

registerEnumType(DegreeProfileStatus, {
  name: 'DegreeProfileStatus',
  description: 'Status of a student degree profile',
});

/**
 * Links a student to a degree program and tracks their progress.
 *
 * WHY: The Course Planner agent needs to know what degree a student
 * is pursuing, what they've completed, and what they're currently
 * taking. This entity is the single source of truth for that.
 *
 * PATTERN: JSONB arrays for completedCourseIds and currentCourseIds
 * because these are always loaded as a set and compared against
 * degree requirements — never queried individually.
 *
 * TRADEOFF: Denormalized course tracking. We store course IDs here
 * rather than computing from Enrollment records because:
 * 1. Transfer credits may not have enrollments
 * 2. AP/test credits have no course section
 * 3. Historical data from before Axis adoption
 */
@ObjectType()
@Entity('student_degree_profiles')
@Index(['tenantId'])
@Index(['userId'])
@Index(['degreeProgramId'])
@Index(['tenantId', 'userId', 'degreeProgramId'], { unique: true })
export class StudentDegreeProfile extends TenantScopedEntity {
  @Field()
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @Column()
  degreeProgramId: string;

  @Field(() => DegreeProgram)
  @ManyToOne(() => DegreeProgram)
  @JoinColumn({ name: 'degreeProgramId' })
  degreeProgram: DegreeProgram;

  @Field(() => Int)
  @Column({ type: 'int' })
  enrollmentYear: number;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  expectedGraduationYear: number | null;

  /**
   * Course IDs the student has completed (includes transfer/AP credits).
   * These are Course entity UUIDs, not enrollment records.
   */
  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  completedCourseIds: string[];

  /**
   * Course IDs the student is currently enrolled in this term.
   * Updated each enrollment period.
   */
  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  currentCourseIds: string[];

  @Field(() => DegreeProfileStatus)
  @Column({
    type: 'enum',
    enum: DegreeProfileStatus,
    default: DegreeProfileStatus.ACTIVE,
  })
  status: DegreeProfileStatus;

  /** Advisor notes, transfer credit explanations, etc. */
  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
