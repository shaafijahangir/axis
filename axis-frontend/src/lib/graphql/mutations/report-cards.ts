import { graphql } from '@/lib/graphql/__generated__';

export const GENERATE_REPORT_CARDS_MUTATION = graphql(`
  mutation GenerateReportCards($sectionId: String!) {
    generateReportCards(sectionId: $sectionId) {
      id
      studentId
      studentFirstName
      studentLastName
      status
      gradeSummary
      attendanceSummary
      finalGrade
      teacherComment
      publishedAt
      createdAt
    }
  }
`);

export const UPDATE_REPORT_CARD_MUTATION = graphql(`
  mutation UpdateReportCard($input: UpdateReportCardInput!) {
    updateReportCard(input: $input) {
      id
      teacherComment
      finalGrade
      status
    }
  }
`);

export const PUBLISH_REPORT_CARDS_MUTATION = graphql(`
  mutation PublishReportCards($sectionId: String!) {
    publishReportCards(sectionId: $sectionId) {
      id
      status
      publishedAt
    }
  }
`);
