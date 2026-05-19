import { gql } from '@apollo/client';

export const MY_ENROLLMENTS_QUERY = gql`
  query MyEnrollments {
    myEnrollments {
      id
      role
      status
      enrolledAt
      waitlistPosition
      waitlistConfirmBy
      section {
        id
        location
        schedule
        status
        course {
          id
          code
          title
          description
          credits
        }
        instructor {
          id
          firstName
          lastName
        }
        term {
          id
          name
          startDate
          endDate
        }
      }
    }
  }
`;

export const MY_SECTIONS_QUERY = gql`
  query MySections {
    mySections {
      id
      location
      schedule
      capacity
      status
      course {
        id
        code
        title
        description
      }
      instructor {
        id
        firstName
        lastName
      }
      term {
        id
        name
        startDate
        endDate
      }
    }
  }
`;

export const COURSES_QUERY = gql`
  query Courses {
    courses {
      id
      code
      title
      description
      credits
      createdAt
    }
  }
`;

export const COURSE_QUERY = gql`
  query Course($id: String!) {
    course(id: $id) {
      id
      code
      title
      description
      credits
      departmentId
      createdAt
    }
  }
`;

export const COURSE_SECTIONS_QUERY = gql`
  query CourseSections($courseId: String!) {
    courseSections(courseId: $courseId) {
      id
      location
      capacity
      status
      instructor {
        id
        firstName
        lastName
      }
    }
  }
`;

export const SECTION_QUERY = gql`
  query Section($id: String!) {
    section(id: $id) {
      id
      location
      capacity
      status
      enrollmentMode
      inviteCode
      autoApprove
      termId
      term {
        dropDeadline
        withdrawDeadline
      }
      course {
        id
        code
        title
        description
      }
      instructor {
        id
        firstName
        lastName
      }
    }
  }
`;

export const MY_ENROLLMENT_FOR_SECTION_QUERY = gql`
  query MyEnrollmentForSection($sectionId: String!) {
    myEnrollmentForSection(sectionId: $sectionId) {
      id
      status
      enrolledAt
      waitlistPosition
      waitlistConfirmBy
    }
  }
`;

export const PENDING_ENROLLMENTS_QUERY = gql`
  query PendingEnrollments($sectionId: String!) {
    pendingEnrollments(sectionId: $sectionId) {
      id
      status
      enrolledAt
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const SECTION_ENROLLMENTS_QUERY = gql`
  query SectionEnrollments($sectionId: String!) {
    sectionEnrollments(sectionId: $sectionId) {
      id
      role
      status
      enrolledAt
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`;

export const COURSE_COUNT_QUERY = gql`
  query CourseCount {
    courseCount
  }
`;

export const SECTION_COUNT_QUERY = gql`
  query SectionCount {
    sectionCount
  }
`;

export const ENROLLMENT_COUNT_QUERY = gql`
  query EnrollmentCount {
    enrollmentCount
  }
`;
