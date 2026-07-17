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

// FEAT-019: Recurring weekly unavailability (suppresses bookable slots).

export const CREATE_BUSY_BLOCK_MUTATION = gql`
  mutation CreateBusyBlock($input: CreateBusyBlockInput!) {
    createBusyBlock(input: $input) {
      id
      dayOfWeek
      startTime
      endTime
      label
    }
  }
`;

export const DELETE_BUSY_BLOCK_MUTATION = gql`
  mutation DeleteBusyBlock($id: String!) {
    deleteBusyBlock(id: $id) {
      id
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
