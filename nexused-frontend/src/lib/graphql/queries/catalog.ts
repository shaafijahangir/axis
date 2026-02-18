import { gql } from '@apollo/client';

export const CATALOG_COURSES_QUERY = gql`
  query CatalogCourses($filters: CatalogFilterInput) {
    catalogCourses(filters: $filters) {
      items {
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
        createdAt
      }
      total
    }
  }
`;

export const CATALOG_COURSE_QUERY = gql`
  query CatalogCourse($id: String!) {
    catalogCourse(id: $id) {
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
`;

export const DEPARTMENT_LIST_QUERY = gql`
  query DepartmentList {
    departmentList
  }
`;

export const DEGREE_PROGRAMS_ADMIN_QUERY = gql`
  query DegreeProgramsAdmin {
    degreePrograms {
      id
      name
      code
      department
      description
      programType
      totalCreditsRequired
      expectedDurationSemesters
      catalogYear
      status
      requirements
      createdAt
    }
  }
`;

export const DEGREE_PROGRAM_QUERY = gql`
  query DegreeProgram($id: String!) {
    degreeProgram(id: $id) {
      id
      name
      code
      department
      description
      programType
      totalCreditsRequired
      expectedDurationSemesters
      catalogYear
      status
      requirements
    }
  }
`;
