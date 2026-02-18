import { Entity, Column, Index } from 'typeorm';
import {
  ObjectType,
  Field,
  Float,
  Int,
  registerEnumType,
} from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';

export enum CourseCategory {
  CORE = 'core',
  ELECTIVE = 'elective',
  GENERAL_EDUCATION = 'general_education',
  LAB = 'lab',
  SEMINAR = 'seminar',
}

registerEnumType(CourseCategory, { name: 'CourseCategory' });

@ObjectType()
@Entity('courses')
@Index(['tenantId'])
@Index(['tenantId', 'code'], { unique: true })
@Index(['departmentId'])
@Index(['category'])
@Index(['courseLevel'])
export class Course extends TenantScopedEntity {
  @Field()
  @Column()
  code: string;

  @Field()
  @Column()
  title: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string;

  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  credits: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  departmentId: string;

  @Field(() => CourseCategory, { nullable: true })
  @Column({
    type: 'enum',
    enum: CourseCategory,
    nullable: true,
  })
  category: CourseCategory;

  /**
   * ONBOARD-001: Course level (100, 200, 300, 400+).
   * WHY: Used for filtering in catalog and prerequisite validation
   * (e.g., "must complete 2 courses at the 300+ level").
   */
  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  courseLevel: number;

  /**
   * ONBOARD-001: Which semesters this course is typically offered.
   * WHY: The graduation planner needs this to avoid scheduling
   * a Fall-only course in Spring.
   */
  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  offeredSemesters: string[];

  /**
   * ONBOARD-001: Explicit prerequisite course IDs (UUID array).
   * WHY: Structured data for the planner's topological sort.
   * The old `prerequisites` JSONB field is kept for freeform notes
   * (e.g., "or permission of instructor").
   */
  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  prerequisiteCourseIds: string[];

  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  corequisiteCourseIds: string[];

  /**
   * Legacy freeform prerequisites field.
   * Kept for natural language prerequisite descriptions
   * (e.g., "CS 101 with minimum C+ or permission of instructor").
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  prerequisites: Record<string, any>;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;
}
