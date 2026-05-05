# TO-WORK-ON.md
> One task per Claude session. Pick the top item, complete it, strike it out.

---

## ~~🔴 BLOCKING — Backend won't start~~

### ~~TASK-001 · Fix TypeORM entity startup crash~~ ✅ DONE
All four entity union-type crashes fixed: `file-upload`, `assignment`, `discussion-reply`, `device-token`.

---

## 🟡 FUNCTIONAL — App features to test & fix

> These require the backend running. Seed credentials: all passwords are `password123`.
> - Student:    `student@nexused.demo`
> - Instructor: `prof.chen@nexused.demo`
> - Admin:      `admin@nexused.demo`
> - TA:         `ta.jordan@nexused.demo`

---

### ~~TASK-002 · Student dashboard deep dive~~ ✅ DONE
Tested via GraphQL API as `student@nexused.demo` (Alex Rivera).

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
Tested visually via screenshots as `prof.chen@nexused.demo` (Sarah Chen).

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
Tested visually via screenshots as `admin@nexused.demo` (Marcus Williams).

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

### TASK-005 · AI Study Coach end-to-end test
Log in as student. Go to AI Chat. Test:
- [ ] Can start a conversation
- [ ] Study Coach responds with context about the student's courses
- [ ] Multi-turn conversation works (follow-up questions)
- [ ] Tool use is visible (if governance allows): course lookup, assignment status
- [ ] Switching agents (Study Coach → Feedback Copilot) works if implemented
- [ ] Usage is logged (check admin AI governance page after)

---

### TASK-006 · Assignment submission flow
Log in as student. Test submitting an assignment:
- [ ] Navigate to an unsubmitted assignment (e.g. CS101 HW3: Data Structures, due in ~10 days)
- [ ] Submission form loads
- [ ] Can type/submit content
- [ ] Submission appears in gradebook as pending

Then log in as instructor and:
- [ ] See the pending submission in gradebook
- [ ] Grade it with score + feedback
- [ ] Verify grade appears on student side

---

### TASK-007 · Discussion thread flow
Log in as student. Test:
- [ ] Discussions visible in course timeline
- [ ] Can create a new discussion post
- [ ] Can reply to an existing thread
- [ ] @mention works (or at least doesn't crash)

Then log in as instructor:
- [ ] Can mark a reply as "instructor answer"
- [ ] Can pin/unpin a discussion

---

### TASK-008 · Graduation Planner / Roadmap
Log in as student. Navigate to Planner → Roadmap:
- [ ] Page loads (student has a CS-BS degree profile seeded)
- [ ] Completed courses shown (MATH101, CS101 from Fall 2025)
- [ ] In-progress courses shown (CS101, MATH201, ENG102, PHYS150)
- [ ] Remaining requirements visible
- [ ] Semester-by-semester plan renders

---

## 🔵 POLISH — UI/UX issues to address

### TASK-009 · Dashboard sidebar active state
Verify the sidebar highlights the correct nav item based on the current route. Check: Home, Courses, Planner, AI Chat, Messages.

### TASK-010 · Mobile / responsive check
At 375px viewport (iPhone size) check:
- [ ] Marketing landing page
- [ ] Login/register pages
- [ ] Student dashboard (sidebar collapses?)
- [ ] Course page

### TASK-011 · Empty states
Check pages that should show empty states when data is missing:
- [ ] Courses page with no enrollments
- [ ] Messages page (no messages seeded)
- [ ] Notifications page
- [ ] AI chat before first message

---

## 📋 NOTES

- No "parent" role exists in the data model — seed only has student, instructor, admin, TA
- Backend port: `3001` | Frontend port: `3000`
- Playwright MCP is available for browser testing (`mcp__plugin_playwright_playwright__*`)
- Seed script: `nexused-backend/src/database/seed.ts` — run with `npm run seed` inside the backend
