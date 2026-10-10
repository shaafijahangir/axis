import { test, expect } from '@playwright/test';

/**
 * Regression: submitting the login form before React hydrates used to fall
 * through to a native GET submit ("/login?"), wipe the typed credentials and
 * strand the user on /login. That was the root cause of the ~7 login-flaky
 * e2e tests on every CI run. The submit button now stays disabled until
 * hydration, and the handler reads values from the form at submit time.
 *
 * The JS-chunk delay widens the pre-hydration window so the race is
 * deterministic instead of timing-dependent.
 */
for (const delayMs of [0, 3000]) {
  test(`login typed before hydration still signs in (chunk delay ${delayMs}ms)`, async ({
    page,
  }) => {
    if (delayMs) {
      await page.route('**/_next/static/chunks/**', async (route) => {
        await new Promise((r) => setTimeout(r, delayMs));
        await route.continue();
      });
    }
    const navigations: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });

    await page.goto('/login', { waitUntil: 'commit' });
    await page.getByLabel(/email/i).fill('student@Axis.demo');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/home/, { timeout: 25_000 });
    // Never a native form submit: credentials must not hit the URL.
    expect(navigations.some((u) => u.includes('/login?'))).toBe(false);
  });
}
