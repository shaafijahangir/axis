import { gql } from '@apollo/client';

export const ENROLLMENT_POLICY_QUERY = gql`
  query EnrollmentPolicy {
    enrollmentPolicy {
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
