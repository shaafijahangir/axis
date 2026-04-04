/* eslint-disable react-hooks/rules-of-hooks */
// Playwright fixture functions receive `use` as a parameter — this is not a React hook.
import { test as base } from './auth.fixture';

/**
 * Database seeding fixture for E2E tests.
 *
 * This fixture provides methods to seed test data via the backend API.
 * In a real setup, you would have a dedicated seeding endpoint or
 * run database seeds before the test suite.
 *
 * For now, we assume test data is pre-seeded and provide IDs via environment.
 */

interface TestData {
  tenantId: string;
  courseId: string;
  sectionId: string;
  assignmentId: string;
  termId: string;
}

// Test data IDs (these should match pre-seeded data)
const TEST_DATA: TestData = {
  tenantId: process.env.E2E_TENANT_ID || 'test-tenant-id',
  courseId: process.env.E2E_COURSE_ID || 'test-course-id',
  sectionId: process.env.E2E_SECTION_ID || 'test-section-id',
  assignmentId: process.env.E2E_ASSIGNMENT_ID || 'test-assignment-id',
  termId: process.env.E2E_TERM_ID || 'test-term-id',
};

type SeedFixtures = {
  testData: TestData;
  graphql: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
};

export const test = base.extend<SeedFixtures>({
  testData: TEST_DATA,

  graphql: async ({ page, apiBaseUrl }, use) => {
    /**
     * Execute a GraphQL query/mutation against the backend.
     * Uses the page's cookies for authentication.
     */
    const graphql = async <T>(
      query: string,
      variables?: Record<string, unknown>
    ): Promise<T> => {
      const response = await page.request.post(`${apiBaseUrl}/graphql`, {
        data: {
          query,
          variables,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const json = await response.json();

      if (json.errors && json.errors.length > 0) {
        throw new Error(
          `GraphQL Error: ${json.errors.map((e: { message: string }) => e.message).join(', ')}`
        );
      }

      return json.data as T;
    };

    await use(graphql);
  },
});

export { expect } from './auth.fixture';
