import { gql } from '@apollo/client';

export const SCHOOL_ANNOUNCEMENTS_QUERY = gql`
  query SchoolAnnouncements($grade: Int) {
    schoolAnnouncements(grade: $grade) {
      id
      title
      body
      scope
      targetGrade
      priority
      pinned
      createdAt
      author {
        id
        firstName
        lastName
      }
    }
  }
`;
