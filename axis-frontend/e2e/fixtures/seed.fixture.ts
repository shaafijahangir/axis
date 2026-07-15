/* eslint-disable react-hooks/rules-of-hooks */
// Playwright fixture functions receive `use` as a parameter — this is not a React hook.
import { test as base } from './auth.fixture';

/**
 * Database discovery fixture for E2E tests.
 *
 * Dynamically resolves test IDs by logging into the backend and querying
 * GraphQL — no hardcoded UUIDs. Falls back to env vars if provided (CI override).
 *
 * Discovery order:
 *   1. Log in as the test student via REST to get a JWT.
 *   2. Query `myEnrollments` to find the first active section + course.
 *   3. Query `sectionTimeline` on that section to find an assignment.
 *   4. Return everything as `testData`.
 *
 * If the student has no enrollments or the section has no assignments, the
 * fixture returns empty strings — tests that need real data will skip via
 * their own guards.
 */

interface TestData {
  tenantId: string;
  courseId: string;
  sectionId: string;
  assignmentId: string;
  termId: string;
}

type SeedFixtures = {
  testData: TestData;
  graphql: <T>(query: string, variables?: Record<string, unknown>, token?: string) => Promise<T>;
};

const API_BASE_URL = process.env.E2E_API_URL || 'http://localhost:3002/api';

export const test = base.extend<SeedFixtures>({
  graphql: async ({ page }, use) => {
    const graphql = async <T>(
      query: string,
      variables?: Record<string, unknown>,
      token?: string,
    ): Promise<T> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await page.request.post(`${API_BASE_URL}/graphql`, {
        data: { query, variables },
        headers,
      });

      const json = (await response.json()) as { data?: T; errors?: { message: string }[] };

      if (json.errors && json.errors.length > 0) {
        throw new Error(
          `GraphQL Error: ${json.errors.map((e) => e.message).join(', ')}`,
        );
      }

      return json.data as T;
    };

    await use(graphql);
  },

  testData: async ({ page, testUsers }, use) => {
    // Allow CI to pin specific IDs via env vars (useful when seed data is deterministic)
    if (
      process.env.E2E_COURSE_ID &&
      process.env.E2E_SECTION_ID &&
      process.env.E2E_ASSIGNMENT_ID
    ) {
      await use({
        tenantId: process.env.E2E_TENANT_ID || '',
        courseId: process.env.E2E_COURSE_ID,
        sectionId: process.env.E2E_SECTION_ID,
        assignmentId: process.env.E2E_ASSIGNMENT_ID,
        termId: process.env.E2E_TERM_ID || '',
      });
      return;
    }

    // Step 1: authenticate as student to get a JWT for API calls
    let token = '';
    try {
      const loginRes = await page.request.post(`${API_BASE_URL}/auth/login`, {
        data: {
          email: testUsers.student.email,
          password: testUsers.student.password,
        },
        headers: { 'Content-Type': 'application/json' },
      });
      const loginJson = (await loginRes.json()) as { accessToken?: string };
      token = loginJson.accessToken ?? '';
    } catch {
      // Backend unreachable — tests that need data will skip
    }

    let courseId = '';
    let sectionId = '';
    let assignmentId = '';
    let tenantId = '';
    let termId = '';

    if (token) {
      // Step 2: discover first active enrollment
      try {
        const enrollmentData = await page.request.post(`${API_BASE_URL}/graphql`, {
          data: {
            query: `
              query DiscoverTestSection {
                myEnrollments {
                  section {
                    id
                    termId
                    course { id }
                  }
                }
              }
            `,
          },
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const enrollJson = (await enrollmentData.json()) as {
          data?: {
            myEnrollments: Array<{
              section: { id: string; termId: string; course: { id: string } };
            }>;
          };
        };

        const firstEnrollment = enrollJson.data?.myEnrollments?.[0];
        if (firstEnrollment) {
          sectionId = firstEnrollment.section.id;
          courseId = firstEnrollment.section.course.id;
          termId = firstEnrollment.section.termId ?? '';
        }
      } catch {
        // No enrollments — assignmentId stays empty
      }

      // Step 3: discover an assignment from the section timeline
      if (sectionId) {
        try {
          const timelineRes = await page.request.post(`${API_BASE_URL}/graphql`, {
            data: {
              query: `
                query DiscoverTestAssignment($sectionId: String!) {
                  sectionTimeline(sectionId: $sectionId) {
                    type
                    id
                  }
                }
              `,
              variables: { sectionId },
            },
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          const timelineJson = (await timelineRes.json()) as {
            data?: { sectionTimeline: Array<{ type: string; id: string }> };
          };

          const assignmentEntry = timelineJson.data?.sectionTimeline?.find(
            (e) => e.type === 'assignment',
          );
          if (assignmentEntry) {
            assignmentId = assignmentEntry.id;
          }
        } catch {
          // No timeline data
        }
      }

      // Step 4: get tenantId from current user profile
      if (!tenantId) {
        try {
          const meRes = await page.request.post(`${API_BASE_URL}/graphql`, {
            data: { query: `query Me { me { tenantId } }` },
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const meJson = (await meRes.json()) as {
            data?: { me: { tenantId: string } };
          };
          tenantId = meJson.data?.me?.tenantId ?? '';
        } catch {
          // Ignore
        }
      }
    }

    await use({ tenantId, courseId, sectionId, assignmentId, termId });
  },
});

export { expect } from './auth.fixture';
