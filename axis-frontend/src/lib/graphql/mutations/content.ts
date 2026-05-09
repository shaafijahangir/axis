import { gql } from '@apollo/client';

export const CREATE_CONTENT_MUTATION = gql`
  mutation CreateContent($input: CreateContentInput!) {
    createContent(input: $input) {
      id
      title
      body
      publishedAt
      position
      createdAt
    }
  }
`;

export const UPDATE_CONTENT_MUTATION = gql`
  mutation UpdateContent($input: UpdateContentInput!) {
    updateContent(input: $input) {
      id
      title
      body
      publishedAt
      position
      updatedAt
    }
  }
`;

export const PUBLISH_CONTENT_MUTATION = gql`
  mutation PublishContent($id: String!, $sectionId: String!) {
    publishContent(id: $id, sectionId: $sectionId) {
      id
      publishedAt
    }
  }
`;

export const UNPUBLISH_CONTENT_MUTATION = gql`
  mutation UnpublishContent($id: String!, $sectionId: String!) {
    unpublishContent(id: $id, sectionId: $sectionId) {
      id
      publishedAt
    }
  }
`;

export const DELETE_CONTENT_MUTATION = gql`
  mutation DeleteContent($id: String!, $sectionId: String!) {
    deleteContent(id: $id, sectionId: $sectionId)
  }
`;
