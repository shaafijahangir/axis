import { graphql } from '@/lib/graphql/__generated__';

export const DISCUSSION_FIELDS = graphql(`
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
`);

export const REPLY_FIELDS = graphql(`
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
`);

export const SECTION_DISCUSSIONS_QUERY = graphql(`
  query SectionDiscussions($sectionId: String!, $page: Int, $limit: Int) {
    sectionDiscussions(sectionId: $sectionId, page: $page, limit: $limit) {
      ...DiscussionFields
    }
  }
`);

export const DISCUSSION_QUERY = graphql(`
  query Discussion($id: String!) {
    discussion(id: $id) {
      ...DiscussionFields
    }
  }
`);

export const DISCUSSION_REPLIES_QUERY = graphql(`
  query DiscussionReplies($discussionId: String!) {
    discussionReplies(discussionId: $discussionId) {
      ...ReplyFields
    }
  }
`);
