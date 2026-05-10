import { gql } from '@apollo/client';

export const UPDATE_ENROLLMENT_POLICY_MUTATION = gql`
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
`;
