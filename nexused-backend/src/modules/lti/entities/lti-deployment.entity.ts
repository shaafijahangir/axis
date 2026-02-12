import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { LtiPlatform } from './lti-platform.entity';

/**
 * LtiDeployment Entity
 *
 * WHY: A single platform (like Canvas) can have multiple deployments of
 * the same tool. Each deployment has a unique deployment_id and may have
 * different permissions or target courses.
 *
 * PATTERN: deployment_id is assigned by the platform during tool installation.
 * We need it to correctly identify which "instance" of NexusEd is being launched.
 *
 * EXAMPLE: A university might install NexusEd in their Canvas instance,
 * then later install it again for a specific department with different settings.
 */
@ObjectType()
@Entity('lti_deployments')
@Index(['tenantId'])
@Index(['platformId'])
@Index(['platformId', 'deploymentId'], { unique: true })
export class LtiDeployment extends TenantScopedEntity {
  /**
   * Reference to the parent platform
   */
  @Field()
  @Column({ name: 'platform_id' })
  platformId: string;

  @ManyToOne(() => LtiPlatform, (platform) => platform.deployments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'platform_id' })
  platform: LtiPlatform;

  /**
   * Deployment ID assigned by the platform
   * This is part of the LTI 1.3 launch claim
   */
  @Field()
  @Column({ name: 'deployment_id' })
  deploymentId: string;

  /**
   * Human-readable label for this deployment
   */
  @Field({ nullable: true })
  @Column({ nullable: true })
  label: string | null;

  /**
   * Whether this deployment is active
   */
  @Field()
  @Column({ default: true })
  isActive: boolean;

  /**
   * Service permissions granted to this deployment
   * - nrps: Names and Roles Provisioning Service (roster sync)
   * - ags: Assignment and Grade Services (grade passback)
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  services: {
    nrps?: boolean;
    ags?: boolean;
  } | null;
}
