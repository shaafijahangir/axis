import { Entity, Column, Index } from 'typeorm';
import { registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';

export enum GraduationPlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

registerEnumType(GraduationPlanStatus, {
  name: 'GraduationPlanStatus',
  description: 'Lifecycle status of a generated graduation plan',
});

/** Constraints that were used to generate this plan. Stored so GRAD-002 replanning can use them as defaults. */
export interface GraduationPlanConstraints {
  maxCreditsPerSemester: number;
  startTerm: string;
  startYear: number;
  includeSummer: boolean;
  excludedTermKeys: string[];
}

/** A single course within a planned semester (raw JSONB shape). */
export interface PlannedCourseData {
  courseId: string;
  code: string;
  title: string;
  credits: number;
  fulfillsRequirement: string;
  /**
   * GRAD-005: Optional availability warning surfaced at plan-generation time.
   * Values: 'only_offered_fall' | 'only_offered_spring' | 'only_offered_summer' | 'fills_quickly'
   */
  availabilityWarning?: string;
}

/** A semester slot in the graduation plan (raw JSONB shape). */
export interface PlannedSemesterData {
  termKey: string; // e.g. 'fall_2026'
  term: string; // 'fall' | 'spring' | 'summer'
  year: number;
  courses: PlannedCourseData[];
  totalCredits: number;
  cumulativeCredits: number;
  completionPercentage: number;
}

/**
 * A generated semester-by-semester graduation plan for a student.
 *
 * WHY JSONB for semesters: The plan is always accessed as a whole
 * (rendered as a roadmap, never queried semester-by-semester), so
 * JSONB avoids an explosion of join tables while still being indexed.
 *
 * WHY separate entity: Plans are versioned — a student can have multiple
 * drafts and one active plan. GRAD-002 replanning creates a new plan and
 * archives the old one. The history is preserved for diff display.
 *
 * PATTERN: Tenant-scoped. Only the generating user and admins may access
 * a plan (enforced in the resolver).
 */
@Entity('graduation_plans')
@Index(['tenantId', 'userId'])
@Index(['profileId'])
@Index(['status'])
export class GraduationPlan extends TenantScopedEntity {
  @Column()
  userId: string;

  @Column()
  profileId: string;

  @Column()
  degreeProgramId: string;

  @Column({
    type: 'enum',
    enum: GraduationPlanStatus,
    default: GraduationPlanStatus.DRAFT,
  })
  status: GraduationPlanStatus;

  /** Constraints used to produce this plan — stored for display and GRAD-002 replan */
  @Column({ type: 'jsonb' })
  constraints: GraduationPlanConstraints;

  /** Ordered array of planned semesters with courses */
  @Column({ type: 'jsonb', default: [] })
  semesters: PlannedSemesterData[];

  @Column({ type: 'int', default: 0 })
  totalSemesters: number;

  /** e.g. 'spring' */
  @Column({ type: 'varchar', length: 20 })
  estimatedGraduationTerm: string;

  @Column({ type: 'int' })
  estimatedGraduationYear: number;

  /** Sum of credits for all courses in the plan (not counting already-completed credits) */
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  totalCreditsPlanned: number;

  /** Sum of credits already completed at plan generation time */
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  totalCreditsCompleted: number;

  /** Overall completion % including already-completed credits */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overallCompletionPercentage: number;
}
