import { gql } from '@apollo/client';

export const AI_GOVERNANCE_CONFIG_QUERY = gql`
  query AiGovernanceConfig {
    aiGovernanceConfig {
      enabled
      effectiveMaxRequestsPerMinute
      effectiveMaxTokensPerDay
      monthlyBudgetUsd
      currentMonthCostUsd
      currentDayTokensUsed
      totalToolOverrides
      toolPermissions {
        toolName
        description
        defaultActionType
        effectiveActionType
        isOverridden
        requiredPermissions
      }
    }
  }
`;

export const AI_AUDIT_LOGS_QUERY = gql`
  query AiAuditLogs($filters: AuditLogFilterInput) {
    aiAuditLogs(filters: $filters) {
      entries {
        id
        userId
        userFirstName
        userLastName
        userEmail
        agentType
        conversationId
        inputTokens
        outputTokens
        estimatedCostUsd
        model
        createdAt
      }
      totalCount
      page
      pageSize
      hasMore
    }
  }
`;

export const AI_USAGE_TREND_QUERY = gql`
  query AiUsageTrend($days: Int) {
    aiUsageTrend(days: $days) {
      dailyUsage {
        date
        requests
        tokens
        costUsd
      }
      totalRequests
      totalTokens
      totalCostUsd
    }
  }
`;
