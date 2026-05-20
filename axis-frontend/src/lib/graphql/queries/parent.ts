import { gql } from '@apollo/client';

export const MY_LINKED_STUDENTS_QUERY = gql`
  query MyLinkedStudents {
    myLinkedStudents {
      id
      firstName
      lastName
      email
      linkId
    }
  }
`;

export const PARENT_STUDENT_ENROLLMENTS_QUERY = gql`
  query ParentStudentEnrollments($studentId: String!) {
    parentStudentEnrollments(studentId: $studentId) {
      enrollmentId
      sectionId
      courseCode
      courseTitle
      location
      instructorName
      status
      termName
    }
  }
`;

export const PARENT_STUDENT_GRADES_QUERY = gql`
  query ParentStudentGrades($studentId: String!) {
    parentStudentGrades(studentId: $studentId) {
      assignmentId
      assignmentTitle
      courseCode
      pointsPossible
      score
      gradedAt
      dueAt
    }
  }
`;

export const PARENT_STUDENT_REPORT_CARDS_QUERY = gql`
  query ParentStudentReportCards($studentId: String!) {
    parentStudentReportCards(studentId: $studentId) {
      id
      courseCode
      courseTitle
      termName
      status
      finalGrade
      teacherComment
      gradeSummary
      attendanceSummary
      publishedAt
    }
  }
`;
