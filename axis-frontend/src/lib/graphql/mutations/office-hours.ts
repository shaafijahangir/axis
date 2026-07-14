import { gql } from '@apollo/client';

// FEAT-018: Office-hours booking mutations.

export const CREATE_OFFICE_HOUR_BLOCK_MUTATION = gql`
  mutation CreateOfficeHourBlock($input: CreateOfficeHourBlockInput!) {
    createOfficeHourBlock(input: $input) {
      id
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

export const UPDATE_OFFICE_HOUR_BLOCK_MUTATION = gql`
  mutation UpdateOfficeHourBlock($input: UpdateOfficeHourBlockInput!) {
    updateOfficeHourBlock(input: $input) {
      id
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

export const DEACTIVATE_OFFICE_HOUR_BLOCK_MUTATION = gql`
  mutation DeactivateOfficeHourBlock($id: String!) {
    deactivateOfficeHourBlock(id: $id) {
      id
      active
    }
  }
`;

export const BOOK_OFFICE_HOUR_SLOT_MUTATION = gql`
  mutation BookOfficeHourSlot($input: BookSlotInput!) {
    bookOfficeHourSlot(input: $input) {
      id
      date
      startTime
      endTime
      status
      note
      block {
        id
        locationType
        location
        meetingUrl
      }
      instructor {
        id
        firstName
        lastName
      }
    }
  }
`;

export const CANCEL_BOOKING_MUTATION = gql`
  mutation CancelBooking($bookingId: String!) {
    cancelBooking(bookingId: $bookingId) {
      id
      status
    }
  }
`;
