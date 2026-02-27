import { gql } from '@apollo/client';

export const CAREERS_QUERY = gql`
  query Careers($category: String) {
    careers(category: $category) {
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
      createdAt
    }
  }
`;

export const CAREER_QUERY = gql`
  query Career($id: String!) {
    career(id: $id) {
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
      createdAt
    }
  }
`;

export const CAREER_CATEGORIES_QUERY = gql`
  query CareerCategories {
    careerCategories
  }
`;

export const CAREER_SKILL_GAP_QUERY = gql`
  query CareerSkillGap($careerId: String!, $profileId: String!) {
    careerSkillGap(careerId: $careerId, profileId: $profileId) {
      careerId
      careerTitle
      readinessPercent
      completedCount
      inProgressCount
      missingCount
      courses {
        courseId
        code
        title
        credits
        status
      }
    }
  }
`;
