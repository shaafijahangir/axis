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

### TASK-002 · Student dashboard deep dive
Log in as `student@nexused.demo`. Test:
- [ ] Home/feed page loads with AI-prioritized items
- [ ] Courses list shows enrolled courses (CS101, MATH201, ENG102, PHYS150)
- [ ] Course detail page loads with timeline/content
- [ ] Assignment detail page loads
- [ ] Grades page shows submission scores
- [ ] Planner / Graduation roadmap loads
- [ ] AI Chat (Study Coach) sends and receives a message

Note any crashes, blank pages, or missing data.

---

### TASK-003 · Instructor dashboard deep dive
Log in as `prof.chen@nexused.demo`. Test:
- [ ] Instructor home loads
- [ ] Courses list shows sections (CS101, ENG102)
- [ ] Course section detail loads
- [ ] Gradebook loads with student submissions
- [ ] Can view a submission and its feedback
- [ ] Announcement creation flow works
- [ ] Discussion creation/management works

Note any crashes, blank pages, or missing data.

---

### TASK-004 · Admin dashboard deep dive
Log in as `admin@nexused.demo`. Test:
- [ ] Admin home loads
- [ ] People management page loads
- [ ] AI Governance console loads and shows config
- [ ] Analytics page loads
- [ ] Catalog management page loads
- [ ] Integrations / LTI page loads

Note any crashes, blank pages, or missing data.

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
