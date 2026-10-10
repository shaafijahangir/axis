import { graphql } from '@/lib/graphql/__generated__';

export const UPDATE_ENROLLMENT_POLICY_MUTATION = graphql(`
  mutation UpdateEnrollmentPolicy($input: UpdateEnrollmentPolicyInput!) {
    updateEnrollmentPolicy(input: $input) {
      prerequisiteEnforcement
      creditHourLimitPerTerm
      enrollmentWindowStart
      enrollmentWindowEnd
      waitlistEnabled
      waitlistMaxSize
      waitlistAutoPromote
      waitlistConfirmationHours
    }
  }
`);
