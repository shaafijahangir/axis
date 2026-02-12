import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { LtiPlatform } from './lti-platform.entity';
import { User } from '../../../database/entities/user.entity';

/**
 * LtiUser Entity
 *
 * WHY: LTI launches include a "sub" claim that uniquely identifies
 * the user on the platform. We need to map this external ID to our
 * internal User entity.
 *
 * PATTERN: Create a bridge table that links external LTI user IDs
 * to internal User IDs. This allows:
 * - First-time LTI users to be auto-created
 * - Returning LTI users to be recognized
 * - Same user on different platforms to have separate mappings
 *
 * TRADEOFF: We cache user info (name, email, roles) for convenience,
 * but the authoritative data is in our User entity.
 */
@ObjectType()
@Entity('lti_users')
@Index(['tenantId'])
@Index(['platformId'])
@Index(['platformId', 'ltiUserId'], { unique: true })
@Index(['userId'])
export class LtiUser extends TenantScopedEntity {
  /**
   * Reference to the platform this user came from
   */
  @Field()
  @Column({ name: 'platform_id' })
  platformId: string;

  @ManyToOne(() => LtiPlatform, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'platform_id' })
  platform: LtiPlatform;

  /**
   * The "sub" claim from the LTI launch
   * This is the platform's unique identifier for the user
   */
  @Field()
  @Column({ name: 'lti_user_id' })
  ltiUserId: string;

  /**
   * Linked NexusEd User
   */
  @Field()
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Cached email from LTI claims (may differ from User.email)
   */
  @Field({ nullable: true })
  @Column({ nullable: true })
  email: string | null;

  /**
   * Cached name from LTI claims
   */
  @Field({ nullable: true })
  @Column({ nullable: true })
  name: string | null;

  /**
   * LTI roles from the last launch
   * Stored for audit and role mapping purposes
   */
  @Field(() => [String], { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  ltiRoles: string[] | null;

  /**
   * Timestamp of last successful LTI launch
   */
  @Field({ nullable: true })
  @Column({ name: 'last_launch_at', nullable: true })
  lastLaunchAt: Date | null;
}
