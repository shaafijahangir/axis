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
    estimatedTotalCost
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
      estimatedCost
      estimatedCumulativeCost
      aidStatus {
        isFullTime
        isHalfTime
        aidWarning
        sapWarning
      }
      courses {
        courseId
        code
        title
        credits
        fulfillsRequirement
        availabilityWarning
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

export const GET_TUITION_CONFIG_QUERY = gql`
  query GetTuitionConfig {
    getTuitionConfig {
      perCreditCost
      flatRateMin
      flatRateMax
      flatRateCost
      summerPerCreditCost
      fees {
        name
        amount
        type
      }
    }
  }
`;

export const GET_FINANCIAL_AID_CONFIG_QUERY = gql`
  query GetFinancialAidConfig {
    getFinancialAidConfig {
      fullTimeThreshold
      halfTimeThreshold
      maxTimeframePercent
    }
  }
`;
