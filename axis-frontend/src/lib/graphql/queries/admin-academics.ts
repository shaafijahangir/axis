import { graphql } from '@/lib/graphql/__generated__';

export const ACADEMIC_TERMS_QUERY = graphql(`
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
`);

export const ACADEMIC_TERM_QUERY = graphql(`
  query AcademicTerm($id: String!) {
    academicTerm(id: $id) {
      id
      name
      startDate
      endDate
      isCurrent
    }
  }
`);

export const CURRENT_TERM_QUERY = graphql(`
  query CurrentTerm {
    currentTerm {
      id
      name
      startDate
      endDate
    }
  }
`);

export const ADMIN_SECTIONS_QUERY = graphql(`
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
      meetingDays
      startTime
      endTime
      room
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
`);

export const ADMIN_ENROLLMENTS_QUERY = graphql(`
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
`);

export const ADMIN_USERS_LIST_QUERY = graphql(`
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
`);
