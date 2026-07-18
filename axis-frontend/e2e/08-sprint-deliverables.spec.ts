import { test, expect } from './fixtures';

/**
 * Real Playwright coverage for the Sprint 1-5 deliverables. Unlike the
 * .screenshots/ navigation pass, this spec actually clicks buttons, fills
 * forms, and asserts that the resulting UI state reflects a real backend
 * mutation. Sign of correctness is "the just-created thing appears" —
 * which proves the mutation hit the resolver and persisted.
 *
 * Uses seed credentials documented in `axis-backend/src/database/seed.ts`:
 *   admin@Axis.demo / password123
 *   prof.chen@Axis.demo / password123
 *   student@Axis.demo / password123
 */

const ADMIN_EMAIL = 'admin@Axis.demo';
const INSTRUCTOR_EMAIL = 'prof.chen@Axis.demo';
const STUDENT_EMAIL = 'student@Axis.demo';
const PASSWORD = 'password123';

test.describe('Sprint 4: Admin announcement composer', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginAs(ADMIN_EMAIL, PASSWORD);
  });

  test('admin can compose and send a school-wide announcement', async ({
    page,
  }) => {
    const uniqueTitle = `Smoke Announcement ${Date.now()}`;

    await page.goto('/admin/announcements');
    await expect(page.getByRole('heading', { name: /announcements/i })).toBeVisible();

    // Open composer
    await page.getByRole('button', { name: /new announcement/i }).click();
    await expect(
      page.getByRole('heading', { name: /new announcement/i }),
    ).toBeVisible();

    // SCHOOL_WIDE is default scope — pick title + body
    await page.getByLabel('Title').fill(uniqueTitle);
    await page.getByLabel('Message').fill('E2E smoke body — please ignore.');

    // Recipient count should appear
    await expect(page.getByText(/visible to \d+ students?/i)).toBeVisible({
      timeout: 5000,
    });

    // Send
    await page.getByRole('button', { name: /send announcement/i }).click();

    // Dialog closes; new announcement appears in the list
    await expect(
      page.getByRole('heading', { name: /announcements/i }),
    ).toBeVisible();
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10000 });
  });

  test('section announcement requires picking a section', async ({ page }) => {
    await page.goto('/admin/announcements');
    await page.getByRole('button', { name: /new announcement/i }).click();

    // Switch to Section scope — submit button should be disabled until section + body
    await page.getByRole('button', { name: /^section$/i }).click();
    await page.getByLabel('Title').fill('section-scope test');
    await page.getByLabel('Message').fill('body');

    // Submit button should be disabled until a section is picked
    const sendBtn = page.getByRole('button', { name: /send announcement/i });
    await expect(sendBtn).toBeDisabled();
  });
});

test.describe('Sprint 3: K-12 student fields', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginAs(ADMIN_EMAIL, PASSWORD);
  });

  test('admin can filter people by grade level', async ({ page }) => {
    await page.goto('/people');
    await expect(page.getByRole('heading', { name: /people/i })).toBeVisible();

    // Open the Grade combobox and select Grade 11
    const gradeCombo = page.getByRole('combobox').filter({ hasText: /grade/i });
    await gradeCombo.first().click();
    await page.getByRole('option', { name: 'Grade 11' }).click();

    // URL doesn't change but the table re-fetches. Verify by absence of
    // non-student rows or by some grade-11 user appearing if seeded.
    // The deterministic assertion: the combobox now shows "Grade 11".
    await expect(page.getByText(/grade 11/i).first()).toBeVisible();
  });
});

test.describe('Sprint 1: Schedule visual grid', () => {
  test('student schedule renders the timetable grid', async ({
    page,
    loginAs,
  }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginAs(STUDENT_EMAIL, PASSWORD);

    await page.goto('/schedule');
    // `level: 1` disambiguates from empty-state headings like "No schedule set yet".
    await expect(
      page.getByRole('heading', { name: /schedule/i, level: 1 }),
    ).toBeVisible();

    // The grid renders day headers MON–FRI. Verify all five present.
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) {
      await expect(
        page.getByText(new RegExp(`^${day}`, 'i')).first(),
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('instructor schedule loads without crashing', async ({
    page,
    loginAs,
  }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginAs(INSTRUCTOR_EMAIL, PASSWORD);

    await page.goto('/schedule');
    // `level: 1` disambiguates from empty-state headings like "No schedule set yet".
    await expect(
      page.getByRole('heading', { name: /schedule/i, level: 1 }),
    ).toBeVisible();
  });

  // FEAT-021: the prof card on a course page carries the UVic directory
  // model (name, title, office, email) plus the booking CTA.
  test('course page shows the prof card with directory details', async ({
    page,
    loginAs,
  }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginAs(STUDENT_EMAIL, PASSWORD);

    // CSC 110 section (fixed seed ids: course 3...1, section 4...1)
    await page.goto(
      '/courses/30000000-0000-0000-0000-000000000001/section/40000000-0000-0000-0000-000000000001',
    );
    await expect(page.getByText('Sarah Chen').first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Associate Professor').first()).toBeVisible();
    await expect(page.getByText('ECS 618').first()).toBeVisible();
  });

  // FEAT-020: the home feed is the primary surface for appointments — the
  // seeded booking (Alex → Prof Chen, next Wednesday) must appear in it.
  test('student home feed shows the booked appointment', async ({
    page,
    loginAs,
  }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginAs(STUDENT_EMAIL, PASSWORD);

    await page.goto('/home');
    await expect(
      page.getByText(/office hours with prof\. sarah chen/i).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  // FEAT-019: instructor /schedule is the unified week — office hours and
  // busy times render alongside lectures, with management cards below.
  test('instructor schedule shows office hours and busy times', async ({
    page,
    loginAs,
  }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginAs(INSTRUCTOR_EMAIL, PASSWORD);

    await page.goto('/schedule');
    // Seeded office-hour block (Wed 11:00) appears on the grid and/or legend.
    await expect(page.getByText(/office hours/i).first()).toBeVisible();
    // Seeded busy block label ("Research", Tue 13:00–15:00).
    await expect(page.getByText('Research').first()).toBeVisible();
    // Management cards are present.
    await expect(page.getByText('Busy Times')).toBeVisible();
  });
});

test.describe('Sprint 5: Bulk import discoverability', () => {
  test('people page exposes the Bulk Import CTA', async ({ page, loginAs }) => {
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginAs(ADMIN_EMAIL, PASSWORD);

    await page.goto('/people');
    const bulkImportLink = page.getByRole('link', { name: /bulk import/i });
    await expect(bulkImportLink).toBeVisible();
    await expect(bulkImportLink).toHaveAttribute('href', '/admin/catalog/import');
  });
});
