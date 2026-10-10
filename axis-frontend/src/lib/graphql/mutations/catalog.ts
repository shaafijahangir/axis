import { graphql } from '@/lib/graphql/__generated__';

export const CREATE_CATALOG_COURSE_MUTATION = graphql(`
  mutation CreateCatalogCourse($input: CreateCourseInput!) {
    createCatalogCourse(input: $input) {
      id
      code
      title
      description
      credits
      departmentId
      category
      courseLevel
      offeredSemesters
      prerequisiteCourseIds
      corequisiteCourseIds
    }
  }
`);

export const UPDATE_CATALOG_COURSE_MUTATION = graphql(`
  mutation UpdateCatalogCourse($id: String!, $input: UpdateCourseInput!) {
    updateCourse(id: $id, input: $input) {
      id
      code
      title
      description
      credits
      departmentId
      category
      courseLevel
      offeredSemesters
      prerequisiteCourseIds
      corequisiteCourseIds
    }
  }
`);

export const DELETE_CATALOG_COURSE_MUTATION = graphql(`
  mutation DeleteCatalogCourse($id: String!) {
    removeCourse(id: $id)
  }
`);

export const CREATE_DEGREE_PROGRAM_MUTATION = graphql(`
  mutation CreateDegreeProgram($input: CreateDegreeProgramInput!) {
    createDegreeProgram(input: $input) {
      id
      name
      code
      department
      programType
      totalCreditsRequired
      status
    }
  }
`);

export const UPDATE_DEGREE_PROGRAM_MUTATION = graphql(`
  mutation UpdateDegreeProgram($input: UpdateDegreeProgramInput!) {
    updateDegreeProgram(input: $input) {
      id
      name
      code
      department
      programType
      totalCreditsRequired
      status
      requirements
    }
  }
`);
