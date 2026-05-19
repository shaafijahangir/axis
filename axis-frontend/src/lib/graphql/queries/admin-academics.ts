import { gql } from '@apollo/client';

export const ACADEMIC_TERMS_QUERY = gql`
  query AcademicTerms {
    academicTerms {
      id
      name
      startDate
      endDate
      isCurrent
      createdAt
    }
  }
`;

export const ACADEMIC_TERM_QUERY = gql`
  query AcademicTerm($id: String!) {
    academicTerm(id: $id) {
      id
      name
      startDate
      endDate
      isCurrent
    }
  }
`;

export const CURRENT_TERM_QUERY = gql`
  query CurrentTerm {
    currentTerm {
      id
      name
      startDate
      endDate
    }
  }
`;

export const ADMIN_SECTIONS_QUERY = gql`
  query AdminSections {
    adminSections {
      id
      courseId
      termId
      instructorId
      location
      capacity
      status
      schedule
      course {
        id
        code
        title
      }
      instructor {
        id
        firstName
        lastName
      }
    }
  }
`;

export const ADMIN_ENROLLMENTS_QUERY = gql`
  query AdminEnrollments($sectionId: String) {
    adminEnrollments(sectionId: $sectionId) {
      id
      userId
      sectionId
      role
      status
      enrolledAt
      finalGrade
      user {
        id
        firstName
        lastName
        email
      }
      section {
        id
        course {
          id
          code
          title
        }
      }
    }
  }
`;

export const ADMIN_USERS_LIST_QUERY = gql`
  query AdminUsersList($filter: UsersFilterInput) {
    adminUsers(filter: $filter) {
      users {
        id
        firstName
        lastName
        email
        roles
      }
      totalCount
      page
      pageSize
    }
  }
`;
