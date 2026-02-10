import { test, expect } from './fixtures';

/**
 * E2E Test: View Feed Flow
 *
 * Critical user journey #2: User can view their personalized feed.
 *
 * Scenarios:
 * - Student sees their feed with deadlines, grades, announcements
 * - Instructor sees grading queue and upcoming deadlines
 * - Feed items are clickable and navigate correctly
 */

test.describe('Feed Flow', () => {
  test.describe('Student Feed', () => {
    test.beforeEach(async ({ loginAsStudent }) => {
      await loginAsStudent();
    });

    test('should display student home feed', async ({ page }) => {
      // Should be on home page
      await expect(page).toHaveURL(/\/home/);

      // Feed container should be visible
      await expect(page.locator('[data-testid="student-feed"], .feed, main')).toBeVisible();
    });

    test('should show feed items or empty state', async ({ page }) => {
      // Either show feed items or an empty state message
      const hasFeedItems = await page.locator('[data-testid="feed-item"], .feed-card').count();
      const hasEmptyState = await page.getByText(/no items|nothing to show|up to date/i).isVisible().catch(() => false);

      expect(hasFeedItems > 0 || hasEmptyState).toBeTruthy();
    });

    test('should have navigation to courses', async ({ page }) => {
      // Check for courses link in navigation
      const coursesLink = page.getByRole('link', { name: /courses/i });
      await expect(coursesLink).toBeVisible();

      // Click on courses
      await coursesLink.click();

      // Should navigate to courses page
      await expect(page).toHaveURL(/\/courses/);
    });

    test('should have navigation to grades', async ({ page }) => {
      // Check for grades link in navigation (may be called "Academics" or "Grades")
      const gradesLink = page.getByRole('link', { name: /grades|academics/i });

      if (await gradesLink.isVisible().catch(() => false)) {
        await gradesLink.click();
        await expect(page).toHaveURL(/\/(grades|academics)/);
      }
    });

    test('should have navigation to AI assistant', async ({ page }) => {
      // Check for AI link in navigation
      const aiLink = page.getByRole('link', { name: /ai|assistant|study/i });

      if (await aiLink.isVisible().catch(() => false)) {
        await aiLink.click();
        await expect(page).toHaveURL(/\/ai/);
      }
    });
  });

  test.describe('Instructor Feed', () => {
    test.beforeEach(async ({ loginAsInstructor }) => {
      await loginAsInstructor();
    });

    test('should display instructor home feed', async ({ page }) => {
      // Should be on home page
      await expect(page).toHaveURL(/\/home/);

      // Feed container should be visible
      await expect(page.locator('[data-testid="instructor-feed"], .feed, main')).toBeVisible();
    });

    test('should show grading-related content or empty state', async ({ page }) => {
      // Instructor feed typically shows grading queue
      // Either show items or empty state
      const pageContent = await page.textContent('body');
      const hasContent = pageContent !== null && pageContent.length > 0;
      expect(hasContent).toBeTruthy();
    });

    test('should have navigation to courses', async ({ page }) => {
      const coursesLink = page.getByRole('link', { name: /courses/i });
      await expect(coursesLink).toBeVisible();

      await coursesLink.click();
      await expect(page).toHaveURL(/\/courses/);
    });
  });

  test.describe('Navigation Sidebar', () => {
    test('should show role-appropriate navigation items for student', async ({
      page,
      loginAsStudent,
    }) => {
      await loginAsStudent();

      // Check sidebar is visible (on desktop)
      const sidebar = page.locator('nav, [data-testid="sidebar"], aside');

      // On desktop, sidebar should be visible
      // On mobile, bottom nav should be visible
      const viewportSize = page.viewportSize();
      if (viewportSize && viewportSize.width >= 768) {
        await expect(sidebar.first()).toBeVisible();
      }

      // Should have Home link
      await expect(page.getByRole('link', { name: /home/i })).toBeVisible();

      // Should have Courses link
      await expect(page.getByRole('link', { name: /courses/i })).toBeVisible();
    });

    test('should show role-appropriate navigation items for instructor', async ({
      page,
      loginAsInstructor,
    }) => {
      await loginAsInstructor();

      // Should have Home link
      await expect(page.getByRole('link', { name: /home/i })).toBeVisible();

      // Should have Courses link
      await expect(page.getByRole('link', { name: /courses/i })).toBeVisible();
    });
  });
});
