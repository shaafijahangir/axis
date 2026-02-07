import { gql } from '@apollo/client';

export const SECTION_GRADEBOOK_QUERY = gql`
  query SectionGradebook($sectionId: String!) {
    sectionGradebook(sectionId: $sectionId) {
      assignments {
        id
        title
        type
        pointsPossible
        dueAt
        averageScore
        medianScore
      }
      students {
        studentId
        firstName
        lastName
        email
        grades {
          assignmentId
          submissionId
          score
          submittedAt
          gradedAt
        }
        totalEarned
        totalPossible
        percentage
      }
      classAverage
    }
  }
`;
