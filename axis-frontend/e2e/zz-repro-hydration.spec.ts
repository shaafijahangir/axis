import { test } from '@playwright/test';

// Scratch reproduction (not committed): submit the login form before React hydrates.
for (const delayMs of [0, 3000]) {
  test(`pre-hydration submit (chunk delay ${delayMs}ms)`, async ({ page }) => {
    if (delayMs) {
      await page.route('**/_next/static/chunks/**', async (route) => {
        await new Promise((r) => setTimeout(r, delayMs));
        await route.continue();
      });
    }
    const navs: string[] = [];
    page.on('framenavigated', (f) => {
      if (f === page.mainFrame()) navs.push(f.url());
    });
    await page.goto('/login', { waitUntil: 'commit' });
    await page.getByLabel(/email/i).fill('student@Axis.demo');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();
    try {
      await page.waitForURL(/\/home/, { timeout: 20000 });
    } finally {
      console.log(
        'navs',
        JSON.stringify(navs),
        'final',
        page.url(),
        'email=',
        await page.getByLabel(/email/i).inputValue().catch(() => 'n/a'),
      );
    }
  });
}
