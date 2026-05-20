# Current Demo Screenshots — 2026-05-20

Fresh capture of the post-Sprint-1-through-7 UI. Replaces the earlier
`sprint-8-smoke/` set which predated the admin nav update and the
people-page Bulk Import CTA.

> **Note:** `.png` files are gitignored (dev artifacts). The PNGs in
> this folder are local-only. Regenerate them anytime via the
> Playwright smoke spec.

## Regenerating the screenshots

```bash
pnpm infra:up                                    # postgres + redis + minio
pnpm --filter axis-backend seed                  # demo data
pnpm dev:web                                     # in one terminal

# in another terminal:
cd axis-frontend
CI=1 E2E_BASE_URL=http://localhost:3001 \
  E2E_API_URL=http://localhost:3002/api \
  npx playwright test e2e/08-sprint-deliverables.spec.ts \
  --reporter=list --workers=1 --project=chromium
```

The Playwright spec writes screenshots to `test-results/` on failure.
For the marketing-style walkthrough captures, drive the browser
through the demo path with the Playwright MCP (or any browser
automation tool) and save to this folder.

Captured against:
- Frontend `localhost:3001` (Next.js dev)
- Backend `localhost:3002` (NestJS dev)
- Seeded demo data (`pnpm --filter axis-backend seed`)

## Demo credentials
- Admin: `admin@Axis.demo` / `password123`
- Instructor: `prof.chen@Axis.demo` / `password123`
- Student: `student@Axis.demo` / `password123`

## Index

### shared/
- `01-login.png` — login page

### admin/
- `01-home.png` — admin dashboard
- `02-people.png` — users table with grade filter (SPRINT-3) + Bulk Import CTA (SPRINT-5) + Grade · Homeroom column (SPRINT-3)
- `03-announcements.png` — tenant-wide list with scope/pin/urgent badges (SPRINT-4)
- `04-announcement-composer.png` — three-scope composer with recipient preview (SPRINT-4)
- `05-bulk-import.png` — five-type import wizard (SPRINT-5)
- `06-catalog.png` — admin catalog

### instructor/
- `01-home.png` — instructor dashboard
- `02-schedule.png` — visual weekly timetable (SPRINT-1)
- `03-courses.png` — instructor course list
- `04-gradebook.png` — gradebook for a section

### student/
- `01-home.png` — student feed
- `02-schedule.png` — student timetable
- `03-grades.png` — grades + attendance summary
- `04-courses.png` — enrolled courses
- `05-ai.png` — AI Study Coach
- `06-notifications.png` — notifications inbox
- `07-profile.png` — profile with name editing
