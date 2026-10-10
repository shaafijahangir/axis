import { graphql } from '@/lib/graphql/__generated__';

export const GRADUATION_PLAN_FIELDS = graphql(`
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
`);

export const MY_GRADUATION_PLANS_QUERY = graphql(`
  query MyGraduationPlans($profileId: String!) {
    myGraduationPlans(profileId: $profileId) {
      ...GraduationPlanFields
    }
  }
`);

export const GET_TUITION_CONFIG_QUERY = graphql(`
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
`);

export const GET_FINANCIAL_AID_CONFIG_QUERY = graphql(`
  query GetFinancialAidConfig {
    getFinancialAidConfig {
      fullTimeThreshold
      halfTimeThreshold
      maxTimeframePercent
    }
  }
`);
