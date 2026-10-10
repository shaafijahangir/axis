import { graphql } from '@/lib/graphql/__generated__';

export const MY_GRADES_QUERY = graphql(`
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
`);
