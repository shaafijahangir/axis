import { gql } from '@apollo/client';

export const CUSTOM_AGENTS_QUERY = gql`
  query CustomAgents {
    customAgents {
      id
      slug
      displayName
      description
      systemPrompt
      tools
      allowedRoles
      maxTurns
      model
      isActive
      courseId
      createdById
      createdBy {
        id
        firstName
        lastName
      }
      createdAt
      updatedAt
    }
  }
`;

export const CUSTOM_AGENT_QUERY = gql`
  query CustomAgent($id: String!) {
    customAgent(id: $id) {
      id
      slug
      displayName
      description
      systemPrompt
      tools
      allowedRoles
      maxTurns
      model
      isActive
      courseId
      createdById
      createdAt
      updatedAt
    }
  }
`;

export const AVAILABLE_TOOLS_QUERY = gql`
  query AvailableTools {
    availableTools {
      name
      description
      actionType
      requiredPermissions
    }
  }
`;
