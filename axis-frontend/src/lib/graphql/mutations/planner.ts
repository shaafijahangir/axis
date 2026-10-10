import { graphql } from '@/lib/graphql/__generated__';

export const CREATE_STUDENT_PROFILE_MUTATION = graphql(`
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
`);

export const UPDATE_STUDENT_PROFILE_MUTATION = graphql(`
  mutation UpdateStudentDegreeProfile($input: UpdateStudentProfileInput!) {
    updateStudentDegreeProfile(input: $input) {
      id
      completedCourseIds
      currentCourseIds
      expectedGraduationYear
      notes
    }
  }
`);
