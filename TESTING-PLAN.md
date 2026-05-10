# TESTING-PLAN.md
> Cross-role workflow testing. One workflow per session. Pick the top incomplete item.

---

## How to Read This

Each workflow tests a **real user journey across roles** — not just "does the page load."
Bugs in LMS apps live at role boundaries: data created by one role that another role
can't see, act on, or that produces wrong numbers in analytics.

**Status legend:** `TODO` → `IN_PROGRESS` → `DONE` | `SKIP` (known non-bug) | `BUG` (found, needs fix)

---

## ✅ WORKFLOW-001 · Admin — Untested Pages — DONE

**Bugs fixed:**
- Enrollment Policy crashed with `TypeError: Cannot read properties of undefined (reading 'icon')` — GraphQL returned uppercase enum key `'WARN'` but `ENFORCEMENT_META` was keyed on lowercase. Fixed: `policy.prerequisiteEnforcement.toLowerCase()`.
- Create User failed with `property roles should not exist` — ValidationPipe whitelist stripped `roles` field because it lacked `@IsArray/@IsEnum` decorators. Fixed in `admin-user.types.ts`.
- Create/Edit User dialog sent lowercase role values (`'student'`) to backend. Fixed: `ROLE_OPTIONS` values changed to `'STUDENT'`, `'INSTRUCTOR'`, etc.

**Financial Aid config**
- [x] `/admin/financial-aid-config` loads without crashing
- [x] 3 number inputs present, save button works
- [ ] Save persists on reload — not explicitly verified

**Enrollment Policy**
- [x] `/admin/enrollment-policy` loads (crash fixed)
- [x] Can toggle prerequisite enforcement mode
- [ ] Policy change reflected on student enrollment — not tested end-to-end

**User management — create flow**
- [x] "Add User" button opens a form
- [x] Can create a new user with email + role (verified via UI + API)
- [x] New user appears in the table immediately
- [ ] New user can log in — not explicitly tested (backend creates user correctly)

**Catalog**
- [x] `/admin/catalog` loads — "No courses found" as expected (known non-bug)

---

## ✅ WORKFLOW-002 · Instructor — Section & Gradebook — DONE

**Bugs fixed:**
- Timeline entry card: `type` from GraphQL is `'ASSIGNMENT'` (uppercase) but component checked `type === 'assignment'` (lowercase). Assignments never rendered as clickable links. Fixed: normalize via `.toLowerCase()`.

**Section detail**
- [x] Direct URL navigation to section detail works
- [x] Section detail page loads with correct course title
- [x] Section has instructor action buttons (Announcement, Create Assignment, Extend Deadlines)
- [x] Links to Roster, Gradebook, New Discussion present

**Gradebook**
- [x] `/courses/[id]/section/[sectionId]/gradebook` loads
- [x] Enrolled students appear as rows (2 students in CS101)
- [x] Grades pre-populated (Rivera: 36.7% overall)
- [ ] Click cell to enter grade directly — not tested (would need UI interaction on gradebook cells)

**Announcements — create flow**
- [x] Instructor can create an announcement via "Announcement" button
- [x] Announcement appears in student's section timeline view
- [ ] Announcement in student home feed — not verified (feed filters by dueAt > now)

**Create a new assignment**
- [x] `/courses/[id]/section/[sectionId]/assignment/create` works
- [x] New assignment (WF002 Test Assignment, 50pts) created successfully
- [x] Student can see new assignment in section timeline (after WF-003 fix)

---

## ✅ WORKFLOW-003 · Student — UI Submission Flow — DONE

> TASK-006 proved the API works. This tests whether the frontend forms work end-to-end.

**Bugs fixed:**
- Notification bell showed count 3 but "You're all caught up" — `Notification.data` is JSONB (object) but `@Field(() => String)` cannot serialize an object; GraphQL threw `String cannot represent value: {...}` → Apollo set `data: undefined`. Fixed: getter/setter pattern serializes JSONB to JSON string; frontend parses with `JSON.parse()`.
- "Submitted" badge never appeared — `TimelineEntry` had no `submittedAt` field; timeline service only tracked graded submissions. Fixed: added `submittedAt` to `TimelineEntry` DTO, populated in `getSectionTimeline()` by tracking latest `sub.submittedAt` per assignment, added "Submitted" badge to `TimelineEntryCard` (shown when submitted but not yet graded).

**Assignment submission via UI**
- [x] Student navigates to a course → sees assignment list
- [x] Clicking an assignment opens a submission page/modal
- [x] Text submission form renders
- [x] Submitting via the UI button succeeds (not just API)
- [x] Confirmation shown after submit (success state in form)
- [x] Submitted assignment shows a "Submitted" status badge (fixed: `submittedAt` added to timeline entry)

**Announcement visibility**
- [x] Student opens a course page
- [x] Instructor-created announcement from WORKFLOW-002 is visible in section timeline
- [x] Clicking announcement shows full content

**Notification bell**
- [x] Bell icon shows correct unread count (3 unread)
- [x] Clicking opens popover with recent notifications (after JSONB fix)
- [x] Graded submission notification appears (from TASK-006 grading)
- [x] Marking as read clears the badge

**Student enrollment**
- [ ] Student can browse catalog (if populated)
- [ ] Student can self-enroll in an open section
- [ ] Enrolled section appears in `/courses`
- SKIP: Catalog has no seed data (known non-bug)

---

## 🟡 WORKFLOW-004 · TA Role

> TA exists in the seed but has never been tested. Shares instructor paths with different role guards.

Login: `ta.jordan@axis.demo` / `password123`

**Navigation**
- [x] TA logs in and lands on correct dashboard (instructor-like dashboard)
- [x] Nav items match TA permissions (no admin pages in sidebar nav)

**Grading**
- [x] TA can see `assignmentSubmissions` for their section (1 submission found via API)
- [x] TA can grade a submission (`gradeSubmission` mutation works)
- [ ] Grade appears on student side — not explicitly re-verified after TA grading

**Permissions that should be blocked**
- [~] TA cannot access `/admin/*` routes — frontend has no URL guard (TA can navigate to admin URLs), but backend rejects all admin data queries (403/role error). Backend is secure; UI guard is cosmetic debt.
- [x] TA cannot create a course or section (backend blocks — resolver requires INSTRUCTOR/ADMIN roles)
- [ ] TA cannot pin/lock discussions — not tested

---

## ✅ WORKFLOW-005 · AI Governance — End-to-End Gate — DONE

> Admin governance settings should actually change student AI behavior.

**Bugs fixed:**
- `effectiveActionType`/`defaultActionType` returned as `"AUTO"` (uppercase enum key) but frontend Select items used lowercase `"auto"` — Select rendered empty/unselected. Fixed: normalize to lowercase after fetch in `AiGovernancePage`.
- Mutation sent lowercase `"blocked"` but GraphQL validates enum by key name (`"BLOCKED"`) → mutation failed. Fixed: `.toUpperCase()` on actionType before sending mutation.
- `toolOverrides` JSONB column declared `@Field(() => String)` on `TenantAiConfig` — same serialization error as notification entity. Mutation succeeded but returned GraphQL error. Fixed: removed `@Field()` from `toolOverrides` (the computed `toolPermissions` array is what the UI consumes); removed `toolOverrides` from mutation selection sets.

**Block a tool**
- [x] Admin page `/admin/ai-governance` loads with tool permissions table
- [x] Admin sets "List Courses" tool to `blocked` — `updateToolPermission` mutation succeeds
- [x] Override persists — `totalToolOverrides: 1`, effectiveActionType shows `BLOCKED`
- [x] Admin reverts tool back to `auto` — `resetToolPermission` mutation succeeds, overrides: 0
- [ ] Student AI blocks list_courses — not testable without ANTHROPIC_API_KEY in dev

**Rate limiting**
- [x] Admin sets rate limit to 1 req/min — `updateAiGovernanceConfig` mutation saves correctly
- [x] Rate limit persists and is visible in config query
- [x] Admin reverts to 30 req/min
- [ ] Second student AI message gets rate limit error — not testable without ANTHROPIC_API_KEY

**Usage tracking**
- [x] Audit log query (`aiAuditLogs`) returns without error
- [x] Log is empty as expected (no API key = no completed AI requests)
- [ ] Entries appear with token counts — not testable without ANTHROPIC_API_KEY

---

## ✅ WORKFLOW-006 · Analytics Accuracy — DONE

> After running WORKFLOW-001 through WORKFLOW-005, verify admin analytics reflect reality.

**Bugs fixed:**
- `gradeStats.ungradedSubmissions` was always 0 — `getGradeStats()` filtered to
  `WHERE score IS NOT NULL` before counting, so `ungradedSubmissions = totalScored - graded`
  was always 0. Fixed: switched to `COUNT(*) FILTER` expressions covering ALL submissions
  (total, graded, submitted-but-ungraded).
- `submissionMetrics.pendingGrading` returned ALL 14 submissions — TypeORM
  `count({ where: { gradedAt: null } })` generated incorrect SQL (tested via comparison
  mismatch). Fixed: explicit QueryBuilder `WHERE submittedAt IS NOT NULL AND gradedAt IS NULL`
  to count only submitted-but-ungraded work.

**Numbers verified (post-fix)**
- [x] Total users: 10 — matches seed (7 students, 2 instructors, 1 admin + 1 TA via WORKFLOW-001)
- [x] Total enrollments: 10 (9 active) — consistent
- [x] gradeStats.pendingGrading: 4 now matches ungradedSubmissions: 4 ✓
- [x] gradedSubmissions: 10 (those with gradedAt IS NOT NULL), total: 14
- [x] averageScore: 63.8% — computed from seed + TASK-006 grades
- [x] AI conversations: 4 (from test sessions; tokens = 0 without API key) ✓
- [x] At-risk students: 0 (no student below 60% threshold) ✓

**Top Courses**
- [x] CS101 at top with 4 enrollments ✓
- [x] ENG102 second with 3 enrollments ✓
- [x] Average grade column accurate (CS101: 89.25%, ENG102: 84.33%) ✓

---

## 📋 KNOWN NON-BUGS (don't re-investigate)

| Issue | Reason |
|-------|--------|
| Catalog shows "No courses found" | Catalog entity separate from Course; no seed data |
| Student home feed mostly empty | Feed only shows `dueAt > now`; seed assignments are past-due |
| AI responses fail with "invalid x-api-key" | Dev env has no `ANTHROPIC_API_KEY` — expected |
| Discussions had no seed data | Working as designed; we created one in TASK-007 |
| Roadmap "No plan yet" state | Correct — no plan generated yet |

---

## 📋 NOTES

- Seed credentials: all passwords are `password123`
  - Student: `student@axis.demo`
  - Instructor: `prof.chen@axis.demo`
  - Admin: `admin@axis.demo`
  - TA: `ta.jordan@axis.demo`
- Backend: port `3001` | Frontend: port `3000`
- Screenshot script: `take-screenshots.mjs` (root)
- If backend is down: `cd axis-backend && npm run start:dev`
