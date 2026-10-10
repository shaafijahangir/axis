import { graphql } from '@/lib/graphql/__generated__';

/**
 * WHY a real GraphQL fragment (not a JS template-string concat): codegen's
 * static parser follows GraphQL fragment spreads but can't follow JS string
 * interpolation. Native fragments also give us deduplicated cache normalisation
 * and let the generated types name the shape once.
 */
export const IMPORT_RESULT_FRAGMENT = graphql(`
  fragment ImportResultFields on ImportResult {
    imported
    success
    errors {
      row
      field
      message
    }
  }
`);

export const IMPORT_COURSES_FROM_CSV_MUTATION = graphql(`
  mutation ImportCoursesFromCsv($csvData: String!) {
    importCoursesFromCsv(csvData: $csvData) {
      ...ImportResultFields
    }
  }
`);

export const IMPORT_PROGRAMS_FROM_CSV_MUTATION = graphql(`
  mutation ImportProgramsFromCsv($csvData: String!) {
    importProgramsFromCsv(csvData: $csvData) {
      ...ImportResultFields
    }
  }
`);

export const IMPORT_REQUIREMENTS_FROM_CSV_MUTATION = graphql(`
  mutation ImportRequirementsFromCsv($csvData: String!) {
    importRequirementsFromCsv(csvData: $csvData) {
      ...ImportResultFields
    }
  }
`);

export const IMPORT_USERS_FROM_CSV_MUTATION = graphql(`
  mutation ImportUsersFromCsv($csvData: String!) {
    importUsersFromCsv(csvData: $csvData) {
      ...ImportResultFields
    }
  }
`);

export const IMPORT_ENROLLMENTS_FROM_CSV_MUTATION = graphql(`
  mutation ImportEnrollmentsFromCsv($csvData: String!) {
    importEnrollmentsFromCsv(csvData: $csvData) {
      ...ImportResultFields
    }
  }
`);
