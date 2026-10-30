import { graphql } from '@/lib/graphql/__generated__';

/**
 * Per-student Study Coach activity for a section (staff only).
 * Polled by the AI Tutor page so the view stays live.
 */
export const SECTION_TUTOR_ACTIVITY_QUERY = graphql(`
  query SectionTutorActivity($sectionId: String!) {
    sectionTutorActivity(sectionId: $sectionId) {
      studentId
      studentName
      conversationCount
      studentMessageCount
      lastActiveAt
      needsAttention
      attentionReasons
      conversations {
        id
        title
        studentMessageCount
        lastActiveAt
      }
    }
  }
`);

/** Full student/tutor transcript of one conversation (staff only). */
export const SECTION_TUTOR_TRANSCRIPT_QUERY = graphql(`
  query SectionTutorTranscript($sectionId: String!, $conversationId: String!) {
    sectionTutorTranscript(
      sectionId: $sectionId
      conversationId: $conversationId
    ) {
      id
      speaker
      content
      createdAt
    }
  }
`);
