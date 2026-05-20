import { gql } from '@apollo/client';

export const SECTION_ATTENDANCE_QUERY = gql`
  query SectionAttendance($sectionId: String!, $date: String!) {
    sectionAttendance(sectionId: $sectionId, date: $date) {
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

export const MY_ATTENDANCE_SUMMARIES_QUERY = gql`
  query MyAttendanceSummaries {
    myAttendanceSummaries {
      userId
      sectionId
      firstName
      lastName
      total
      present
      absent
      late
      excused
      attendanceRate
    }
  }
`;

export const SECTION_ATTENDANCE_SUMMARIES_QUERY = gql`
  query SectionAttendanceSummaries($sectionId: String!) {
    sectionAttendanceSummaries(sectionId: $sectionId) {
      userId
      firstName
      lastName
      total
      present
      absent
      late
      excused
      attendanceRate
    }
  }
`;
