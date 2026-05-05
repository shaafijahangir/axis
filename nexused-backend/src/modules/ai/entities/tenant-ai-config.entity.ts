import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { Tenant } from '../../../database/entities/tenant.entity';
import { ActionType } from '../tools/tool.interface';

/**
 * Per-tenant AI governance configuration.
 *
 * WHY: The GovernanceService currently reads defaults from env vars and
 * tool definitions. This entity lets admins customize governance per tenant:
 * override tool action types, set rate limits, define budgets.
 *
 * PATTERN: Config entity with JSONB for flexible overrides. Null values
 * mean "use global default." This avoids migrating every time we add a config field.
 *
 * TRADEOFF: JSONB for toolOverrides instead of a separate table per tool.
 * Simpler queries, no join needed, and 16 tools is well within JSONB performance.
 */
@ObjectType()
@Entity('tenant_ai_configs')
@Index(['tenantId'], { unique: true })
export class TenantAiConfig {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  /**
   * Kill switch — when false, all AI features are disabled for this tenant.
   */
  @Field()
  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  /**
   * Per-tool action type overrides.
   * Map of tool name → action type. Only overridden tools appear here.
   * Tools not in this map use their default action type from the ToolRegistry.
   *
   * Example: { "enroll_student": "blocked", "draft_feedback": "auto" }
   */
  @Column({ type: 'jsonb', default: {} })
  toolOverrides: Record<string, ActionType>;

  /**
   * Per-tenant rate limit override. Null = use global default.
   */
  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  maxRequestsPerMinute: number | null;

  /**
   * Per-tenant daily token budget override. Null = use global default.
   */
  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', nullable: true })
  maxTokensPerDay: number | null;

  /**
   * Monthly cost cap in USD. Null = unlimited.
   * When reached, all AI requests are blocked until the next billing cycle.
   */
  @Field(() => Float, { nullable: true })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  monthlyBudgetUsd: number | null;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;
}
