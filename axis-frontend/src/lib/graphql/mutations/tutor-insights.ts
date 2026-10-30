import { graphql } from '@/lib/graphql/__generated__';

/**
 * Group a section's students by shared gaps from their tutor chats.
 * One model call per click; rate limited server side.
 */
export const ANALYZE_SECTION_TUTOR_GAPS_MUTATION = graphql(`
  mutation AnalyzeSectionTutorGaps($sectionId: String!) {
    analyzeSectionTutorGaps(sectionId: $sectionId) {
      groups {
        topic
        summary
        studentIds
        studentNames
      }
      strengths
      analyzedMessageCount
      generatedAt
    }
  }
`);
