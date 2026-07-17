import { gql } from '@apollo/client';

// FEAT-018: Office-hours booking queries.

/** Instructor's own blocks (management view — includes inactive). */
export const MY_OFFICE_HOUR_BLOCKS_QUERY = gql`
  query MyOfficeHourBlocks {
    myOfficeHourBlocks {
      id
      instructorId
      dayOfWeek
      startTime
      endTime
      slotMinutes
      locationType
      location
      meetingUrl
      active
    }
  }
`;

/** Active blocks for a given instructor (student-facing). */
export const OFFICE_HOUR_BLOCKS_QUERY = gql`
  query OfficeHourBlocks($instructorId: String!) {
    officeHourBlocks(instructorId: $instructorId) {
      id
      instructorId
      dayOfWeek
      startTime
      endTime
      slotMinutes
      locationType
      location
      meetingUrl
      active
    }
  }
`;

/** Open slots for an instructor across a date range. */
export const AVAILABLE_OFFICE_HOUR_SLOTS_QUERY = gql`
  query AvailableOfficeHourSlots($input: AvailableSlotsInput!) {
    availableOfficeHourSlots(input: $input) {
      blockId
      instructorId
      date
      startTime
      endTime
      locationType
      location
      meetingUrl
    }
  }
`;

/** FEAT-019: Current instructor's recurring busy blocks. */
export const MY_BUSY_BLOCKS_QUERY = gql`
  query MyBusyBlocks {
    myBusyBlocks {
      id
      dayOfWeek
      startTime
      endTime
      label
    }
  }
`;

/** Current student's upcoming bookings. */
export const MY_BOOKINGS_QUERY = gql`
  query MyBookings {
    myBookings {
      id
      date
      startTime
      endTime
      status
      note
      instructor {
        id
        firstName
        lastName
      }
      block {
        id
        dayOfWeek
        locationType
        location
        meetingUrl
      }
    }
  }
`;

/** Current instructor's upcoming bookings. */
export const INSTRUCTOR_BOOKINGS_QUERY = gql`
  query InstructorBookings {
    instructorBookings {
      id
      date
      startTime
      endTime
      status
      note
      student {
        id
        firstName
        lastName
      }
      block {
        id
        dayOfWeek
        locationType
        location
        meetingUrl
      }
    }
  }
`;
