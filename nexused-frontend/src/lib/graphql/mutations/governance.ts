import { gql } from '@apollo/client';

export const UPDATE_AI_GOVERNANCE_CONFIG_MUTATION = gql`
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
`;

export const UPDATE_TOOL_PERMISSION_MUTATION = gql`
  mutation UpdateToolPermission($input: UpdateToolPermissionInput!) {
    updateToolPermission(input: $input) {
      id
      toolOverrides
      updatedAt
    }
  }
`;

export const RESET_TOOL_PERMISSION_MUTATION = gql`
  mutation ResetToolPermission($input: ResetToolPermissionInput!) {
    resetToolPermission(input: $input) {
      id
      toolOverrides
      updatedAt
    }
  }
`;
