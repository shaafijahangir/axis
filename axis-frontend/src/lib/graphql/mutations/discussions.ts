import { gql } from '@apollo/client';

export const CREATE_DISCUSSION_MUTATION = gql`
  mutation CreateDiscussion($input: CreateDiscussionInput!) {
    createDiscussion(input: $input) {
      id
      sectionId
      title
      body
      isPinned
      isLocked
      isAnswered
      replyCount
      createdAt
      author {
        id
        firstName
        lastName
      }
    }
  }
`;

export const REPLY_TO_DISCUSSION_MUTATION = gql`
  mutation ReplyToDiscussion($input: CreateDiscussionReplyInput!) {
    replyToDiscussion(input: $input) {
      id
      discussionId
      authorId
      parentReplyId
      body
      isInstructorAnswer
      createdAt
      author {
        id
        firstName
        lastName
      }
    }
  }
`;

export const PIN_DISCUSSION_MUTATION = gql`
  mutation PinDiscussion($id: String!) {
    pinDiscussion(id: $id) {
      id
      isPinned
    }
  }
`;

export const LOCK_DISCUSSION_MUTATION = gql`
  mutation LockDiscussion($id: String!) {
    lockDiscussion(id: $id) {
      id
      isLocked
    }
  }
`;

export const MARK_DISCUSSION_ANSWERED_MUTATION = gql`
  mutation MarkDiscussionAnswered($id: String!) {
    markDiscussionAnswered(id: $id) {
      id
      isAnswered
    }
  }
`;

export const MARK_REPLY_AS_ANSWER_MUTATION = gql`
  mutation MarkReplyAsAnswer($replyId: String!) {
    markReplyAsAnswer(replyId: $replyId) {
      id
      isInstructorAnswer
    }
  }
`;
