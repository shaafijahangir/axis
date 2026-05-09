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
    }
  }
`;

export const ENROLL_STUDENT_MUTATION = gql`
  mutation EnrollStudent($sectionId: String!) {
    enrollStudent(sectionId: $sectionId) {
      id
      userId
      sectionId
      status
      enrolledAt
    }
  }
`;
