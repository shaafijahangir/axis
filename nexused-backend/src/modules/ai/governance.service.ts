import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ActionType, AgentContext } from './tools/tool.interface';
import { ToolRegistry } from './tools/tool-registry';
import { AiUsageLog } from './entities/ai-usage-log.entity';
import { TenantAiConfig } from './entities/tenant-ai-config.entity';
import {
  GovernanceActionType,
  ToolPermission,
  GovernanceConfig,
  AuditLogPage,
  AuditLogFilterInput,
  DailyUsagePoint,
  UsageTrend,
} from './dto/governance.types';

/**
 * Controls what AI agents are allowed to do.
 *
 * WHY: Education context requires safety rails. An AI shouldn't auto-delete
 * a course or change grades without human review. Governance defines
 * per-tool action types: auto (just do it), suggest (propose to human),
 * blocked (never).
 *
 * PATTERN: Policy pattern — governance rules are checked before tool execution.
 * Per-tenant overrides are stored in TenantAiConfig (JSONB).
 * Rate limiting uses a sliding window on the usage_logs table.
 *
 * TRADEOFF: Checking rate limits against Postgres instead of Redis.
 * Simpler for now; move to Redis counter when we hit scale issues.
 */

export interface GovernanceDecision {
  allowed: boolean;
  actionType: ActionType;
  reason?: string;
}

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(
    private toolRegistry: ToolRegistry,
    private configService: ConfigService,
    @InjectRepository(AiUsageLog)
    private usageLogRepository: Repository<AiUsageLog>,
    @InjectRepository(TenantAiConfig)
    private tenantAiConfigRepository: Repository<TenantAiConfig>,
  ) {}

  // ─── Core Governance Checks ───────────────────────────────────────────

  /**
   * Check if a tool invocation is allowed for the given context.
   * Returns the action type and whether it's permitted.
   */
  async checkToolPermission(
    toolName: string,
    ctx: AgentContext,
  ): Promise<GovernanceDecision> {
    // Check if AI is enabled for this tenant
    const config = await this.getOrCreateConfig(ctx.tenantId);
    if (!config.enabled) {
      return {
        allowed: false,
        actionType: 'blocked',
        reason: 'AI features are disabled for this institution',
      };
    }

    const tool = this.toolRegistry.get(toolName);
    if (!tool) {
      return {
        allowed: false,
        actionType: 'blocked',
        reason: `Unknown tool: "${toolName}"`,
      };
    }

    // Resolve effective action type (tenant override → tool default)
    const effectiveActionType = this.resolveActionType(
      toolName,
      tool.actionType,
      config,
    );

    if (effectiveActionType === 'blocked') {
      return {
        allowed: false,
        actionType: 'blocked',
        reason: `Tool "${toolName}" is blocked by governance policy`,
      };
    }

    // Check rate limits
    const rateLimitOk = await this.checkRateLimit(
      ctx.tenantId,
      ctx.userId,
      config,
    );
    if (!rateLimitOk) {
      return {
        allowed: false,
        actionType: 'blocked',
        reason: 'Rate limit exceeded',
      };
    }

    // Check daily token budget
    const tokenBudgetOk = await this.checkDailyTokenBudget(
      ctx.tenantId,
      config,
    );
    if (!tokenBudgetOk) {
      return {
        allowed: false,
        actionType: 'blocked',
        reason: 'Daily token budget exceeded',
      };
    }

    // Check monthly cost budget
    const monthlyBudgetOk = await this.checkMonthlyBudget(ctx.tenantId, config);
    if (!monthlyBudgetOk) {
      return {
        allowed: false,
        actionType: 'blocked',
        reason: 'Monthly cost budget exceeded',
      };
    }

    return {
      allowed: true,
      actionType: effectiveActionType,
    };
  }

  /**
   * Check if the user/tenant is within rate limits.
   * Uses a 1-minute sliding window on the usage_logs table.
   */
  async checkRateLimit(
    tenantId: string,
    userId: string,
    config?: TenantAiConfig,
  ): Promise<boolean> {
    const resolvedConfig = config ?? (await this.getOrCreateConfig(tenantId));
    const maxRpm =
      resolvedConfig.maxRequestsPerMinute ??
      this.configService.get<number>('ai.rateLimits.maxRequestsPerMinute')!;

    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentCount = await this.usageLogRepository.count({
      where: {
        tenantId,
        userId,
        createdAt: MoreThan(oneMinuteAgo),
      },
    });

    if (recentCount >= maxRpm) {
      this.logger.warn(
        `Rate limit hit for user ${userId} in tenant ${tenantId}: ${recentCount}/${maxRpm} rpm`,
      );
      return false;
    }

    return true;
  }

  /**
   * Check daily token budget for a tenant.
   */
  async checkDailyTokenBudget(
    tenantId: string,
    config?: TenantAiConfig,
  ): Promise<boolean> {
    const resolvedConfig = config ?? (await this.getOrCreateConfig(tenantId));
    const maxTokensPerDay =
      resolvedConfig.maxTokensPerDay ??
      this.configService.get<number>('ai.rateLimits.maxTokensPerDay')!;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await this.usageLogRepository
      .createQueryBuilder('log')
      .select('COALESCE(SUM(log.inputTokens + log.outputTokens), 0)', 'total')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt >= :startOfDay', { startOfDay })
      .getRawOne();

    const totalTokens = parseInt(result?.total || '0', 10);
    return totalTokens < maxTokensPerDay;
  }

  /**
   * Check monthly cost budget for a tenant.
   * Returns true if no budget is set or budget is not exceeded.
   */
  async checkMonthlyBudget(
    tenantId: string,
    config?: TenantAiConfig,
  ): Promise<boolean> {
    const resolvedConfig = config ?? (await this.getOrCreateConfig(tenantId));

    if (
      resolvedConfig.monthlyBudgetUsd === null ||
      resolvedConfig.monthlyBudgetUsd === undefined
    ) {
      return true; // No monthly budget cap
    }

    const currentMonthCost = await this.getCurrentMonthCost(tenantId);
    return currentMonthCost < Number(resolvedConfig.monthlyBudgetUsd);
  }

  // ─── Config Management ────────────────────────────────────────────────

  /**
   * Get or create the tenant AI config.
   * Creates a default config on first access.
   */
  async getOrCreateConfig(tenantId: string): Promise<TenantAiConfig> {
    let config = await this.tenantAiConfigRepository.findOne({
      where: { tenantId },
    });

    if (!config) {
      config = this.tenantAiConfigRepository.create({
        tenantId,
        enabled: true,
        toolOverrides: {},
        maxRequestsPerMinute: null,
        maxTokensPerDay: null,
        monthlyBudgetUsd: null,
      });
      config = await this.tenantAiConfigRepository.save(config);
      this.logger.log(`Created default AI config for tenant ${tenantId}`);
    }

    return config;
  }

  /**
   * Update governance configuration for a tenant.
   */
  async updateConfig(
    tenantId: string,
    updates: Partial<
      Pick<
        TenantAiConfig,
        | 'enabled'
        | 'maxRequestsPerMinute'
        | 'maxTokensPerDay'
        | 'monthlyBudgetUsd'
      >
    >,
  ): Promise<TenantAiConfig> {
    const config = await this.getOrCreateConfig(tenantId);

    if (updates.enabled !== undefined) config.enabled = updates.enabled;
    if (updates.maxRequestsPerMinute !== undefined)
      config.maxRequestsPerMinute = updates.maxRequestsPerMinute;
    if (updates.maxTokensPerDay !== undefined)
      config.maxTokensPerDay = updates.maxTokensPerDay;
    if (updates.monthlyBudgetUsd !== undefined)
      config.monthlyBudgetUsd = updates.monthlyBudgetUsd;

    return this.tenantAiConfigRepository.save(config);
  }

  /**
   * Set a tool action type override for a tenant.
   */
  async setToolOverride(
    tenantId: string,
    toolName: string,
    actionType: ActionType,
  ): Promise<TenantAiConfig> {
    const tool = this.toolRegistry.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: "${toolName}"`);
    }

    const config = await this.getOrCreateConfig(tenantId);
    config.toolOverrides = {
      ...config.toolOverrides,
      [toolName]: actionType,
    };

    return this.tenantAiConfigRepository.save(config);
  }

  /**
   * Reset a tool to its default action type (remove override).
   */
  async resetToolOverride(
    tenantId: string,
    toolName: string,
  ): Promise<TenantAiConfig> {
    const config = await this.getOrCreateConfig(tenantId);
    const overrides = { ...config.toolOverrides };
    delete overrides[toolName];
    config.toolOverrides = overrides;

    return this.tenantAiConfigRepository.save(config);
  }

  // ─── Query Methods ────────────────────────────────────────────────────

  /**
   * Get all tool permissions with effective action types for a tenant.
   */
  async getToolPermissions(tenantId: string): Promise<ToolPermission[]> {
    const config = await this.getOrCreateConfig(tenantId);
    const toolNames = this.toolRegistry.getToolNames();

    return toolNames.map((name) => {
      const tool = this.toolRegistry.get(name)!;
      const overrideType = config.toolOverrides[name] as ActionType | undefined;
      const effectiveType = overrideType ?? tool.actionType;

      return {
        toolName: name,
        description: tool.description,
        defaultActionType: tool.actionType as GovernanceActionType,
        effectiveActionType: effectiveType as GovernanceActionType,
        isOverridden: overrideType !== undefined,
        requiredPermissions: tool.requiredPermissions,
      };
    });
  }

  /**
   * Get full governance config with computed fields.
   */
  async getGovernanceConfig(tenantId: string): Promise<GovernanceConfig> {
    const config = await this.getOrCreateConfig(tenantId);
    const toolPermissions = await this.getToolPermissions(tenantId);
    const currentMonthCost = await this.getCurrentMonthCost(tenantId);
    const currentDayTokens = await this.getCurrentDayTokens(tenantId);

    return {
      enabled: config.enabled,
      effectiveMaxRequestsPerMinute:
        config.maxRequestsPerMinute ??
        this.configService.get<number>('ai.rateLimits.maxRequestsPerMinute')!,
      effectiveMaxTokensPerDay:
        config.maxTokensPerDay ??
        this.configService.get<number>('ai.rateLimits.maxTokensPerDay')!,
      monthlyBudgetUsd:
        config.monthlyBudgetUsd !== null
          ? Number(config.monthlyBudgetUsd)
          : null,
      currentMonthCostUsd: currentMonthCost,
      currentDayTokensUsed: currentDayTokens,
      totalToolOverrides: Object.keys(config.toolOverrides).length,
      toolPermissions,
    };
  }

  /**
   * Get paginated audit logs for a tenant.
   */
  async getAuditLogs(
    tenantId: string,
    filters: AuditLogFilterInput,
  ): Promise<AuditLogPage> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const qb = this.usageLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.tenantId = :tenantId', { tenantId });

    if (filters.userId) {
      qb.andWhere('log.userId = :userId', { userId: filters.userId });
    }
    if (filters.agentType) {
      qb.andWhere('log.agentType = :agentType', {
        agentType: filters.agentType,
      });
    }
    if (filters.startDate) {
      qb.andWhere('log.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }
    if (filters.endDate) {
      qb.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
    }

    qb.orderBy('log.createdAt', 'DESC').skip(skip).take(pageSize);

    const [logs, totalCount] = await qb.getManyAndCount();

    return {
      entries: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        userFirstName: log.user?.firstName ?? 'Unknown',
        userLastName: log.user?.lastName ?? 'User',
        userEmail: log.user?.email ?? '',
        agentType: log.agentType,
        conversationId: log.conversationId,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        estimatedCostUsd: Number(log.estimatedCostUsd),
        model: log.model,
        createdAt: log.createdAt,
      })),
      totalCount,
      page,
      pageSize,
      hasMore: skip + pageSize < totalCount,
    };
  }

  /**
   * Get daily usage trend for the last N days.
   */
  async getUsageTrend(
    tenantId: string,
    days: number = 30,
  ): Promise<UsageTrend> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const results = await this.usageLogRepository
      .createQueryBuilder('log')
      .select("TO_CHAR(log.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'requests')
      .addSelect(
        'COALESCE(SUM(log.inputTokens + log.outputTokens), 0)',
        'tokens',
      )
      .addSelect('COALESCE(SUM(log.estimatedCostUsd), 0)', 'costUsd')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt >= :startDate', { startDate })
      .groupBy("TO_CHAR(log.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    const dailyUsage: DailyUsagePoint[] = results.map((r) => ({
      date: r.date,
      requests: parseInt(r.requests || '0', 10),
      tokens: parseInt(r.tokens || '0', 10),
      costUsd: parseFloat(r.costUsd || '0'),
    }));

    const totalRequests = dailyUsage.reduce((sum, d) => sum + d.requests, 0);
    const totalTokens = dailyUsage.reduce((sum, d) => sum + d.tokens, 0);
    const totalCostUsd = dailyUsage.reduce((sum, d) => sum + d.costUsd, 0);

    return { dailyUsage, totalRequests, totalTokens, totalCostUsd };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Resolve the effective action type for a tool, considering tenant overrides.
   */
  private resolveActionType(
    toolName: string,
    defaultActionType: ActionType,
    config: TenantAiConfig,
  ): ActionType {
    const override = config.toolOverrides[toolName] as ActionType | undefined;
    return override ?? defaultActionType;
  }

  /**
   * Get total cost for the current calendar month.
   */
  private async getCurrentMonthCost(tenantId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await this.usageLogRepository
      .createQueryBuilder('log')
      .select('COALESCE(SUM(log.estimatedCostUsd), 0)', 'total')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt >= :startOfMonth', { startOfMonth })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * Get total tokens used today.
   */
  private async getCurrentDayTokens(tenantId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await this.usageLogRepository
      .createQueryBuilder('log')
      .select('COALESCE(SUM(log.inputTokens + log.outputTokens), 0)', 'total')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt >= :startOfDay', { startOfDay })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }
}
