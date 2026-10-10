import { graphql } from '@/lib/graphql/__generated__';

export const CUSTOM_AGENTS_QUERY = graphql(`
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
`);

export const CUSTOM_AGENT_QUERY = graphql(`
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
`);

export const AVAILABLE_TOOLS_QUERY = graphql(`
  query AvailableTools {
    availableTools {
      name
      description
      actionType
      requiredPermissions
    }
  }
`);
