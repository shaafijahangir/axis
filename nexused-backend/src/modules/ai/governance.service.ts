import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ActionType, AgentContext } from './tools/tool.interface';
import { ToolRegistry } from './tools/tool-registry';
import { AiUsageLog } from './entities/ai-usage-log.entity';

/**
 * Controls what AI agents are allowed to do.
 *
 * WHY: Education context requires safety rails. An AI shouldn't auto-delete
 * a course or change grades without human review. Governance defines
 * per-tool action types: auto (just do it), suggest (propose to human),
 * blocked (never).
 *
 * PATTERN: Policy pattern — governance rules are checked before tool execution.
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
  ) {}

  /**
   * Check if a tool invocation is allowed for the given context.
   * Returns the action type and whether it's permitted.
   */
  async checkToolPermission(
    toolName: string,
    ctx: AgentContext,
  ): Promise<GovernanceDecision> {
    const tool = this.toolRegistry.get(toolName);
    if (!tool) {
      return {
        allowed: false,
        actionType: 'blocked',
        reason: `Unknown tool: "${toolName}"`,
      };
    }

    // Check if tool is blocked entirely
    if (tool.actionType === 'blocked') {
      return {
        allowed: false,
        actionType: 'blocked',
        reason: `Tool "${toolName}" is blocked by governance policy`,
      };
    }

    // Check rate limits
    const rateLimitOk = await this.checkRateLimit(ctx.tenantId, ctx.userId);
    if (!rateLimitOk) {
      return {
        allowed: false,
        actionType: 'blocked',
        reason: 'Rate limit exceeded',
      };
    }

    return {
      allowed: true,
      actionType: tool.actionType,
    };
  }

  /**
   * Check if the user/tenant is within rate limits.
   * Uses a 1-minute sliding window for request count.
   */
  async checkRateLimit(tenantId: string, userId: string): Promise<boolean> {
    const maxRpm = this.configService.get<number>(
      'ai.rateLimits.maxRequestsPerMinute',
    )!;

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
  async checkDailyTokenBudget(tenantId: string): Promise<boolean> {
    const maxTokensPerDay = this.configService.get<number>(
      'ai.rateLimits.maxTokensPerDay',
    )!;

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
}
