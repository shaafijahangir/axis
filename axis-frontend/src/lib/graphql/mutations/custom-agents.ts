import { gql } from '@apollo/client';

export const CREATE_CUSTOM_AGENT_MUTATION = gql`
  mutation CreateCustomAgent($input: CreateCustomAgentInput!) {
    createCustomAgent(input: $input) {
      id
      slug
      displayName
      description
      systemPrompt
      tools
      allowedRoles
      maxTurns
      isActive
      courseId
      createdAt
    }
  }
`;

export const UPDATE_CUSTOM_AGENT_MUTATION = gql`
  mutation UpdateCustomAgent($input: UpdateCustomAgentInput!) {
    updateCustomAgent(input: $input) {
      id
      slug
      displayName
      description
      systemPrompt
      tools
      allowedRoles
      maxTurns
      isActive
      courseId
      updatedAt
    }
  }
`;

export const DELETE_CUSTOM_AGENT_MUTATION = gql`
  mutation DeleteCustomAgent($id: String!) {
    deleteCustomAgent(id: $id)
  }
`;
