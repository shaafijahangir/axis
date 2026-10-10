import { graphql } from '@/lib/graphql/__generated__';

/**
 * SPRINT-2: Reusable fragment for the attachments field on submissions and
 * assignments. With the codegen client-preset, operations reference it by
 * name (`...AttachmentFields`) and the generated document includes it — no
 * `${}` interpolation (that would defeat the typed `graphql()` overloads).
 */
export const ATTACHMENT_FIELDS = graphql(`
  fragment AttachmentFields on FileUpload {
    id
    originalName
    mimeType
    size
  }
`);

export const ASSIGNMENT_QUERY = graphql(`
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
      maxAttempts
      timeLimitMinutes
      displayMode
      attachments {
        ...AttachmentFields
      }
    }
  }
`);

/**
 * WHY: Instructor needs to see ALL submissions for an assignment, not just their own.
 * Includes user relation so we can display student name.
 * Backend already eager-loads user on this query.
 */
export const ASSIGNMENT_SUBMISSIONS_QUERY = graphql(`
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
      attachments {
        ...AttachmentFields
      }
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`);

export const MY_SUBMISSIONS_QUERY = graphql(`
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
      attachments {
        ...AttachmentFields
      }
    }
  }
`);
