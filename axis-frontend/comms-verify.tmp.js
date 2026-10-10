// Temporary verification script (not committed). Drives the touched pages.
const { chromium } = require('@playwright/test');
const BASE = 'http://localhost:4301';
const API = 'http://localhost:4302/api';
const C = '30000000-0000-0000-0000-000000000001';
const S = '40000000-0000-0000-0000-000000000001';
const QUIZ = '70000000-0000-0000-0000-000000000004';

async function apiDiscussionId() {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'student@Axis.demo', password: 'password123' }),
  });
  const cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const g = await fetch(`${API}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie, 'apollo-require-preflight': 'true' },
    body: JSON.stringify({ query: `{sectionDiscussions(sectionId:"${S}"){id title}}` }),
  });
  const j = await g.json();
  return j.data.sectionDiscussions[0];
}

async function run(email, pages) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text().slice(0, 200)));
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message.slice(0, 200)));
  page.on('response', (r) => r.status() >= 500 && problems.push(`5xx ${r.status()} ${r.url()}`));
  page.on('response', async (r) => {
    if (r.url().includes('/graphql') && r.request().method() === 'POST') {
      try {
        const j = await r.json();
        if (j.errors) problems.push('gqlerror: ' + j.errors.map((e) => e.message).join('|').slice(0, 200));
      } catch {}
    }
  });
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'password123');
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60000 });
  await page.waitForLoadState('networkidle');
  for (const [name, url, check] of pages) {
    problems.length = 0;
    await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(1500);
    let detail = '';
    try {
      detail = check ? await check(page) : '';
    } catch (e) {
      detail = 'CHECK FAILED: ' + e.message.slice(0, 200);
    }
    const h1 = await page.locator('h1, h2').first().textContent().catch(() => '');
    console.log(`[${email}] ${name} ${url}\n   heading="${(h1 || '').trim()}" ${detail}\n   problems=${JSON.stringify(problems)}`);
  }
  await browser.close();
}

(async () => {
  const d = await apiDiscussionId();
  const discUrl = `/courses/${C}/section/${S}/discussion/${d.id}`;
  const common = [
    ['messages', '/messages', async (p) => {
      const t = await p.locator('main').innerText();
      return 'convs-text=' + JSON.stringify(t.slice(0, 160));
    }],
    ['messages-thread', '/messages', async (p) => {
      const btn = p.locator('main button').filter({ hasText: /\w+ \w+/ }).first();
      await btn.click();
      await p.waitForLoadState('networkidle');
      await p.waitForTimeout(1000);
      const n = await p.locator('[role=region]').count();
      return `thread regions=${n} text=${JSON.stringify((await p.locator('main').innerText()).slice(0, 200))}`;
    }],
    ['notifications', '/notifications', async (p) => {
      const badges = await p.locator('main .text-xs.inline-flex, main [data-slot=badge]').allInnerTexts();
      return 'badges=' + JSON.stringify(badges);
    }],
    ['discussion', discUrl, async (p) => 'text=' + JSON.stringify((await p.locator('main').innerText()).slice(0, 200))],
    ['discussion-list', `/courses/${C}/section/${S}`, async (p) => {
      const tab = p.getByRole('tab', { name: /discussion/i });
      if (await tab.count()) { await tab.first().click(); await p.waitForTimeout(1500); }
      return 'has-disc-title=' + (await p.getByText(d.title).count());
    }],
    ['ai', '/ai', async (p) => {
      const item = p.locator('button').filter({ hasText: /Study Coach|Course Planner/ }).first();
      if (!(await item.count())) return 'no conversations';
      await item.click();
      await p.waitForLoadState('networkidle');
      await p.waitForTimeout(1500);
      const right = await p.locator('div.ml-auto.flex-row-reverse').count();
      const all = await p.locator('div.max-w-\\[85\\%\\]').count();
      return `user-bubbles(right-aligned)=${right} total-bubbles=${all}`;
    }],
    ['profile', '/profile', async (p) => 'roles=' + JSON.stringify(await p.locator('main [data-slot=badge]').allInnerTexts())],
    ['settings', '/settings', async (p) => 'switches=' + (await p.locator('[role=switch]').count()) + ' checked=' + (await p.locator('[role=switch][aria-checked=true]').count())],
  ];
  await run('student@Axis.demo', [
    ...common,
    ['quiz (student)', `/courses/${C}/section/${S}/assignment/${QUIZ}`, async (p) => {
      const start = await p.getByRole('button', { name: /Start Quiz/ }).count();
      const ready = await p.getByText('Ready to take the quiz?').count();
      return `start-btn=${start} intro=${ready}`;
    }],
  ]);
  await run('prof.chen@Axis.demo', [
    ...common,
    ['quiz builder (prof)', `/courses/${C}/section/${S}/assignment/${QUIZ}`, async (p) => {
      const builder = await p.getByText('Quiz Builder').count();
      await p.getByRole('button', { name: 'Add Question' }).first().click();
      await p.waitForTimeout(500);
      const trig = p.locator('button[role=combobox]').last();
      const before = await trig.innerText();
      const opts = await p.locator('input[placeholder^="Option"]').count();
      await trig.click();
      await p.getByRole('option', { name: 'Short Answer' }).click();
      await p.waitForTimeout(300);
      const after = await trig.innerText();
      const optsAfter = await p.locator('input[placeholder^="Option"]').count();
      const saNote = await p.getByText('Students will type a free-text answer').count();
      await trig.click();
      await p.getByRole('option', { name: 'True / False' }).click();
      await p.waitForTimeout(300);
      const tf = await p.locator('input[placeholder^="Option"]').evaluateAll((els) => els.map((e) => e.value));
      return `builder=${builder} type="${before}" mcq-options=${opts} -> "${after}" options=${optsAfter} sa-note=${saNote} tf-options=${JSON.stringify(tf)}`;
    }],
  ]);
})();
