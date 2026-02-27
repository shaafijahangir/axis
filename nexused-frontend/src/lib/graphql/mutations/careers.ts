import { gql } from '@apollo/client';

export const CREATE_CAREER_MUTATION = gql`
  mutation CreateCareer($input: CreateCareerInput!) {
    createCareer(input: $input) {
      id
      title
      category
      description
      medianSalaryMin
      medianSalaryMax
      requiredSkills
      recommendedDegreeIds
      recommendedCourseIds
      isActive
    }
  }
`;

export const UPDATE_CAREER_MUTATION = gql`
  mutation UpdateCareer($input: UpdateCareerInput!) {
    updateCareer(input: $input) {
      id
      title
      category
      description
      medianSalaryMin
      medianSalaryMax
      requiredSkills
      recommendedDegreeIds
      recommendedCourseIds
      isActive
    }
  }
`;

export const DELETE_CAREER_MUTATION = gql`
  mutation DeleteCareer($id: String!) {
    deleteCareer(id: $id)
  }
`;
