import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiUsageLog } from './entities/ai-usage-log.entity';
import { AiService } from './ai.service';

/**
 * Tracks AI token usage and costs per tenant.
 *
 * WHY: AI costs are real money. Track from day one so we have data
 * for billing decisions later. Every Claude API call logs its usage here.
 *
 * PATTERN: Observer — called after every AI interaction to record usage.
 */

export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  requestCount: number;
}

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(
    @InjectRepository(AiUsageLog)
    private usageLogRepository: Repository<AiUsageLog>,
    private aiService: AiService,
  ) {}

  /**
   * Log a single AI interaction's usage.
   * Called after every Claude API response.
   */
  async logUsage(params: {
    tenantId: string;
    userId: string;
    agentType: string;
    conversationId?: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
  }): Promise<AiUsageLog> {
    const estimatedCost = this.aiService.estimateCost(
      params.inputTokens,
      params.outputTokens,
      params.model,
    );

    const log = this.usageLogRepository.create({
      ...params,
      estimatedCostUsd: estimatedCost,
    });

    const saved = await this.usageLogRepository.save(log);

    this.logger.debug(
      `Usage logged: ${params.agentType} — ${params.inputTokens}+${params.outputTokens} tokens, $${estimatedCost.toFixed(6)}`,
    );

    return saved;
  }

  /**
   * Get usage summary for a tenant within a date range.
   */
  async getTenantUsage(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UsageSummary> {
    const result = await this.usageLogRepository
      .createQueryBuilder('log')
      .select('COALESCE(SUM(log.inputTokens), 0)', 'totalInputTokens')
      .addSelect('COALESCE(SUM(log.outputTokens), 0)', 'totalOutputTokens')
      .addSelect('COALESCE(SUM(log.estimatedCostUsd), 0)', 'totalCostUsd')
      .addSelect('COUNT(*)', 'requestCount')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne<{
        totalInputTokens: string;
        totalOutputTokens: string;
        totalCostUsd: string;
        requestCount: string;
      }>();

    return {
      totalInputTokens: parseInt(result?.totalInputTokens ?? '0', 10),
      totalOutputTokens: parseInt(result?.totalOutputTokens ?? '0', 10),
      totalCostUsd: parseFloat(result?.totalCostUsd ?? '0'),
      requestCount: parseInt(result?.requestCount ?? '0', 10),
    };
  }

  /**
   * Get usage breakdown by agent type for a tenant.
   */
  async getUsageByAgent(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      agentType: string;
      totalTokens: number;
      totalCostUsd: number;
      requestCount: number;
    }>
  > {
    const results = await this.usageLogRepository
      .createQueryBuilder('log')
      .select('log.agentType', 'agentType')
      .addSelect('SUM(log.inputTokens + log.outputTokens)', 'totalTokens')
      .addSelect('SUM(log.estimatedCostUsd)', 'totalCostUsd')
      .addSelect('COUNT(*)', 'requestCount')
      .where('log.tenantId = :tenantId', { tenantId })
      .andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('log.agentType')
      .orderBy('"totalTokens"', 'DESC')
      .getRawMany<{
        agentType: string;
        totalTokens: string;
        totalCostUsd: string;
        requestCount: string;
      }>();

    return results.map((r) => ({
      agentType: r.agentType,
      totalTokens: parseInt(r.totalTokens ?? '0', 10),
      totalCostUsd: parseFloat(r.totalCostUsd ?? '0'),
      requestCount: parseInt(r.requestCount ?? '0', 10),
    }));
  }
}
