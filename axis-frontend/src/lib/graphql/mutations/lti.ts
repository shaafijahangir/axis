import { gql } from '@apollo/client';

export const CREATE_LTI_PLATFORM_MUTATION = gql`
  mutation CreateLtiPlatform($input: CreateLtiPlatformInput!) {
    createLtiPlatform(input: $input) {
      id
      name
      issuer
      clientId
      authorizationEndpoint
      tokenEndpoint
      jwksEndpoint
      status
      createdAt
    }
  }
`;

export const UPDATE_LTI_PLATFORM_MUTATION = gql`
  mutation UpdateLtiPlatform($input: UpdateLtiPlatformInput!) {
    updateLtiPlatform(input: $input) {
      id
      name
      authorizationEndpoint
      tokenEndpoint
      jwksEndpoint
      status
      updatedAt
    }
  }
`;

export const DELETE_LTI_PLATFORM_MUTATION = gql`
  mutation DeleteLtiPlatform($id: String!) {
    deleteLtiPlatform(id: $id)
  }
`;

export const CREATE_LTI_DEPLOYMENT_MUTATION = gql`
  mutation CreateLtiDeployment($input: CreateLtiDeploymentInput!) {
    createLtiDeployment(input: $input) {
      id
      platformId
      deploymentId
      label
      isActive
      createdAt
    }
  }
`;

export const LINK_LTI_CONTEXT_MUTATION = gql`
  mutation LinkLtiContext($input: LinkLtiContextInput!) {
    linkLtiContext(input: $input) {
      id
      contextId
      sectionId
      isLinked
    }
  }
`;

export const UNLINK_LTI_CONTEXT_MUTATION = gql`
  mutation UnlinkLtiContext($contextId: String!) {
    unlinkLtiContext(contextId: $contextId) {
      id
      contextId
      sectionId
      isLinked
    }
  }
`;
