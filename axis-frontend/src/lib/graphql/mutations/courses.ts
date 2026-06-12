import { gql } from '@apollo/client';

export const CREATE_COURSE_MUTATION = gql`
  mutation CreateCourse($input: CreateCourseInput!) {
    createCourse(input: $input) {
      id
      code
      title
      description
      credits
    }
  }
`;

export const CREATE_SECTION_MUTATION = gql`
  mutation CreateSection($input: CreateSectionInput!) {
    createSection(input: $input) {
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
`;

// Duplicate of ENROLL_IN_SECTION_MUTATION in ./enrollment.ts — kept here removed
// to avoid two operations named `EnrollInSection` (codegen requires unique
// operation names). Import from ./enrollment.ts at call sites instead.
