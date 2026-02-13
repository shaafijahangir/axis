import { gql } from '@apollo/client';

export const DEGREE_PROGRAMS_QUERY = gql`
  query DegreePrograms {
    degreePrograms {
      id
      name
      code
      department
      description
      totalCreditsRequired
      requirements
      status
    }
  }
`;

export const MY_DEGREE_PROFILES_QUERY = gql`
  query MyDegreeProfiles {
    myDegreeProfiles {
      id
      userId
      degreeProgramId
      degreeProgram {
        id
        name
        code
        department
        totalCreditsRequired
      }
      enrollmentYear
      expectedGraduationYear
      completedCourseIds
      currentCourseIds
      status
      notes
    }
  }
`;

export const DEGREE_PROGRESS_QUERY = gql`
  query DegreeProgress($profileId: String!) {
    degreeProgress(profileId: $profileId) {
      overallPercentage
      totalCreditsRequired
      totalCreditsCompleted
      creditsRemaining
      estimatedSemestersRemaining
      requirementProgress {
        groupName
        type
        creditsRequired
        creditsCompleted
        coursesRequired
        coursesCompleted
        fulfilled
        completedCourseIds
        remainingCourseIds
      }
    }
  }
`;

export const ELIGIBLE_COURSES_QUERY = gql`
  query EligibleCourses($profileId: String!) {
    eligibleCourses(profileId: $profileId) {
      id
      code
      title
      credits
      fulfillsRequirement
      prerequisitesMet
    }
  }
`;

export const SIMULATE_MAJOR_CHANGE_QUERY = gql`
  query SimulateMajorChange($profileId: String!, $targetProgramId: String!) {
    simulateMajorChange(
      profileId: $profileId
      targetProgramId: $targetProgramId
    ) {
      overallPercentage
      totalCreditsRequired
      totalCreditsCompleted
      creditsRemaining
      estimatedSemestersRemaining
      requirementProgress {
        groupName
        type
        creditsRequired
        creditsCompleted
        coursesRequired
        coursesCompleted
        fulfilled
        remainingCourseIds
      }
    }
  }
`;
