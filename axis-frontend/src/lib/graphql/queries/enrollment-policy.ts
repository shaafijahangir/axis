import { graphql } from '@/lib/graphql/__generated__';

export const ENROLLMENT_POLICY_QUERY = graphql(`
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
`);
