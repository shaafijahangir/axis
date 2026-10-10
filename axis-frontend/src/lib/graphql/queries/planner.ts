import { graphql } from '@/lib/graphql/__generated__';

export const DEGREE_PROGRAMS_QUERY = graphql(`
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
`);

export const MY_DEGREE_PROFILES_QUERY = graphql(`
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
`);

export const DEGREE_PROGRESS_QUERY = graphql(`
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
`);

export const ELIGIBLE_COURSES_QUERY = graphql(`
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
`);

// ─── ENROLL-006: Prerequisite check ─────────────────────────────────────────

export const COURSE_PREREQUISITES_QUERY = graphql(`
  query CoursePrerequisites($courseId: String!) {
    coursePrerequisites(courseId: $courseId) {
      courseId
      courseCode
      allMet
      metCount
      totalRequired
      prerequisites {
        courseId
        courseCode
        courseTitle
        status
      }
    }
  }
`);

export const SIMULATE_MAJOR_CHANGE_QUERY = graphql(`
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
`);
