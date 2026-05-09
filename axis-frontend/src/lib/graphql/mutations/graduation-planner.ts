import { gql } from '@apollo/client';

const GRADUATION_PLAN_FIELDS = gql`
  fragment GradPlanFields on GraduationPlanResult {
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
    estimatedTotalCost
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
      }
    }
    diff {
      semestersAdded
      semestersRemoved
      graduationDateChange
      added {
        courseId
        code
        title
        termKey
      }
      removed {
        courseId
        code
        title
        termKey
      }
      moved {
        courseId
        code
        title
        fromTermKey
        toTermKey
      }
    }
  }
`;

export const GENERATE_GRADUATION_PLAN_MUTATION = gql`
  ${GRADUATION_PLAN_FIELDS}
  mutation GenerateGraduationPlan($input: GenerateGraduationPlanInput!) {
    generateGraduationPlan(input: $input) {
      ...GradPlanFields
    }
  }
`;

export const ACTIVATE_GRADUATION_PLAN_MUTATION = gql`
  ${GRADUATION_PLAN_FIELDS}
  mutation ActivateGraduationPlan($planId: String!) {
    activateGraduationPlan(planId: $planId) {
      ...GradPlanFields
    }
  }
`;

export const UPDATE_TUITION_CONFIG_MUTATION = gql`
  mutation UpdateTuitionConfig($config: TuitionConfigInput!) {
    updateTuitionConfig(config: $config) {
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

export const CLEAR_TUITION_CONFIG_MUTATION = gql`
  mutation ClearTuitionConfig {
    clearTuitionConfig
  }
`;

export const UPDATE_FINANCIAL_AID_CONFIG_MUTATION = gql`
  mutation UpdateFinancialAidConfig($config: FinancialAidConfigInput!) {
    updateFinancialAidConfig(config: $config) {
      fullTimeThreshold
      halfTimeThreshold
      maxTimeframePercent
    }
  }
`;

export const CLEAR_FINANCIAL_AID_CONFIG_MUTATION = gql`
  mutation ClearFinancialAidConfig {
    clearFinancialAidConfig
  }
`;
