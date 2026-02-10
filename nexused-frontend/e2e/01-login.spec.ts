import { test, expect } from './fixtures';

/**
 * E2E Test: Login Flow
 *
 * Critical user journey #1: User can log in to the system.
 *
 * Scenarios:
 * - Successful login redirects to home
 * - Invalid credentials show error
 * - Logout clears session
 */

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('should show login page with email and password fields', async ({ page }) => {
    await page.goto('/login');

    // Verify page elements
    await expect(page.getByRole('heading', { name: /sign in|log in|welcome/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
  });

  test('should redirect unauthenticated user from dashboard to login', async ({ page }) => {
    // Try to access protected route
    await page.goto('/home');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('nonexistent@test.com');
    await page.getByLabel(/password/i).fill('wrongpassword');

    // Submit form
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Should show error message (could be toast or inline)
    await expect(
      page.getByText(/invalid|incorrect|failed|unauthorized/i)
    ).toBeVisible({ timeout: 10000 });

    // Should stay on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should successfully login as student and redirect to home', async ({
    page,
    loginAsStudent,
  }) => {
    await loginAsStudent();

    // Should be on home page
    await expect(page).toHaveURL(/\/home/);

    // Should show student feed elements
    await expect(
      page.getByRole('heading', { name: /feed|dashboard|home/i })
    ).toBeVisible({ timeout: 10000 });
  });

  test('should successfully login as instructor and redirect to home', async ({
    page,
    loginAsInstructor,
  }) => {
    await loginAsInstructor();

    // Should be on home page
    await expect(page).toHaveURL(/\/home/);

    // Should show instructor-specific content (grading queue, etc.)
    await expect(page.locator('body')).toContainText(/grade|assignment|course/i, {
      timeout: 10000,
    });
  });

  test('should persist session after page reload', async ({ page, loginAsStudent }) => {
    await loginAsStudent();

    // Reload page
    await page.reload();

    // Should still be logged in (not redirected to login)
    await expect(page).toHaveURL(/\/home/);
  });

  test('should logout and redirect to login', async ({ page, loginAsStudent, logout }) => {
    // First login
    await loginAsStudent();
    await expect(page).toHaveURL(/\/home/);

    // Then logout
    await logout();

    // Should be on login page
    await expect(page).toHaveURL(/\/login/);

    // Trying to access protected route should redirect to login
    await page.goto('/home');
    await expect(page).toHaveURL(/\/login/);
  });
});
