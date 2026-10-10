import { test } from '@playwright/test';

// Scratch diagnostic (not committed): exactly the fixture's steps, with timing.
test('fixture-path diagnostic', async ({ page }) => {
  const t0 = Date.now();
  const log = (m: string) => console.log(`${Date.now() - t0}ms ${m}`);
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) log(`nav ${f.url()}`);
  });
  page.on('request', (r) => {
    if (r.url().includes('/auth/')) log(`req ${r.method()} ${r.url()}`);
  });
  page.on('response', (r) => {
    if (r.url().includes('/auth/')) log(`res ${r.status()} ${r.url()}`);
  });
  page.on('console', (m) => log(`console.${m.type()} ${m.text().slice(0, 200)}`));
  await page.goto('/login');
  log('goto resolved (load)');
  const hydrated = await page.evaluate(() =>
    Object.keys(document.querySelector('form') ?? {}).some((k) => k.startsWith('__react')),
  );
  log(`react attached to form at click time: ${hydrated}`);
  await page.getByLabel(/email/i).fill('prof.chen@Axis.demo');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  log('clicked');
  try {
    await page.waitForURL(/\/home/, { timeout: 25000 });
    log('reached home');
  } catch {
    log(`TIMEOUT url=${page.url()}`);
  }
});
