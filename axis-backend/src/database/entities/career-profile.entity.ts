import { Entity, Column, Index } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';

/**
 * A career profile describes a job role and the academic path to reach it.
 *
 * WHY: Students need a bridge between "I want to be a data scientist" and
 * "here are the courses I should take." Career profiles provide that bridge
 * by listing required skills, recommended degree programs, and recommended
 * courses so the AI can do skill gap analysis and generate career-optimized
 * graduation plans.
 *
 * PATTERN: Admin-managed per tenant. Seeded with common careers for the
 * institution's departments. Students browse and filter.
 *
 * TRADEOFF: Storing recommendedDegreeIds and recommendedCourseIds as JSONB
 * (not FK relations) avoids cross-table constraints — career profiles outlive
 * individual program/course revisions and must not cascade-delete.
 */
@ObjectType()
@Entity('career_profiles')
@Index(['tenantId', 'category'])
@Index(['tenantId', 'isActive'])
export class CareerProfile extends TenantScopedEntity {
  /** Job title — e.g. "Data Scientist", "Registered Nurse", "Civil Engineer" */
  @Field()
  @Column({ length: 200 })
  title: string;

  /**
   * Broad category used for filtering.
   * e.g. "Technology", "Healthcare", "Business", "Education", "Engineering"
   */
  @Field()
  @Column({ length: 100 })
  category: string;

  /** Human-readable career description for the browse card and detail view */
  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Salary range in USD/year.
   * Null when not available or not relevant for this institution.
   */
  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  medianSalaryMin: number;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  medianSalaryMax: number;

  /**
   * Skills associated with this career, shown as tags.
   * e.g. ["Python", "Machine Learning", "SQL", "Statistics"]
   */
  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  requiredSkills: string[];

  /**
   * IDs of degree programs (from this tenant's catalog) that lead to this career.
   * Used for "Recommended Programs" section and career → program matching.
   */
  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  recommendedDegreeIds: string[];

  /**
   * IDs of courses (from this tenant's catalog) that build skills for this career.
   * Used for skill gap analysis: compare against student's completedCourseIds.
   */
  @Field(() => [String])
  @Column({ type: 'jsonb', default: [] })
  recommendedCourseIds: string[];

  /** Soft-delete: inactive careers are hidden from students but kept for reporting */
  @Field()
  @Column({ default: true })
  isActive: boolean;
}
