import { gql } from '@apollo/client';

export const SECTION_TIMELINE_QUERY = gql`
  query SectionTimeline($sectionId: String!) {
    sectionTimeline(sectionId: $sectionId) {
      type
      id
      title
      body
      authorName
      assignmentType
      pointsPossible
      dueAt
      priority
      pinned
      timestamp
      publishedAt
      submittedAt
      score
      gradedAt
      feedback
      replyCount
      isLocked
      isAnswered
    }
  }
`;
