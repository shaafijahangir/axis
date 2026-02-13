import { gql } from '@apollo/client';

export const CREATE_STUDENT_PROFILE_MUTATION = gql`
  mutation CreateStudentDegreeProfile($input: CreateStudentProfileInput!) {
    createStudentDegreeProfile(input: $input) {
      id
      userId
      degreeProgramId
      enrollmentYear
      expectedGraduationYear
      status
    }
  }
`;

export const UPDATE_STUDENT_PROFILE_MUTATION = gql`
  mutation UpdateStudentDegreeProfile($input: UpdateStudentProfileInput!) {
    updateStudentDegreeProfile(input: $input) {
      id
      completedCourseIds
      currentCourseIds
      expectedGraduationYear
      notes
    }
  }
`;
