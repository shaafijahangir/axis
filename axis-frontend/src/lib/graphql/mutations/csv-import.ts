import { gql } from '@apollo/client';

/**
 * WHY a real GraphQL fragment (not a JS template-string concat): codegen's
 * static parser follows GraphQL fragment spreads but can't follow JS string
 * interpolation. Native fragments also give us deduplicated cache normalisation
 * and let the generated types name the shape once.
 */
const IMPORT_RESULT_FRAGMENT = gql`
  fragment ImportResultFields on ImportResult {
    imported
    success
    errors {
      row
      field
      message
    }
  }
`;

export const IMPORT_COURSES_FROM_CSV_MUTATION = gql`
  mutation ImportCoursesFromCsv($csvData: String!) {
    importCoursesFromCsv(csvData: $csvData) {
      ...ImportResultFields
    }
  }
  ${IMPORT_RESULT_FRAGMENT}
`;

export const IMPORT_PROGRAMS_FROM_CSV_MUTATION = gql`
  mutation ImportProgramsFromCsv($csvData: String!) {
    importProgramsFromCsv(csvData: $csvData) {
      ...ImportResultFields
    }
  }
  ${IMPORT_RESULT_FRAGMENT}
`;

export const IMPORT_REQUIREMENTS_FROM_CSV_MUTATION = gql`
  mutation ImportRequirementsFromCsv($csvData: String!) {
    importRequirementsFromCsv(csvData: $csvData) {
      ...ImportResultFields
    }
  }
  ${IMPORT_RESULT_FRAGMENT}
`;

export const IMPORT_USERS_FROM_CSV_MUTATION = gql`
  mutation ImportUsersFromCsv($csvData: String!) {
    importUsersFromCsv(csvData: $csvData) {
      ...ImportResultFields
    }
  }
  ${IMPORT_RESULT_FRAGMENT}
`;

export const IMPORT_ENROLLMENTS_FROM_CSV_MUTATION = gql`
  mutation ImportEnrollmentsFromCsv($csvData: String!) {
    importEnrollmentsFromCsv(csvData: $csvData) {
      ...ImportResultFields
    }
  }
  ${IMPORT_RESULT_FRAGMENT}
`;
