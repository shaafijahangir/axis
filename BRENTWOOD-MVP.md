# Axis — Brentwood College School MVP

> This document is a sales-facing feature map and gap analysis for the Brentwood College School demo.
> Brentwood currently runs MySchool (Chinese SIS software). Our goal is to show a credible, privacy-first,
> AI-native alternative that can replace it for day-to-day school operations.

---

## Selling Points to Brentwood

### 1. Admin Control — Student Records, Classes, and User Management

Full administrative control over every user type in the school. Admins can create and manage student
profiles, teacher accounts, and parent accounts from a single panel. Class records (courses, sections,
and terms) are also admin-managed. Every record is tenant-isolated — Brentwood's data never touches
another school's data.

**What this means for Brentwood:** Replace MySchool's admin module with a modern, English-language
interface that your IT staff and admin team can actually navigate without a translation layer.

---

### 2. Teacher Class Management

Teachers can create courses, manage class sections, post content, create and grade assignments, and
view their full roster. The instructor experience is purpose-built: create a course, attach a section
for each period/block, enroll students, and start posting content on day one.

**What this means for Brentwood:** Teachers spend less time in admin systems and more time teaching.
Assignments, grading, content, and rosters are all in one place.

---

### 3. Student Schedule Page

Students see every course they are enrolled in — including the instructor name and course code — in
one view. Built with a mobile-first design so students can check it from their phones between classes.

**What this means for Brentwood:** Students always know what they are enrolled in and who their
teacher is. No more "what class am I in?" questions to the office.

---

### 4. School-Wide and Targeted Announcements

Teachers and admins can post announcements scoped to individual classes. Students in that class see
the announcement immediately on their feed when they log in.

**What this means for Brentwood:** Class-level communication is built in. No emailing distribution
lists, no paper notices.

---

### 5. Google Calendar Sync for Teachers

Teachers can connect their Axis class schedule to their personal or work Google Calendar. Every
class block, deadline, and event syncs automatically so teachers manage their schedule in one place.

**What this means for Brentwood:** Teachers already live in Google Calendar. Axis meets them there
instead of asking them to check yet another system.

---

### 6. Painless Migration from MySchool

Axis ships with a structured CSV import pipeline. Admins export data from MySchool, map it to
Axis's CSV templates, and import in minutes — with built-in row-level validation that catches
errors before any data is written. The process is idempotent: re-import the same file after
corrections and it updates rather than duplicating.

**What this means for Brentwood:** Switching costs are minimised. You do not lose your historical
data. The migration can be tested in a staging environment before going live.

---

## Gap Analysis — What Exists vs. What Is Missing

### Feature 1 — Admin User Management

| Capability | Status | Notes |
|---|---|---|
| Create student / teacher / parent accounts | **EXISTS** | `create-user-dialog.tsx` + admin users resolver |
| Edit and deactivate users | **EXISTS** | `edit-user-dialog.tsx`, `deactivate-user-dialog.tsx` |
| Role assignment (STUDENT, INSTRUCTOR, PARENT, ADMIN) | **EXISTS** | Multi-role PostgreSQL enum on user entity |
| Create / edit course records | **EXISTS** | `courses-table.tsx`, `edit-course-dialog.tsx` |
| Create / edit sections and terms | **EXISTS** | `sections-table.tsx`, `terms-table.tsx` |
| Manage enrollments | **EXISTS** | `enrollments-table.tsx`, `bulk-enroll-dialog.tsx` |
| K-12 student record fields (grade level, homeroom, guardian links) | **MISSING** | User entity has general profile JSONB but no K-12-specific fields |

**Gap to close:** Add K-12-specific fields to the user profile (grade level, homeroom teacher,
emergency contacts, guardian relationships). This is a backend entity change + a frontend form
update — roughly 1 day of work.

---

### Feature 2 — Teacher Class Management

| Capability | Status | Notes |
|---|---|---|
| Create courses | **EXISTS** | `courses/new` page, courses resolver |
| Create sections and assign instructor | **EXISTS** | Admin and instructor flows |
| View and manage roster | **EXISTS** | `/courses/[id]/section/[sectionId]/roster` page |
| Post content and assignments | **EXISTS** | Content, discussions, assignment modules |
| Gradebook | **EXISTS** | `/courses/[id]/section/[sectionId]/gradebook` page |

**Verdict:** Feature 2 is fully covered. No gaps for the MVP demo.

---

### Feature 3 — Student Schedule Page

| Capability | Status | Notes |
|---|---|---|
| List of enrolled courses with instructor name | **EXISTS** | `/courses` page, `MY_ENROLLMENTS_QUERY` |
| Visual weekly schedule (time grid, days, blocks) | **MISSING** | Current view is a flat list/table, no time-slot grid |
| Room / location information per class | **MISSING** | No `room` or `location` field on sections |
| Class times (start time, end time, days of week) | **MISSING** | No schedule fields on the `section` entity |

**Gap to close:** This is the most impactful missing feature for a school demo.
- Backend: Add `meetingDays`, `startTime`, `endTime`, `room` fields to the `CourseSection` entity
- Frontend: Build a `/schedule` page rendering a university-style weekly timetable grid (Mon–Fri
  columns, hourly rows, coloured blocks per course)
- Estimated effort: 2–3 days

---

### Feature 4 — Announcements (School-Wide and Per-Grade)

| Capability | Status | Notes |
|---|---|---|
| Announcements scoped to a class/section | **EXISTS** | `AnnouncementsService` + resolver, feed integration |
| School-wide announcements (all students) | **MISSING** | No `scope: 'school'` concept in the announcement entity |
| Grade-level announcements (e.g., "All Grade 11s") | **MISSING** | No grade-level targeting |

**Gap to close:** Extend the `Announcement` entity with a `scope` enum
(`section | grade | school_wide`) and an optional `targetGrade` field. Update the
`AnnouncementsService` to fan-out to the right recipients and surface school-wide/grade
announcements in the student feed. Estimated effort: 1.5–2 days.

---

### Feature 5 — Google Calendar Sync

| Capability | Status | Notes |
|---|---|---|
| Google Calendar OAuth connection | **MISSING** | Not built |
| Sync class schedule to Google Calendar | **MISSING** | Not built |
| Sync assignment due dates to Google Calendar | **MISSING** | Not built |

**Gap to close:** This requires OAuth 2.0 integration with Google Calendar API.
Implementation plan:
1. **Backend**: Add a `GoogleCalendarModule` with OAuth token storage per user. Use the Google
   Calendar API (`googleapis` npm package) to create/update/delete events. Store the refresh token
   encrypted in the user's profile JSONB.
2. **Settings page**: Add a "Connect Google Calendar" button using Google OAuth popup flow.
   Show connected status and a "Disconnect" option.
3. **Sync trigger**: On enrollment or section schedule change, push a calendar event. On
   assignment creation, create a due-date event.
4. Estimated effort: 3–4 days

---

### Feature 6 — Data Import from MySchool

| Capability | Status | Notes |
|---|---|---|
| CSV import for courses and catalog | **EXISTS** | `CsvImportService` with full RFC-4180 parser, upsert semantics, validation |
| CSV import for degree programs and requirements | **EXISTS** | Same service, full flow |
| CSV import for student and teacher user records | **MISSING** | No user import pipeline |
| CSV import for enrollments | **MISSING** | No enrollment import pipeline |
| MySchool-specific field mapping documentation | **MISSING** | No MySchool → Axis mapping guide |

**Gap to close:** Extend `CsvImportService` with two new import types:
- `importUsers(csvData)` — creates or updates user accounts (email, role, first/last name,
  grade level) with upsert-by-email semantics
- `importEnrollments(csvData)` — maps student email + section code → creates enrollment records
Add both to the admin import wizard (already exists at `/admin/catalog/import`).
Provide a MySchool export → Axis CSV mapping guide as a downloadable PDF for Brentwood's admin team.
Estimated effort: 2 days

---

## Summary — What to Build Before the Demo

| # | Feature | Status | Priority | Effort |
|---|---|---|---|---|
| 1 | Admin user management | Exists (minor K-12 fields missing) | Low | 1 day |
| 2 | Teacher class management | **Fully exists** | — | — |
| 3 | Student schedule page (visual timetable) | Missing core UI + data model | **Critical** | 2–3 days |
| 4 | School-wide / per-grade announcements | Partial (class-only today) | High | 1.5–2 days |
| 5 | Google Calendar sync | Not built | High | 3–4 days |
| 6 | User + enrollment CSV import | Partial (catalog only today) | High | 2 days |

**Total estimated effort to demo-ready: 10–12 days of focused engineering.**

The two highest-impact items for the live demo are:
- **Feature 3 (Schedule)** — This is the first thing any student or teacher will ask to see.
  A visual timetable is table stakes for any school software.
- **Feature 5 (Google Calendar)** — This is the "wow" moment in a demo. Most school staff
  live in Google Workspace. Showing that Axis pushes directly into their existing calendar
  closes the "yet another system" objection on the spot.

---

## Implementation Order (Recommended)

1. **Sprint 1 (Days 1–3):** Student schedule page — backend schema + frontend timetable grid
2. **Sprint 2 (Days 4–5):** School-wide / per-grade announcements
3. **Sprint 3 (Days 6–7):** User + enrollment CSV import (extend existing import wizard)
4. **Sprint 4 (Days 8–11):** Google Calendar OAuth + sync
5. **Sprint 5 (Day 12):** K-12 student record fields (grade level, homeroom, guardian)

This order prioritises what Brentwood will actually interact with during the demo walkthrough,
front-loads the visually impressive work, and leaves the back-office plumbing for last.
