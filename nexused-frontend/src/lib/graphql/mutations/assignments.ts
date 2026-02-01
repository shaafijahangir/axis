import { gql } from '@apollo/client';

export const CREATE_ASSIGNMENT_MUTATION = gql`
  mutation CreateAssignment($input: CreateAssignmentInput!) {
    createAssignment(input: $input) {
      id
      title
      type
      pointsPossible
      dueAt
      createdAt
    }
  }
`;

export const GRADE_SUBMISSION_MUTATION = gql`
  mutation GradeSubmission($input: GradeSubmissionInput!) {
    gradeSubmission(input: $input) {
      id
      score
      feedback
      gradedAt
      gradedBy
    }
  }
`;

export const SUBMIT_ASSIGNMENT_MUTATION = gql`
  mutation SubmitAssignment($input: CreateSubmissionInput!) {
    submitAssignment(input: $input) {
      id
      attempt
      submittedAt
    }
  }
`;
