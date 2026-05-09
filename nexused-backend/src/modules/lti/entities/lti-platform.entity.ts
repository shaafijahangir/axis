import { Entity, Column, Index, OneToMany } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { LtiDeployment } from './lti-deployment.entity';

/**
 * LTI Platform Status
 */
export enum LtiPlatformStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending', // Awaiting configuration completion
}

registerEnumType(LtiPlatformStatus, {
  name: 'LtiPlatformStatus',
  description: 'Status of an LTI platform registration',
});

/**
 * LtiPlatform Entity
 *
 * WHY: Stores configuration for external LMS platforms (Canvas, Brightspace,
 * Moodle, etc.) that can launch Axis as an LTI 1.3 tool.
 *
 * PATTERN: Each platform registration contains the OIDC/OAuth 2.0 endpoints
 * and client credentials needed for secure launches.
 *
 * TRADEOFF: We store the issuer+clientId as a composite unique key per tenant.
 * This allows the same platform to be registered by different tenants.
 */
@ObjectType()
@Entity('lti_platforms')
@Index(['tenantId'])
@Index(['tenantId', 'issuer', 'clientId'], { unique: true })
@Index(['status'])
export class LtiPlatform extends TenantScopedEntity {
  /**
   * Human-readable name for this platform (e.g., "University Canvas")
   */
  @Field()
  @Column()
  name: string;

  /**
   * Platform issuer URL (from platform's LTI configuration)
   * Example: "https://canvas.instructure.com"
   */
  @Field()
  @Column()
  issuer: string;

  /**
   * OAuth 2.0 Client ID assigned by the platform
   */
  @Field()
  @Column()
  clientId: string;

  /**
   * Platform's OIDC authentication endpoint
   * Where we redirect users for authentication
   */
  @Field()
  @Column()
  authorizationEndpoint: string;

  /**
   * Platform's access token endpoint
   * For service-to-service calls (roster, grades, etc.)
   */
  @Field()
  @Column()
  tokenEndpoint: string;

  /**
   * Platform's JWKS endpoint
   * For verifying platform-signed JWTs
   */
  @Field()
  @Column()
  jwksEndpoint: string;

  /**
   * Registration status
   */
  @Field(() => LtiPlatformStatus)
  @Column({
    type: 'enum',
    enum: LtiPlatformStatus,
    default: LtiPlatformStatus.PENDING,
  })
  status: LtiPlatformStatus;

  /**
   * Additional platform metadata (logo URL, support contact, etc.)
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  /**
   * Deployments of this platform
   */
  @OneToMany(() => LtiDeployment, (deployment) => deployment.platform)
  deployments: LtiDeployment[];
}
