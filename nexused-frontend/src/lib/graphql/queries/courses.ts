import { gql } from '@apollo/client';

export const MY_ENROLLMENTS_QUERY = gql`
  query MyEnrollments {
    myEnrollments {
      id
      role
      status
      enrolledAt
      section {
        id
        location
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
      }
    }
  }
`;

export const MY_SECTIONS_QUERY = gql`
  query MySections {
    mySections {
      id
      location
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
