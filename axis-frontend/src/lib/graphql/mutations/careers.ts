import { graphql } from '@/lib/graphql/__generated__';

export const CREATE_CAREER_MUTATION = graphql(`
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
`);

export const UPDATE_CAREER_MUTATION = graphql(`
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
`);

export const DELETE_CAREER_MUTATION = graphql(`
  mutation DeleteCareer($id: String!) {
    deleteCareer(id: $id)
  }
`);
