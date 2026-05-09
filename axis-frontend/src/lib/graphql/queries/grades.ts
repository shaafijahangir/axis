import { gql } from '@apollo/client';

export const MY_GRADES_QUERY = gql`
  query MyGrades {
    myGrades {
      sectionId
      courseId
      courseCode
      courseTitle
      sectionInstructor
      totalPointsEarned
      totalPointsPossible
      overallPercentage
      assignments {
        assignmentId
        assignmentTitle
        assignmentType
        pointsPossible
        score
        percentage
        gradedAt
        feedback
      }
    }
  }
`;
