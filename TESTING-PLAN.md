# TESTING-PLAN.md
> Cross-role workflow testing. One workflow per session. Pick the top incomplete item.

---

## How to Read This

Each workflow tests a **real user journey across roles** — not just "does the page load."
Bugs in LMS apps live at role boundaries: data created by one role that another role
can't see, act on, or that produces wrong numbers in analytics.

**Status legend:** `TODO` → `IN_PROGRESS` → `DONE` | `SKIP` (known non-bug) | `BUG` (found, needs fix)

---

## 🔴 WORKFLOW-001 · Admin — Untested Pages

> These admin pages exist in the nav but have never been opened.

**Financial Aid config**
- [ ] `/admin/financial-aid-config` loads without crashing
- [ ] Can set full-time threshold, half-time threshold, max timeframe %
- [ ] Save persists (reload and verify)

**Enrollment Policy**
- [ ] `/admin/enrollment-policy` (or similar route) loads
- [ ] Can toggle open/closed/invite-only enrollment
- [ ] Policy change is reflected when a student tries to enroll

**User management — create flow**
- [ ] "Add User" button on `/people` opens a form
- [ ] Can create a new user with email + role
- [ ] New user appears in the list
- [ ] New user can log in with the assigned credentials

**Catalog**
- [ ] `/admin/catalog` loads (known: "No courses found" — separate entity, no seed data)
- [ ] "Add to catalog" flow exists — does it do anything?

---

## 🔴 WORKFLOW-002 · Instructor — Section & Gradebook

> Section navigation was noted as "not wired up" in TASK-003. Gradebook never tested visually.

**Section detail**
- [ ] From `/courses`, can the instructor click into a specific section?
- [ ] Section detail page loads with correct course/section info
- [ ] Assignments listed under the section
- [ ] Students enrolled in the section are visible

**Gradebook**
- [ ] `/courses/[sectionId]/gradebook` loads
- [ ] Enrolled students appear as rows
- [ ] Assignments appear as columns
- [ ] Existing grades (from seed + TASK-006) are pre-populated
- [ ] Can click a cell and enter a grade directly in the UI

**Announcements — create flow**
- [ ] Instructor can create an announcement for a section
- [ ] Announcement appears for a student enrolled in that section
- [ ] Announcement appears in student home feed

**Create a new assignment**
- [ ] Instructor can create an assignment (title, due date, points)
- [ ] New assignment appears in the section's assignment list
- [ ] Student can see and submit the new assignment

---

## 🟡 WORKFLOW-003 · Student — UI Submission Flow

> TASK-006 proved the API works. This tests whether the frontend forms work end-to-end.

**Assignment submission via UI**
- [ ] Student navigates to a course → sees assignment list
- [ ] Clicking an assignment opens a submission page/modal
- [ ] Text submission form renders
- [ ] Submitting via the UI button succeeds (not just API)
- [ ] Confirmation shown after submit
- [ ] Submitted assignment shows a "Submitted" status badge

**Announcement visibility**
- [ ] Student opens a course page
- [ ] Instructor-created announcement from WORKFLOW-002 is visible
- [ ] Clicking announcement shows full content

**Notification bell**
- [ ] Bell icon shows correct unread count
- [ ] Clicking opens popover with recent notifications
- [ ] Graded submission notification appears (from TASK-006 grading)
- [ ] Marking as read clears the badge

**Student enrollment**
- [ ] Student can browse catalog (if populated)
- [ ] Student can self-enroll in an open section
- [ ] Enrolled section appears in `/courses`

---

## 🟡 WORKFLOW-004 · TA Role

> TA exists in the seed but has never been tested. Shares instructor paths with different role guards.

Login: `ta.jordan@nexused.demo` / `password123`

**Navigation**
- [ ] TA logs in and lands on correct dashboard (instructor-like or student-like?)
- [ ] Nav items match TA permissions (no admin pages)

**Grading**
- [ ] TA can see `assignmentSubmissions` for their section
- [ ] TA can grade a submission (`gradeSubmission` mutation)
- [ ] Grade appears on student side

**Permissions that should be blocked**
- [ ] TA cannot access `/admin/*` routes
- [ ] TA cannot create a course or section
- [ ] TA cannot pin/lock discussions (instructor-only)

---

## 🟡 WORKFLOW-005 · AI Governance — End-to-End Gate

> Admin governance settings should actually change student AI behavior.

**Block a tool**
- [ ] Admin sets "List Courses" tool to `blocked` in AI Governance
- [ ] Student starts AI conversation and asks about their courses
- [ ] AI cannot use the List Courses tool (returns appropriate message)
- [ ] Admin reverts tool back to `auto`

**Rate limiting**
- [ ] Admin sets rate limit to 1 req/min
- [ ] Student sends 2 AI messages in quick succession
- [ ] Second message gets a rate limit error (not a crash)
- [ ] Admin reverts rate limit

**Usage tracking**
- [ ] Student sends several AI messages
- [ ] Admin → AI Governance → Audit Log shows those messages
- [ ] Token count and cost are logged (even if $0 without API key)

---

## 🔵 WORKFLOW-006 · Analytics Accuracy

> After running WORKFLOW-001 through WORKFLOW-005, verify admin analytics reflect reality.

**Numbers to verify**
- [ ] Total users count matches what was created
- [ ] Enrollments count matches actual enrollments
- [ ] Pending grading count: "13 total" vs "Ungraded: 0" inconsistency — root cause?
- [ ] Grade distribution includes grades from TASK-006 + WORKFLOW-003
- [ ] AI Conversations count reflects WORKFLOW-005 sessions
- [ ] At-risk students: are any students below 60% average?

**Top Courses**
- [ ] CS101 appears at top (most enrollments)
- [ ] Average grade column is accurate

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
  - Student: `student@nexused.demo`
  - Instructor: `prof.chen@nexused.demo`
  - Admin: `admin@nexused.demo`
  - TA: `ta.jordan@nexused.demo`
- Backend: port `3001` | Frontend: port `3000`
- Screenshot script: `take-screenshots.mjs` (root)
- If backend is down: `cd nexused-backend && npm run start:dev`
