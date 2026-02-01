import { gql } from '@apollo/client';

export const ASSIGNMENT_QUERY = gql`
  query Assignment($id: String!) {
    assignment(id: $id) {
      id
      sectionId
      title
      description
      type
      pointsPossible
      dueAt
      unlockAt
      lockAt
      createdAt
    }
  }
`;

/**
 * WHY: Instructor needs to see ALL submissions for an assignment, not just their own.
 * Includes user relation so we can display student name.
 * Backend already eager-loads user on this query.
 */
export const ASSIGNMENT_SUBMISSIONS_QUERY = gql`
  query AssignmentSubmissions($assignmentId: String!) {
    assignmentSubmissions(assignmentId: $assignmentId) {
      id
      userId
      attempt
      content
      submittedAt
      score
      gradedAt
      gradedBy
      feedback
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const MY_SUBMISSIONS_QUERY = gql`
  query MySubmissions($assignmentId: String!) {
    mySubmissions(assignmentId: $assignmentId) {
      id
      attempt
      content
      submittedAt
      score
      gradedAt
      feedback
      createdAt
    }
  }
`;
