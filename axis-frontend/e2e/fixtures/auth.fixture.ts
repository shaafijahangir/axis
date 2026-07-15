/* eslint-disable react-hooks/rules-of-hooks */
// Playwright fixture functions receive `use` as a parameter — this is not a React hook.
import { test as base, expect } from '@playwright/test';

/**
 * Authentication fixture for E2E tests.
 *
 * Provides:
 * - loginAs(email, password) - Login as any user
 * - loginAsStudent() - Login with test student credentials
 * - loginAsInstructor() - Login with test instructor credentials
 * - loginAsAdmin() - Login with test admin credentials
 * - logout() - Clear session
 *
 * Test data is seeded by the backend test database.
 * Credentials are defined in environment or use defaults.
 */

interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'instructor' | 'admin';
}

// Default test users — MUST match the demo users created by
// axis-backend/src/database/seed.ts (the CI e2e job seeds exactly that).
const TEST_USERS = {
  student: {
    email: process.env.E2E_STUDENT_EMAIL || 'student@Axis.demo',
    password: process.env.E2E_STUDENT_PASSWORD || 'password123',
    firstName: 'Alex',
    lastName: 'Rivera',
    role: 'student' as const,
  },
  instructor: {
    email: process.env.E2E_INSTRUCTOR_EMAIL || 'prof.chen@Axis.demo',
    password: process.env.E2E_INSTRUCTOR_PASSWORD || 'password123',
    firstName: 'Sarah',
    lastName: 'Chen',
    role: 'instructor' as const,
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@Axis.demo',
    password: process.env.E2E_ADMIN_PASSWORD || 'password123',
    firstName: 'Marcus',
    lastName: 'Williams',
    role: 'admin' as const,
  },
};

// API base URL for direct API calls (seeding, etc.)
const API_BASE_URL = process.env.E2E_API_URL || 'http://localhost:3002/api';

type AuthFixtures = {
  loginAs: (email: string, password: string) => Promise<void>;
  loginAsStudent: () => Promise<TestUser>;
  loginAsInstructor: () => Promise<TestUser>;
  loginAsAdmin: () => Promise<TestUser>;
  logout: () => Promise<void>;
  apiBaseUrl: string;
  testUsers: typeof TEST_USERS;
};

export const test = base.extend<AuthFixtures>({
  apiBaseUrl: API_BASE_URL,

  testUsers: TEST_USERS,

  loginAs: async ({ page }, use) => {
    const loginAs = async (email: string, password: string) => {
      // Navigate to login page
      await page.goto('/login');

      // Fill in credentials
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);

      // Submit form
      await page.getByRole('button', { name: /sign in|log in/i }).click();

      // Wait for redirect to dashboard
      await page.waitForURL(/\/(home|student|instructor|admin)/);
    };

    await use(loginAs);
  },

  loginAsStudent: async ({ page: _page, loginAs }, use) => {
    const login = async () => {
      await loginAs(TEST_USERS.student.email, TEST_USERS.student.password);
      return TEST_USERS.student;
    };
    await use(login);
  },

  loginAsInstructor: async ({ page: _page, loginAs }, use) => {
    const login = async () => {
      await loginAs(TEST_USERS.instructor.email, TEST_USERS.instructor.password);
      return TEST_USERS.instructor;
    };
    await use(login);
  },

  loginAsAdmin: async ({ page: _page, loginAs }, use) => {
    const login = async () => {
      await loginAs(TEST_USERS.admin.email, TEST_USERS.admin.password);
      return TEST_USERS.admin;
    };
    await use(login);
  },

  logout: async ({ page }, use) => {
    const logout = async () => {
      // Clear localStorage
      await page.evaluate(() => localStorage.clear());

      // Call logout endpoint to clear httpOnly cookie
      await page.request.post(`${API_BASE_URL}/auth/logout`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Navigate to login page
      await page.goto('/login');
    };
    await use(logout);
  },
});

export { expect };
