import { graphql } from '@/lib/graphql/__generated__';

export const COURSE_CATALOG_QUERY = graphql(`
  query CourseCatalog($filters: StudentCatalogFilter) {
    courseCatalog(filters: $filters) {
      total
      items {
        id
        code
        title
        description
        credits
        department
        category
        courseLevel
        prerequisiteCourseIds
        sections {
          id
          schedule
          location
          capacity
          enrolledCount
          seatsAvailable
          enrollmentMode
          termId
          termName
          instructor {
            id
            firstName
            lastName
          }
        }
      }
    }
  }
`);

export const DEPARTMENT_LIST_QUERY = graphql(`
  query DepartmentList {
    departmentList
  }
`);
