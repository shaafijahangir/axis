import { gql } from '@apollo/client';

export const LTI_TOOL_CONFIGURATION_QUERY = gql`
  query LtiToolConfiguration {
    ltiToolConfiguration {
      issuer
      clientId
      oidcLoginUrl
      launchUrl
      jwksUrl
      deepLinkUrl
      scopes
    }
  }
`;

export const LTI_PLATFORMS_QUERY = gql`
  query LtiPlatforms {
    ltiPlatforms {
      id
      name
      issuer
      clientId
      status
      deploymentCount
      userCount
      createdAt
    }
  }
`;

export const LTI_PLATFORM_QUERY = gql`
  query LtiPlatform($id: String!) {
    ltiPlatform(id: $id) {
      id
      name
      issuer
      clientId
      authorizationEndpoint
      tokenEndpoint
      jwksEndpoint
      status
      metadata
      createdAt
      updatedAt
    }
  }
`;

export const LTI_DEPLOYMENTS_QUERY = gql`
  query LtiDeployments($platformId: String!) {
    ltiDeployments(platformId: $platformId) {
      id
      platformId
      deploymentId
      label
      isActive
      services
      createdAt
      updatedAt
    }
  }
`;

export const LTI_UNLINKED_CONTEXTS_QUERY = gql`
  query LtiUnlinkedContexts {
    ltiUnlinkedContexts {
      id
      deploymentId
      contextId
      contextType
      title
      label
      sectionId
      isLinked
      services
      createdAt
    }
  }
`;
