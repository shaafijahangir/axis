import { gql } from '@apollo/client';

export const ENROLL_IN_SECTION_MUTATION = gql`
  mutation EnrollInSection($sectionId: String!, $inviteCode: String) {
    enrollInSection(sectionId: $sectionId, inviteCode: $inviteCode) {
      id
      status
      enrolledAt
      sectionId
      waitlistPosition
      waitlistConfirmBy
    }
  }
`;

export const GENERATE_INVITE_CODE_MUTATION = gql`
  mutation GenerateInviteCode($sectionId: String!) {
    generateInviteCode(sectionId: $sectionId) {
      id
      enrollmentMode
      inviteCode
      autoApprove
    }
  }
`;

export const UPDATE_SECTION_ENROLLMENT_SETTINGS_MUTATION = gql`
  mutation UpdateSectionEnrollmentSettings(
    $sectionId: String!
    $mode: EnrollmentMode!
    $autoApprove: Boolean!
  ) {
    updateSectionEnrollmentSettings(
      sectionId: $sectionId
      mode: $mode
      autoApprove: $autoApprove
    ) {
      id
      enrollmentMode
      inviteCode
      autoApprove
    }
  }
`;

export const APPROVE_ENROLLMENT_MUTATION = gql`
  mutation ApproveEnrollment($enrollmentId: String!) {
    approveEnrollment(enrollmentId: $enrollmentId) {
      id
      status
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const REJECT_ENROLLMENT_MUTATION = gql`
  mutation RejectEnrollment($enrollmentId: String!) {
    rejectEnrollment(enrollmentId: $enrollmentId) {
      id
      status
    }
  }
`;

export const DROP_ENROLLMENT_MUTATION = gql`
  mutation DropEnrollment($enrollmentId: String!) {
    dropEnrollment(enrollmentId: $enrollmentId) {
      id
      status
    }
  }
`;

export const WITHDRAW_FROM_COURSE_MUTATION = gql`
  mutation WithdrawFromCourse($enrollmentId: String!) {
    withdrawFromCourse(enrollmentId: $enrollmentId) {
      id
      status
    }
  }
`;

export const ADMIN_FORCE_ENROLLMENT_STATUS_MUTATION = gql`
  mutation AdminForceEnrollmentStatus(
    $enrollmentId: String!
    $status: EnrollmentStatus!
  ) {
    adminForceEnrollmentStatus(enrollmentId: $enrollmentId, status: $status) {
      id
      status
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

// ─── ENROLL-010: Waitlist mutations ──────────────────────────────────────

export const CONFIRM_WAITLIST_PROMOTION_MUTATION = gql`
  mutation ConfirmWaitlistPromotion($enrollmentId: String!) {
    confirmWaitlistPromotion(enrollmentId: $enrollmentId) {
      id
      status
      waitlistPosition
      waitlistConfirmBy
    }
  }
`;

export const CANCEL_WAITLIST_ENTRY_MUTATION = gql`
  mutation CancelWaitlistEntry($enrollmentId: String!) {
    cancelWaitlistEntry(enrollmentId: $enrollmentId) {
      id
      status
      waitlistPosition
    }
  }
`;
