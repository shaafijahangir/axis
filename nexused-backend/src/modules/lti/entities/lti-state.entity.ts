import {
  Entity,
  Column,
  Index,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm';

/**
 * LtiState Entity
 *
 * WHY: OIDC login flow requires a "state" parameter to prevent CSRF attacks.
 * We generate a random state on login initiation, store it here, and verify
 * it when the user returns from the platform's auth endpoint.
 *
 * PATTERN: State is short-lived (10 minutes by default). We store the
 * platform ID and nonce alongside state so we can validate the entire
 * flow when the launch completes.
 *
 * TRADEOFF: Using a database table instead of Redis/memory means:
 * - State survives server restarts
 * - Works across multiple backend instances
 * - Requires periodic cleanup (delete expired records)
 */
@Entity('lti_states')
@Index(['expiresAt']) // For efficient cleanup of expired states
export class LtiState {
  /**
   * The random state value (used as primary key)
   */
  @PrimaryColumn()
  state: string;

  /**
   * Platform ID this state is for
   * Used to look up platform config during launch
   */
  @Column({ name: 'platform_id' })
  platformId: string;

  /**
   * Tenant ID (for multi-tenant validation)
   */
  @Column({ name: 'tenant_id' })
  tenantId: string;

  /**
   * Nonce for replay attack prevention
   */
  @Column()
  nonce: string;

  /**
   * Expected redirect URL after launch
   * Stored so we know where to send the user
   */
  @Column({ name: 'target_link_uri', nullable: true })
  targetLinkUri: string | null;

  /**
   * Login hint from the platform (if provided)
   */
  @Column({ name: 'login_hint', nullable: true })
  loginHint: string | null;

  /**
   * LTI message hint (if provided)
   */
  @Column({ name: 'lti_message_hint', nullable: true, type: 'text' })
  ltiMessageHint: string | null;

  /**
   * When this state expires
   */
  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
