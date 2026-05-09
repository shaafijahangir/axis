import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities';
import { GovernanceService } from './governance.service';
import {
  GovernanceConfig,
  AuditLogPage,
  AuditLogFilterInput,
  UsageTrend,
  UpdateGovernanceConfigInput,
  UpdateToolPermissionInput,
  ResetToolPermissionInput,
} from './dto/governance.types';
import { TenantAiConfig } from './entities/tenant-ai-config.entity';

/**
 * GraphQL resolver for the AI Governance Console.
 *
 * WHY: Admins need to configure AI governance per tenant without touching code.
 * This surfaces GEM-002 (three-tier governance) as a configurable admin feature.
 *
 * PATTERN: Admin-only resolver. Every query and mutation requires ADMIN role.
 * All data is automatically scoped to the admin's tenant via @CurrentUser().
 */
@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GovernanceResolver {
  constructor(private governanceService: GovernanceService) {}

  // ─── Queries ────────────────────────────────────────────────────────

  /**
   * Get the full governance configuration with tool permissions and current usage.
   */
  @Query(() => GovernanceConfig)
  @Roles(UserRole.ADMIN)
  async aiGovernanceConfig(
    @CurrentUser() user: User,
  ): Promise<GovernanceConfig> {
    return this.governanceService.getGovernanceConfig(user.tenantId);
  }

  /**
   * Get paginated and filterable audit logs of AI usage.
   */
  @Query(() => AuditLogPage)
  @Roles(UserRole.ADMIN)
  async aiAuditLogs(
    @CurrentUser() user: User,
    @Args('filters', { nullable: true }) filters?: AuditLogFilterInput,
  ): Promise<AuditLogPage> {
    return this.governanceService.getAuditLogs(user.tenantId, filters ?? {});
  }

  /**
   * Get AI usage trend data for the last N days.
   */
  @Query(() => UsageTrend)
  @Roles(UserRole.ADMIN)
  async aiUsageTrend(
    @CurrentUser() user: User,
    @Args('days', { type: () => Int, nullable: true, defaultValue: 30 })
    days: number,
  ): Promise<UsageTrend> {
    return this.governanceService.getUsageTrend(user.tenantId, days);
  }

  // ─── Mutations ──────────────────────────────────────────────────────

  /**
   * Update governance configuration (rate limits, budget, enabled state).
   */
  @Mutation(() => TenantAiConfig)
  @Roles(UserRole.ADMIN)
  async updateAiGovernanceConfig(
    @CurrentUser() user: User,
    @Args('input') input: UpdateGovernanceConfigInput,
  ): Promise<TenantAiConfig> {
    return this.governanceService.updateConfig(user.tenantId, {
      enabled: input.enabled,
      maxRequestsPerMinute: input.maxRequestsPerMinute,
      maxTokensPerDay: input.maxTokensPerDay,
      monthlyBudgetUsd: input.monthlyBudgetUsd,
    });
  }

  /**
   * Override a tool's action type for this tenant.
   * Takes effect immediately on the next AI interaction.
   */
  @Mutation(() => TenantAiConfig)
  @Roles(UserRole.ADMIN)
  async updateToolPermission(
    @CurrentUser() user: User,
    @Args('input') input: UpdateToolPermissionInput,
  ): Promise<TenantAiConfig> {
    return this.governanceService.setToolOverride(
      user.tenantId,
      input.toolName,
      input.actionType,
    );
  }

  /**
   * Reset a tool to its default action type (remove the tenant override).
   */
  @Mutation(() => TenantAiConfig)
  @Roles(UserRole.ADMIN)
  async resetToolPermission(
    @CurrentUser() user: User,
    @Args('input') input: ResetToolPermissionInput,
  ): Promise<TenantAiConfig> {
    return this.governanceService.resetToolOverride(
      user.tenantId,
      input.toolName,
    );
  }
}
