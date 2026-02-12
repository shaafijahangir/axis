import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { LtiDeployment } from './lti-deployment.entity';
import { CourseSection } from '../../../database/entities/course-section.entity';

/**
 * LtiContext Entity
 *
 * WHY: When an LTI launch occurs, the platform sends a "context" claim
 * that identifies the course/section the user is in. We need to map
 * this external context to our internal CourseSection.
 *
 * PATTERN: Store the external context_id and link it to our section.
 * This allows roster sync and grade passback to work correctly.
 *
 * TRADEOFF: We cache context information (title, label) to avoid
 * needing API calls for display purposes, but the source of truth
 * is always the platform.
 */
@ObjectType()
@Entity('lti_contexts')
@Index(['tenantId'])
@Index(['deploymentId'])
@Index(['deploymentId', 'contextId'], { unique: true })
@Index(['sectionId'])
export class LtiContext extends TenantScopedEntity {
  /**
   * Reference to the deployment this context belongs to
   */
  @Field()
  @Column({ name: 'deployment_id' })
  deploymentId: string;

  @ManyToOne(() => LtiDeployment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deployment_id' })
  deployment: LtiDeployment;

  /**
   * External context ID from the LTI launch
   * This is the platform's course/section identifier
   */
  @Field()
  @Column({ name: 'context_id' })
  contextId: string;

  /**
   * Context type from the LTI claim (usually "CourseSection")
   */
  @Field({ nullable: true })
  @Column({ nullable: true })
  contextType: string | null;

  /**
   * Cached context title from the platform
   */
  @Field({ nullable: true })
  @Column({ nullable: true })
  title: string | null;

  /**
   * Cached context label (short code) from the platform
   */
  @Field({ nullable: true })
  @Column({ nullable: true })
  label: string | null;

  /**
   * Linked NexusEd CourseSection (if mapped)
   * An admin or instructor must link the LTI context to a section
   */
  @Field({ nullable: true })
  @Column({ name: 'section_id', nullable: true })
  sectionId: string | null;

  @ManyToOne(() => CourseSection, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'section_id' })
  section: CourseSection | null;

  /**
   * Whether this context is actively linked
   * false = context exists but not linked to a NexusEd section
   */
  @Field()
  @Column({ default: false })
  isLinked: boolean;

  /**
   * LTI services available for this context
   * Populated from the launch claims
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  services: {
    nrps?: {
      contextMembershipsUrl?: string;
      serviceVersions?: string[];
    };
    ags?: {
      lineitemsUrl?: string;
      lineitemUrl?: string;
      scope?: string[];
    };
  } | null;
}
