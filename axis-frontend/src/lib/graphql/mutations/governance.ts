import { graphql } from '@/lib/graphql/__generated__';

export const UPDATE_AI_GOVERNANCE_CONFIG_MUTATION = graphql(`
  mutation UpdateAiGovernanceConfig($input: UpdateGovernanceConfigInput!) {
    updateAiGovernanceConfig(input: $input) {
      id
      enabled
      maxRequestsPerMinute
      maxTokensPerDay
      monthlyBudgetUsd
      updatedAt
    }
  }
`);

export const UPDATE_TOOL_PERMISSION_MUTATION = graphql(`
  mutation UpdateToolPermission($input: UpdateToolPermissionInput!) {
    updateToolPermission(input: $input) {
      id
      updatedAt
    }
  }
`);

export const RESET_TOOL_PERMISSION_MUTATION = graphql(`
  mutation ResetToolPermission($input: ResetToolPermissionInput!) {
    resetToolPermission(input: $input) {
      id
      updatedAt
    }
  }
`);
