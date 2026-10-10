import { graphql } from '@/lib/graphql/__generated__';

export const SECTION_REPORT_CARDS_QUERY = graphql(`
  query SectionReportCards($sectionId: String!) {
    sectionReportCards(sectionId: $sectionId) {
      id
      studentId
      studentFirstName
      studentLastName
      studentEmail
      sectionId
      courseCode
      courseTitle
      termId
      termName
      status
      teacherComment
      finalGrade
      gradeSummary
      attendanceSummary
      publishedAt
      createdAt
    }
  }
`);

export const MY_REPORT_CARDS_QUERY = graphql(`
  query MyReportCards {
    myReportCards {
      id
      courseCode
      courseTitle
      termName
      status
      teacherComment
      finalGrade
      gradeSummary
      attendanceSummary
      publishedAt
      createdAt
    }
  }
`);
