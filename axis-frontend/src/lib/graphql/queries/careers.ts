import { graphql } from '@/lib/graphql/__generated__';

export const CAREERS_QUERY = graphql(`
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
`);

export const CAREER_QUERY = graphql(`
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
`);

export const CAREER_CATEGORIES_QUERY = graphql(`
  query CareerCategories {
    careerCategories
  }
`);

export const CAREER_SKILL_GAP_QUERY = graphql(`
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
`);
