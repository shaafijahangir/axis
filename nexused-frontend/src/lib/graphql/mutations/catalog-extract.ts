import { gql } from '@apollo/client';

export const EXTRACT_CATALOG_FROM_DOCUMENT_MUTATION = gql`
  mutation ExtractCatalogFromDocument(
    $fileBase64: String!
    $mimeType: String!
  ) {
    extractCatalogFromDocument(fileBase64: $fileBase64, mimeType: $mimeType) {
      courses {
        code
        title
        credits
        department
        category
        courseLevel
        description
        offeredSemesters
        prerequisiteCodes
        corequisiteCodes
        confidence
        flagged
      }
      programs {
        name
        code
        programType
        department
        totalCreditsRequired
        expectedDurationSemesters
        confidence
        flagged
      }
      flags {
        entityType
        entityCode
        field
        message
      }
      inputTokens
      outputTokens
      estimatedCostUsd
    }
  }
`;

export const BATCH_CREATE_COURSES_MUTATION = gql`
  mutation BatchCreateCourses($courses: [BatchCourseItem!]!) {
    batchCreateCourses(courses: $courses) {
      imported
      success
      errors {
        row
        field
        message
      }
    }
  }
`;
