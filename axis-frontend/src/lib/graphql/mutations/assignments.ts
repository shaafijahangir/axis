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

export const UPDATE_ASSIGNMENT_MUTATION = gql`
  mutation UpdateAssignment($input: UpdateAssignmentInput!) {
    updateAssignment(input: $input) {
      id
      title
      description
      dueAt
      pointsPossible
    }
  }
`;

export const EXTEND_DEADLINES_MUTATION = gql`
  mutation ExtendDeadlines($input: ExtendDeadlinesInput!) {
    extendDeadlines(input: $input) {
      id
      title
      dueAt
    }
  }
`;
