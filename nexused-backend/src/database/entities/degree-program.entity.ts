import { Entity, Column, Index } from 'typeorm';
import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';

/**
 * A requirement group within a degree program.
 *
 * WHY JSONB: Degree requirements are complex and vary wildly between
 * institutions. JSONB lets each requirement group specify different
 * rules (pick N from list, complete all, minimum credits) without
 * creating a normalized table for every variation.
 *
 * TRADEOFF: Less queryable than separate tables, but degree requirements
 * are always loaded as a whole, never queried individually.
 */
export interface RequirementGroup {
  /** Display name, e.g. "Core Requirements", "Math Electives" */
  name: string;

  /** Category of requirement */
  type: 'core' | 'elective' | 'general_education' | 'concentration';

  /** Total credits needed from this group */
  creditsRequired: number;

  /** Course IDs that can satisfy this requirement */
  courseIds: string[];

  /** Minimum number of courses to complete from the list (0 = use credits only) */
  minCoursesRequired: number;

  /** Optional description for students */
  description?: string;
}

export enum DegreeProgramType {
  MAJOR = 'major',
  MINOR = 'minor',
  CERTIFICATE = 'certificate',
  DIPLOMA = 'diploma',
}

export enum DegreeProgramStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DRAFT = 'draft',
}

registerEnumType(DegreeProgramType, {
  name: 'DegreeProgramType',
  description: 'Type of degree program (major, minor, certificate, diploma)',
});

registerEnumType(DegreeProgramStatus, {
  name: 'DegreeProgramStatus',
  description: 'Status of a degree program',
});

/**
 * Degree program definition (e.g., "BS Computer Science").
 *
 * WHY: The AI Course Planner needs structured degree data to reason about
 * student progress, prerequisites, and course recommendations. Without
 * this entity, the planner would have nothing to plan against.
 *
 * PATTERN: Tenant-scoped entity — each institution defines its own
 * degree programs with its own courses and requirements.
 */
@ObjectType()
@Entity('degree_programs')
@Index(['tenantId'])
@Index(['tenantId', 'code'], { unique: true })
export class DegreeProgram extends TenantScopedEntity {
  @Field()
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Field()
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  department: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * ONBOARD-001: What kind of program this is.
   * WHY: A student might pursue a major AND a minor simultaneously.
   * The graduation planner needs to know program type to combine
   * requirements correctly and calculate total credits.
   */
  @Field(() => DegreeProgramType, { nullable: true })
  @Column({
    type: 'enum',
    enum: DegreeProgramType,
    nullable: true,
  })
  programType: DegreeProgramType;

  @Field(() => Int)
  @Column({ type: 'int' })
  totalCreditsRequired: number;

  /**
   * ONBOARD-001: Expected duration in semesters (e.g., 8 for a 4-year degree).
   * WHY: The graduation planner uses this as a baseline when generating
   * plans and calculating if a student is on track.
   */
  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  expectedDurationSemesters: number;

  /**
   * ONBOARD-001: Which catalog year this program definition applies to.
   * WHY: Degree requirements change between catalog years. A student
   * follows the requirements from their enrollment year.
   */
  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 9, nullable: true })
  catalogYear: string;

  /**
   * Structured requirement groups — core, electives, general ed, etc.
   * Each group specifies which courses satisfy it and how many credits/courses are needed.
   */
  @Field(() => String, {
    description: 'JSON array of requirement groups',
  })
  @Column({ type: 'jsonb', default: [] })
  requirements: RequirementGroup[];

  @Field(() => DegreeProgramStatus)
  @Column({
    type: 'enum',
    enum: DegreeProgramStatus,
    default: DegreeProgramStatus.DRAFT,
  })
  status: DegreeProgramStatus;
}
