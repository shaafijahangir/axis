import { gql } from '@apollo/client';

export const GENERATE_REPORT_CARDS_MUTATION = gql`
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
`;

export const UPDATE_REPORT_CARD_MUTATION = gql`
  mutation UpdateReportCard($input: UpdateReportCardInput!) {
    updateReportCard(input: $input) {
      id
      teacherComment
      finalGrade
      status
    }
  }
`;

export const PUBLISH_REPORT_CARDS_MUTATION = gql`
  mutation PublishReportCards($sectionId: String!) {
    publishReportCards(sectionId: $sectionId) {
      id
      status
      publishedAt
    }
  }
`;
