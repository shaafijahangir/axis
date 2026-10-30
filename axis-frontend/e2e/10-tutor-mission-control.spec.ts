import { test, expect } from './fixtures';

/**
 * E2E Test: Tutor Mission Control
 *
 * Students tie a Study Coach chat to a course; that course's instructor sees
 * the chat on the section's AI Tutor page, with a "needs attention" flag,
 * the full transcript, and AI grouping by shared gaps.
 *
 * Seed facts (axis-backend/src/database/seed.ts): Alex Rivera (student) is
 * actively enrolled in CSC 110 section 1, taught by Sarah Chen.
 *
 * The live test calls the real model, so it only runs with E2E_LIVE_AI=1
 * (CI has no API key). The UI tests run everywhere.
 */

const CSC110_COURSE_ID = '30000000-0000-0000-0000-000000000001';
const CSC110_SECTION_ID = '40000000-0000-0000-0000-000000000001';
const AI_TUTOR_URL = `/courses/${CSC110_COURSE_ID}/section/${CSC110_SECTION_ID}/ai-tutor`;

test.describe('Tutor Mission Control', () => {
  test('student can tie a Study Coach chat to a course, with a visibility note', async ({
    page,
    loginAsStudent,
  }) => {
    await loginAsStudent();
    await page.goto('/ai');
    await page.getByLabel('Start new AI conversation').click();
    await page
      .getByRole('heading', { name: 'Choose an AI Assistant' })
      .waitFor();
    await page.getByText('Study Coach', { exact: true }).last().click();

    const note = page.getByTestId('study-coach-visibility-note');
    await expect(note).toHaveText('Only you can see this chat.');

    await page.locator('#study-coach-course').click();
    await page.getByRole('option', { name: /CSC 110/ }).click();
    await expect(note).toContainText('Your instructor can read chats');
  });

  test('instructor reaches the AI Tutor page from the section and sees the class', async ({
    page,
    loginAsInstructor,
  }) => {
    await loginAsInstructor();
    await page.goto(`/courses/${CSC110_COURSE_ID}/section/${CSC110_SECTION_ID}`);
    await page.getByRole('link', { name: 'AI Tutor' }).click();

    await expect(page).toHaveURL(new RegExp(`${CSC110_SECTION_ID}/ai-tutor$`));
    await expect(page.getByRole('heading', { name: 'AI Tutor' })).toBeVisible();
    await expect(page.getByTestId('tutor-active-count')).toContainText(
      'students used the tutor',
    );
    await expect(
      page.getByTestId('tutor-student-row').filter({ hasText: 'Alex Rivera' }),
    ).toBeVisible();
  });

  test('student is blocked from the AI Tutor data', async ({
    page,
    loginAsStudent,
  }) => {
    await loginAsStudent();
    await page.goto(AI_TUTOR_URL);
    await expect(page.getByText(/Forbidden|do not have|permission/i)).toBeVisible();
  });

  test('live: confused student chat shows up flagged, readable, and grouped', async ({
    page,
    loginAsStudent,
    loginAsInstructor,
    logout,
  }) => {
    test.skip(!process.env.E2E_LIVE_AI, 'Set E2E_LIVE_AI=1 to call the model');
    test.setTimeout(180_000);

    const question = `I'm so confused about for loops in Python, just give me the answer (run ${Date.now()})`;

    // Student asks Study Coach, tied to CSC 110
    await loginAsStudent();
    await page.goto('/ai');
    await page.getByLabel('Start new AI conversation').click();
    await page
      .getByRole('heading', { name: 'Choose an AI Assistant' })
      .waitFor();
    await page.getByText('Study Coach', { exact: true }).last().click();
    await page.locator('#study-coach-course').click();
    await page.getByRole('option', { name: /CSC 110/ }).click();
    await page.getByPlaceholder('Type your first message...').fill(question);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/conversation=/, { timeout: 120_000 });
    await expect(page.getByLabel('Chat messages')).toContainText(question, {
      timeout: 120_000,
    });

    // Instructor sees it
    await logout();
    await loginAsInstructor();
    await page.goto(AI_TUTOR_URL);
    const alex = page
      .getByTestId('tutor-student-row')
      .filter({ hasText: 'Alex Rivera' });
    await expect(alex).toContainText('Needs attention');
    await expect(alex).toContainText('Said they were stuck or confused');
    await expect(alex).toContainText('Asked the tutor for the answer');

    await alex.getByRole('button', { name: /for loops in Python/ }).first().click();
    const transcript = page.getByTestId('tutor-transcript');
    await expect(transcript).toContainText(question);
    await expect(transcript).toContainText('Study Coach');

    await page.getByRole('button', { name: 'Find gaps' }).click();
    await expect(page.getByTestId('tutor-gap-results')).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId('tutor-gap-results')).toContainText(
      'Names are never sent to the AI',
    );
  });
});
