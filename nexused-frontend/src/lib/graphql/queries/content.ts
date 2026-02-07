import { gql } from '@apollo/client';

export const SECTION_CONTENTS_QUERY = gql`
  query SectionContents($sectionId: String!) {
    sectionContents(sectionId: $sectionId) {
      id
      title
      body
      publishedAt
      position
      createdAt
      updatedAt
      author {
        id
        firstName
        lastName
      }
    }
  }
`;

export const CONTENT_QUERY = gql`
  query Content($id: String!) {
    content(id: $id) {
      id
      sectionId
      title
      body
      publishedAt
      position
      createdAt
      updatedAt
      author {
        id
        firstName
        lastName
      }
    }
  }
`;
