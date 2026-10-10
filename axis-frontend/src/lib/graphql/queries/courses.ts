import { graphql } from '@/lib/graphql/__generated__';

export const MY_ENROLLMENTS_QUERY = graphql(`
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
        meetingDays
        startTime
        endTime
        room
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
`);

export const MY_SECTIONS_QUERY = graphql(`
  query MySections {
    mySections {
      id
      location
      schedule
      meetingDays
      startTime
      endTime
      room
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
`);

export const COURSES_QUERY = graphql(`
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
`);

export const COURSE_QUERY = graphql(`
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
`);

export const COURSE_SECTIONS_QUERY = graphql(`
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
`);

export const SECTION_QUERY = graphql(`
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
        email
        title
        officeLocation
      }
    }
  }
`);

export const MY_ENROLLMENT_FOR_SECTION_QUERY = graphql(`
  query MyEnrollmentForSection($sectionId: String!) {
    myEnrollmentForSection(sectionId: $sectionId) {
      id
      status
      enrolledAt
      waitlistPosition
      waitlistConfirmBy
    }
  }
`);

export const PENDING_ENROLLMENTS_QUERY = graphql(`
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
`);

export const SECTION_ENROLLMENTS_QUERY = graphql(`
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
`);

export const COURSE_COUNT_QUERY = graphql(`
  query CourseCount {
    courseCount
  }
`);

export const SECTION_COUNT_QUERY = graphql(`
  query SectionCount {
    sectionCount
  }
`);

export const ENROLLMENT_COUNT_QUERY = graphql(`
  query EnrollmentCount {
    enrollmentCount
  }
`);
