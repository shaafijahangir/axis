import { gql } from '@apollo/client';

export const ENROLL_IN_SECTION_MUTATION = gql`
  mutation EnrollInSection($sectionId: String!, $inviteCode: String) {
    enrollInSection(sectionId: $sectionId, inviteCode: $inviteCode) {
      id
      status
      enrolledAt
      sectionId
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
