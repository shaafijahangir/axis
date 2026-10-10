import { graphql } from '@/lib/graphql/__generated__';

export const MARK_ATTENDANCE_MUTATION = graphql(`
  mutation MarkAttendance($input: MarkAttendanceInput!) {
    markAttendance(input: $input) {
      date
      records {
        id
        userId
        firstName
        lastName
        status
        notes
      }
    }
  }
`);
