import { gql } from '@apollo/client';

const IMPORT_RESULT_FRAGMENT = `
  imported
  success
  errors {
    row
    field
    message
  }
`;

export const IMPORT_COURSES_FROM_CSV_MUTATION = gql`
  mutation ImportCoursesFromCsv($csvData: String!) {
    importCoursesFromCsv(csvData: $csvData) {
      ${IMPORT_RESULT_FRAGMENT}
    }
  }
`;

export const IMPORT_PROGRAMS_FROM_CSV_MUTATION = gql`
  mutation ImportProgramsFromCsv($csvData: String!) {
    importProgramsFromCsv(csvData: $csvData) {
      ${IMPORT_RESULT_FRAGMENT}
    }
  }
`;

export const IMPORT_REQUIREMENTS_FROM_CSV_MUTATION = gql`
  mutation ImportRequirementsFromCsv($csvData: String!) {
    importRequirementsFromCsv(csvData: $csvData) {
      ${IMPORT_RESULT_FRAGMENT}
    }
  }
`;
