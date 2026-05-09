import { gql } from '@apollo/client';

const DISCUSSION_FIELDS = gql`
  fragment DiscussionFields on Discussion {
    id
    sectionId
    authorId
    title
    body
    isPinned
    isLocked
    isAnswered
    replyCount
    createdAt
    updatedAt
    author {
      id
      firstName
      lastName
    }
  }
`;

const REPLY_FIELDS = gql`
  fragment ReplyFields on DiscussionReply {
    id
    discussionId
    authorId
    parentReplyId
    body
    isInstructorAnswer
    createdAt
    updatedAt
    author {
      id
      firstName
      lastName
    }
  }
`;

export const SECTION_DISCUSSIONS_QUERY = gql`
  ${DISCUSSION_FIELDS}
  query SectionDiscussions($sectionId: String!, $page: Int, $limit: Int) {
    sectionDiscussions(sectionId: $sectionId, page: $page, limit: $limit) {
      ...DiscussionFields
    }
  }
`;

export const DISCUSSION_QUERY = gql`
  ${DISCUSSION_FIELDS}
  query Discussion($id: String!) {
    discussion(id: $id) {
      ...DiscussionFields
    }
  }
`;

export const DISCUSSION_REPLIES_QUERY = gql`
  ${REPLY_FIELDS}
  query DiscussionReplies($discussionId: String!) {
    discussionReplies(discussionId: $discussionId) {
      ...ReplyFields
    }
  }
`;
