import { graphql } from '@/lib/graphql/__generated__';

export const CREATE_ACADEMIC_TERM_MUTATION = graphql(`
  mutation CreateAcademicTerm($input: CreateAcademicTermInput!) {
    createAcademicTerm(input: $input) {
      id
      name
      startDate
      endDate
      isCurrent
    }
  }
`);

export const UPDATE_ACADEMIC_TERM_MUTATION = graphql(`
  mutation UpdateAcademicTerm($id: String!, $input: UpdateAcademicTermInput!) {
    updateAcademicTerm(id: $id, input: $input) {
      id
      name
      startDate
      endDate
      isCurrent
    }
  }
`);

export const REMOVE_ACADEMIC_TERM_MUTATION = graphql(`
  mutation RemoveAcademicTerm($id: String!) {
    removeAcademicTerm(id: $id)
  }
`);

export const UPDATE_COURSE_MUTATION = graphql(`
  mutation UpdateCourse($id: String!, $input: UpdateCourseInput!) {
    updateCourse(id: $id, input: $input) {
      id
      code
      title
      description
      credits
    }
  }
`);

export const REMOVE_COURSE_MUTATION = graphql(`
  mutation RemoveCourse($id: String!) {
    removeCourse(id: $id)
  }
`);

export const ADMIN_CREATE_SECTION_MUTATION = graphql(`
  mutation AdminCreateSection($input: AdminCreateSectionInput!) {
    adminCreateSection(input: $input) {
      id
      courseId
      location
      capacity
      status
      meetingDays
      startTime
      endTime
      room
    }
  }
`);

export const UPDATE_SECTION_MUTATION = graphql(`
  mutation UpdateSection($id: String!, $input: UpdateSectionInput!) {
    updateSection(id: $id, input: $input) {
      id
      location
      capacity
      status
      instructorId
      meetingDays
      startTime
      endTime
      room
    }
  }
`);

export const REMOVE_SECTION_MUTATION = graphql(`
  mutation RemoveSection($id: String!) {
    removeSection(id: $id)
  }
`);

export const ADMIN_ENROLL_MUTATION = graphql(`
  mutation AdminEnroll($input: AdminEnrollInput!) {
    adminEnroll(input: $input) {
      id
      userId
      sectionId
      role
      status
    }
  }
`);

export const ADMIN_UPDATE_ENROLLMENT_MUTATION = graphql(`
  mutation AdminUpdateEnrollment(
    $id: String!
    $input: AdminUpdateEnrollmentInput!
  ) {
    adminUpdateEnrollment(id: $id, input: $input) {
      id
      role
      status
      finalGrade
    }
  }
`);

export const BULK_ENROLL_MUTATION = graphql(`
  mutation BulkEnroll($input: BulkEnrollInput!) {
    bulkEnroll(input: $input) {
      id
      userId
      sectionId
      role
      status
    }
  }
`);

export const BULK_DROP_ENROLLMENTS_MUTATION = graphql(`
  mutation BulkDropEnrollments($input: BulkDropInput!) {
    bulkDropEnrollments(input: $input)
  }
`);

export const BULK_MOVE_ENROLLMENTS_MUTATION = graphql(`
  mutation BulkMoveEnrollments($input: BulkMoveInput!) {
    bulkMoveEnrollments(input: $input)
  }
`);
