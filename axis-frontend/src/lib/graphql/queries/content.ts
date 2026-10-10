import { graphql } from '@/lib/graphql/__generated__';

export const SECTION_CONTENTS_QUERY = graphql(`
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
`);

export const CONTENT_QUERY = graphql(`
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
`);
