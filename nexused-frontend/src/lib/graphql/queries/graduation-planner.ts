import { gql } from '@apollo/client';

const GRADUATION_PLAN_FIELDS = gql`
  fragment GraduationPlanFields on GraduationPlanResult {
    id
    profileId
    degreeProgramId
    status
    totalSemesters
    estimatedGraduationTerm
    estimatedGraduationYear
    totalCreditsPlanned
    totalCreditsCompleted
    overallCompletionPercentage
    createdAt
    constraints {
      maxCreditsPerSemester
      startTerm
      startYear
      includeSummer
      excludedTermKeys
    }
    semesters {
      termKey
      term
      year
      totalCredits
      cumulativeCredits
      completionPercentage
      courses {
        courseId
        code
        title
        credits
        fulfillsRequirement
      }
    }
  }
`;

export const MY_GRADUATION_PLANS_QUERY = gql`
  ${GRADUATION_PLAN_FIELDS}
  query MyGraduationPlans($profileId: String!) {
    myGraduationPlans(profileId: $profileId) {
      ...GraduationPlanFields
    }
  }
`;
