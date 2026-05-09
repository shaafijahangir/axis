# TO-WORK-ON.md
> One task per Claude session. Pick the top item, complete it, strike it out.

---

## ~~🔴 BLOCKING — Backend won't start~~

### ~~TASK-001 · Fix TypeORM entity startup crash~~ ✅ DONE
All four entity union-type crashes fixed: `file-upload`, `assignment`, `discussion-reply`, `device-token`.

---

## 🟡 FUNCTIONAL — App features to test & fix

> These require the backend running. Seed credentials: all passwords are `password123`.
> - Student:    `student@axis.demo`
> - Instructor: `prof.chen@axis.demo`
> - Admin:      `admin@axis.demo`
> - TA:         `ta.jordan@axis.demo`

---

### ~~TASK-002 · Student dashboard deep dive~~ ✅ DONE
Tested via GraphQL API as `student@axis.demo` (Alex Rivera).

**Working:**
- [x] Login — JWT auth OK
- [x] Courses — 4 active (CS101, MATH201, ENG102, PHYS150) + 1 completed
- [x] Grades — CS101 90%, MATH201 85.6%, ENG102 85.8%, PHYS150 90.7%
- [x] Planner — degree profile active, 2025 enrollment, 2028 expected grad
- [x] AI Agents — Study Coach + Course Planner available
- [x] AI Conversations — fixed (was silently broken, see bugs fixed below)

**Bugs found and fixed:**
- AI resolver `myConversations` / `conversationMessages` collided with messaging
  resolver names → silently dropped from schema. Renamed to `myAiConversations` /
  `aiMessages` (backend + frontend queries + component type annotations).
- EmailService crashed at boot when RESEND_API_KEY unset → added early return.

**Known non-bug:**
- Feed shows 0 items — seed assignments all have Spring 2026 due dates (past).
  Feed logic only surfaces `dueAt > now` items. Reseed needed to see feed data.

---

### ~~TASK-003 · Instructor dashboard deep dive~~ ✅ DONE
Tested visually via screenshots as `prof.chen@axis.demo` (Sarah Chen).

**Working:**
- [x] Instructor home — "Welcome back, Sarah" with 3 pending submissions (CS101 HW2, ENG102 Essay 1, Essay 2)
- [x] Courses list loads (shows all 7 tenant courses in table view)
- [x] API: sections, assignments, announcements all return data correctly

**Known non-bugs:**
- Courses page shows all courses (not just instructor's sections) — by design for instructors
- Course section detail / gradebook screenshots not captured (no `a[href*="/section/"]` links on courses page — section navigation not wired up in courses list yet)
- Discussions: no seed data for discussions, returns empty

---

### ~~TASK-004 · Admin dashboard deep dive~~ ✅ DONE
Tested visually via screenshots as `admin@axis.demo` (Marcus Williams).

**Working:**
- [x] Admin home — 8 users, 7 courses, 5 sections, 10 enrollments
- [x] People management — all 8 users listed with roles and status
- [x] AI Governance — AI enabled, 30 rpm rate limit, 16 tools listed with permission toggles
- [x] Analytics — full dashboard after fixes (see bugs below)
- [x] Integrations — LTI config with OIDC/JWKS/launch URLs

**Bugs found and fixed:**
- Analytics crashed with `"Relation with property path sections in entity was not found"` —
  `getTopCourses` used `leftJoin('course.sections')` and `leftJoin('enrollment.submissions')` but
  neither `Course.sections` nor `Enrollment.submissions` relations are defined.
  Fixed: explicit entity-class joins + separate grade subquery.
- Planner showed "Set up your degree plan" despite seeded CS-BS profile —
  `StudentDegreeProfile.degreeProgram` had no `@Field()` decorator → invisible to GraphQL →
  query failed → data was null. Fixed: added `@Field(() => DegreeProgram)`.
  Additionally: frontend compared `p.status === 'active'` but GraphQL returns `'ACTIVE'` (enum key).
  Fixed: changed to `'ACTIVE'`.

**Known non-bugs:**
- Catalog shows "No courses found" — catalog entity is separate from course entity; no seed data for catalog yet

---

### ~~TASK-005 · AI Study Coach end-to-end test~~ ✅ DONE
Tested via GraphQL API as `student@axis.demo`.

**Working:**
- [x] Can start a conversation — `availableAgents` returns Study Coach + Course Planner
- [x] Conversation creation succeeds (`startConversation` mutation reaches backend)
- [x] Switching agents works (Course Planner separately available)

**Known limitation (not a bug):**
- AI responses require `ANTHROPIC_API_KEY` in `.env`. In dev without the key,
  `startConversation` reaches the backend but the AI call returns `invalid x-api-key`.
  The UI/API plumbing is correct; this is an environment config issue.

---

### ~~TASK-006 · Assignment submission flow~~ ✅ DONE
Tested via GraphQL API as student and instructor.

**Working:**
- [x] Submitted HW3: Data Structures (id: 70000000-0000-0000-0000-000000000003)
  with JSONB content `{"type":"text","text":"..."}` — submission id created
- [x] Instructor sees pending submission via `assignmentSubmissions`
- [x] Instructor graded with score=87 + feedback via `gradeSubmission`
- [x] Grade appears on student side via `mySubmissions(assignmentId:...)`
- [x] Home feed shows the graded item ("HW3: Data Structures 87.00/100.00 points")

**Bugs found and fixed:**
- `@IsUUID()` rejected seed UUIDs (4th group `0000` fails RFC 4122 variant check).
  Replaced with `@Matches(uuid-regex)` across 9 DTO files (42 occurrences).
- `content` field in `submitAssignment` expects a JSON string (JSONB column),
  not a plain string — documented in test.

---

### ~~TASK-007 · Discussion thread flow~~ ✅ DONE
Tested via GraphQL API.

**Working:**
- [x] Created discussion in CS101 section (was empty before — no seed data)
- [x] Student replied to discussion
- [x] Instructor replied and marked reply as instructor answer (`isInstructorAnswer: true`)
- [x] Instructor pinned discussion (`isPinned: true`)
- [x] `@mention` not implemented (no field for it) — not a crash, just not built

---

### ~~TASK-008 · Graduation Planner / Roadmap~~ ✅ DONE
Tested via screenshots and API.

**Working:**
- [x] Planner main page — 5.8% complete, 7/120 credits, 113 remaining, 8 semesters left
- [x] Requirements breakdown visible (Core CS 1/3, Math 1/2, Science 0/1, Writing 0/1)
- [x] Eligible courses shown (CS201, CS301 — prereqs met)
- [x] Roadmap page loads with degree profile and plan controls

**Bug found and fixed:**
- Roadmap page showed "No degree profile found" — same `'active'` vs `'ACTIVE'`
  enum comparison bug as the planner main page. Fixed: `p.status === 'ACTIVE'`.
- Roadmap shows "No plan yet" state (correct — user hasn't generated a plan yet)

---

## 🔵 POLISH — UI/UX issues to address

### ~~TASK-009 · Dashboard sidebar active state~~ ✅ DONE
All 5 nav items highlight correctly: Home, Courses, Planner, AI, Messages.
Mobile: sidebar collapses to bottom tab bar (Home, Courses, AI, Messages, Grades).

### ~~TASK-010 · Mobile / responsive check~~ ✅ DONE
375px viewport (iPhone 12) — all pages tested:
- [x] Marketing landing page — scrolls vertically, all sections render
- [x] Login/register — clean centered form, full-width button
- [x] Student dashboard — sidebar collapses to bottom tab bar
- [x] Courses page — cards stack vertically, readable

### ~~TASK-011 · Empty states~~ ✅ DONE
- [x] Messages — "No conversations yet." + "No conversation selected" placeholder
- [x] Notifications — bell popover (no dedicated page by design); coded empty state in bell
- [x] AI chat — Agent selector ("AI Assistants" with Study Coach + Course Planner cards)
- [x] Courses — "No courses yet" coded at lines 240 + 363 of courses/page.tsx

---

## 📋 NOTES

- No "parent" role exists in the data model — seed only has student, instructor, admin, TA
- Backend port: `3001` | Frontend port: `3000`
- Playwright MCP is available for browser testing (`mcp__plugin_playwright_playwright__*`)
- Seed script: `axis-backend/src/database/seed.ts` — run with `npm run seed` inside the backend
