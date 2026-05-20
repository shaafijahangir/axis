import { gql } from '@apollo/client';

export const MARK_ATTENDANCE_MUTATION = gql`
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
`;
