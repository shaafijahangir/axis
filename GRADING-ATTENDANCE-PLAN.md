# Grading, Attendance & Report Cards — Implementation Plan

## Reality Check (what already exists)

| Thing | Status | Notes |
|---|---|---|
| `getSectionGradebook()` backend | ✅ done | Calculates totals, averages, best-submission selection |
| `gradeSubmission` mutation | ✅ done | Backend + frontend mutation defined |
| Gradebook read-only view | ✅ done | `/courses/[id]/section/[sectionId]/gradebook` |
| Student `/grades` page | ✅ done | `GradesSummary` component, `MY_GRADES_QUERY` |
| `myGrades` resolver | ❓ verify | Query defined in frontend but resolver may be missing |
| Attendance | ❌ zero | No entity, no service, no UI |
| Report cards | ❌ zero | No entity, no service, no UI |

---

## Feature 1 — Inline Grade Entry in Gradebook

**Problem:** Gradebook shows scores (read-only). Teacher can't click a cell and type a grade.
**Problem 2:** `gradeSubmission` requires a `submissionId` — can't grade if student never submitted.

**Solution:** Add `overrideGrade` mutation (teacher-facing). Creates a stub submission if none exists, then grades it. This matches how every real gradebook works (teacher can always enter a grade).

### Backend changes
- `assignments.service.ts` — add `overrideGrade(graderId, tenantId, input: OverrideGradeInput)`
- `assignments.resolver.ts` — expose `overrideGrade` mutation (INSTRUCTOR/ADMIN)
- `dto/assignment.types.ts` — add `OverrideGradeInput { sectionId, studentId, assignmentId, score, feedback? }`

### Frontend changes
- `section-gradebook.tsx` — cells become click-to-edit: click → `<input>` → blur/Enter → call `OVERRIDE_GRADE_MUTATION` → refetch

---

## Feature 2 — Attendance

### Data model
```
attendance table
  id          UUID PK
  sectionId   UUID FK course_sections
  userId      UUID FK users (the student)
  date        DATE (the class date, no time)
  status      enum: PRESENT | ABSENT | LATE | EXCUSED
  notes       varchar(255) nullable
  tenantId    UUID
  UNIQUE (sectionId, userId, date)
  INDEX (tenantId)
  INDEX (sectionId, date)
  INDEX (userId, tenantId)
```

### Backend
- `axis-backend/src/database/entities/attendance.entity.ts`
- `axis-backend/src/modules/attendance/attendance.service.ts`
  - `markAttendance(tenantId, sectionId, date, records[])` — upsert bulk
  - `getSectionAttendance(sectionId, date, tenantId)` — roster for a date
  - `getStudentAttendanceSummary(userId, sectionId, tenantId)` — total/present/absent/late
  - `getSectionAttendanceSummary(sectionId, tenantId)` — per-student summaries for report cards
- `axis-backend/src/modules/attendance/attendance.resolver.ts`
- `axis-backend/src/modules/attendance/attendance.module.ts`
- `axis-backend/src/modules/attendance/dto/attendance.types.ts`

### Frontend
**Teacher:** `/courses/[id]/section/[sectionId]/attendance`
- Date picker (default today)
- Roster: one row per student, status button group (P / A / L / E)
- "Save" → bulk upsert, toast confirmation
- Toggle to "history view" — table of dates × students

**Student:** attendance summary section on `/grades` page (below each course card)
- "Classes attended: 14/16 (87.5%)" with breakdown

---

## Feature 3 — Student Grades Page (verify + wire up)

- Verify `myGrades` resolver exists in `assignments.resolver.ts`
- If missing: add resolver method that calls a new `getStudentGrades(userId, tenantId)` service method
- `getStudentGrades`: for each active enrollment, find all assignments and the student's best submission

**Expected output:** What `/grades/page.tsx` already renders — it just needs the resolver.

---

## Feature 4 — Report Cards

### Data model
```
report_cards table
  id               UUID PK
  studentId        UUID FK users
  sectionId        UUID FK course_sections
  termId           UUID FK academic_terms
  tenantId         UUID
  status           enum: DRAFT | PUBLISHED
  teacherComment   text nullable
  finalGrade       varchar(2) nullable  (letter grade A/B+/C etc.)
  gradeSummary     JSONB  (snapshot: totalEarned, totalPossible, percentage, assignments[])
  attendanceSummary JSONB (snapshot: total, present, absent, late, excused)
  publishedAt      timestamp nullable
  UNIQUE (studentId, sectionId, termId)
  INDEX (tenantId)
  INDEX (sectionId, status)
  INDEX (studentId, tenantId)
```

### Backend
- `axis-backend/src/database/entities/report-card.entity.ts`
- `axis-backend/src/modules/report-cards/report-cards.service.ts`
  - `generateForSection(sectionId, tenantId)` — creates DRAFT cards for all active students, snapshots grades + attendance
  - `updateComment(id, tenantId, comment, finalGrade?)` — teacher edits
  - `publishSection(sectionId, tenantId)` — bulk DRAFT → PUBLISHED + sets publishedAt
  - `myReportCards(userId, tenantId)` — student: all PUBLISHED cards
  - `sectionReportCards(sectionId, tenantId)` — instructor: all cards for a section
- `axis-backend/src/modules/report-cards/report-cards.resolver.ts`
- `axis-backend/src/modules/report-cards/report-cards.module.ts`
- `axis-backend/src/modules/report-cards/dto/report-card.types.ts`

### Frontend
**Teacher:** `/courses/[id]/section/[sectionId]/report-cards`
- "Generate Report Cards" button (if none exist for this term)
- Table: student | grade% | final grade (editable) | comment (editable textarea) | status badge | publish toggle
- "Publish All" button at top

**Student:** `/report-cards` page
- Card per section: course name, term, grade%, letter grade, teacher comment, attendance %
- Print-friendly layout

---

## Build Order

1. **Feature 3** — verify myGrades resolver (10 min, unblocks student testing)
2. **Feature 1** — inline grade entry in gradebook (1-2 hrs)
3. **Feature 2** — attendance full stack (3-4 hrs)
4. **Feature 4** — report cards full stack (2-3 hrs, depends on attendance for summaries)

---

## Files to create (new)

```
axis-backend/src/database/entities/attendance.entity.ts
axis-backend/src/database/entities/report-card.entity.ts
axis-backend/src/modules/attendance/
  attendance.module.ts
  attendance.service.ts
  attendance.resolver.ts
  dto/attendance.types.ts
axis-backend/src/modules/report-cards/
  report-cards.module.ts
  report-cards.service.ts
  report-cards.resolver.ts
  dto/report-card.types.ts
axis-frontend/src/app/(dashboard)/courses/[id]/section/[sectionId]/attendance/page.tsx
axis-frontend/src/app/(dashboard)/report-cards/page.tsx
axis-frontend/src/lib/graphql/mutations/attendance.ts
axis-frontend/src/lib/graphql/mutations/report-cards.ts
axis-frontend/src/lib/graphql/queries/attendance.ts
axis-frontend/src/lib/graphql/queries/report-cards.ts
```

## Files to modify

```
axis-backend/src/modules/assignments/assignments.service.ts  (add overrideGrade, getStudentGrades)
axis-backend/src/modules/assignments/assignments.resolver.ts  (add overrideGrade mutation, myGrades query)
axis-backend/src/modules/assignments/dto/assignment.types.ts  (add OverrideGradeInput, StudentGrades types)
axis-backend/src/app.module.ts  (register AttendanceModule, ReportCardsModule)
axis-frontend/src/components/courses/section-gradebook.tsx  (add inline editing)
axis-frontend/src/components/courses/grades-summary.tsx  (add attendance row)
axis-frontend/src/app/(dashboard)/grades/page.tsx  (include attendance data)
axis-frontend/src/lib/navigation.ts  (add Report Cards nav item for students)
axis-frontend/src/lib/graphql/mutations/assignments.ts  (add OVERRIDE_GRADE_MUTATION)
```
