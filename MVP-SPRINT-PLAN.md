# Axis MVP — Comprehensive Sprint Plan

> **Purpose:** This is the authoritative implementation plan for getting Axis to a sellable MVP state, with Brentwood College School as the first design partner. It supersedes `BRENTWOOD-MVP.md` (stale — see "Reality Check") and the partial `SPRINT-PLAN.md`.
>
> **Audience:** Yourself, in the next implementation session. Each sprint is a self-contained brief with goal, scope, data model, implementation steps, test criteria, and Definition of Done.
>
> **Source of truth date:** 2026-05-19. Drafted from a fresh code-state audit.

---

## Reality Check — What's Actually Built

`BRENTWOOD-MVP.md` reports several features as "missing" that are actually built. **Do not rebuild these.**

| Claimed Missing | Actual Status | Evidence |
|---|---|---|
| Visual schedule timetable grid | **EXISTS** — 30-min slots, day columns, colour blocks, 7am–6pm | `axis-frontend/src/app/(dashboard)/schedule/page.tsx` |
| School-wide announcements | **EXISTS** (backend) — `AnnouncementScope.SCHOOL_WIDE` enum + `targetGrade` column | `announcement.entity.ts:42-51`, `announcements.service.ts:65-80` |
| Grade-level announcements | **EXISTS** (backend) | `AnnouncementScope.GRADE` branch in feed query |
| User CSV import | **EXISTS** | `csv-import.service.ts:679 importUsers()` |
| Enrollment CSV import | **EXISTS** | `csv-import.service.ts:834 importEnrollments()` |
| R2 file upload infra | **EXISTS** | `axis-backend/src/modules/uploads/*` |
| Parent portal | **EXISTS** — built last session | `axis-backend/src/modules/parent/*`, `/parent` route |
| Attendance tracking | **EXISTS** | `axis-backend/src/modules/attendance/*` |
| Gradebook | **EXISTS** | `/courses/[id]/section/[sectionId]/gradebook` |

**Actual MVP gaps:**

1. Section schedule is unstructured JSONB with no admin UI to enter it
2. Assignment submissions cannot attach files (R2 module exists but unwired)
3. K-12 user fields (grade level, homeroom, guardian relations) don't exist
4. Admin composer UI for school-wide / grade-level announcements not exposed (backend ready)
5. Admin UI for user/enrollment CSV import not exposed (backend ready)
6. Google Calendar OAuth not built
7. `synchronize: true` still on — no migrations — blocks production deploy
8. No seed script for a credible demo dataset

Sprints 1–8 close every one of these.

---

## Sprint Methodology

Every sprint follows the same discipline. Memorise this before you start coding.

### 1. Branch & Commit
- New branch per sprint: `feat/sprint-N-<slug>` (e.g. `feat/sprint-1-schedule-data-model`)
- Conventional commits with scope and ID: `feat(backend): add structured schedule columns (SPRINT-1)`
- Squash-merge on close, delete branch, pull main, move on
- One sprint = one PR. Don't bundle.

### 2. Build Order Inside a Sprint
Always in this order — backend before frontend prevents wasted UI churn:
1. Data model — entity changes, migration (or dev schema sync), indexes
2. Service layer — business logic, tenant scoping, transactions
3. Resolver/Controller — GraphQL/REST surface, guards, role checks
4. GraphQL queries/mutations on frontend
5. UI components — start with the dumb component, then wire to Apollo
6. Smoke test — manual click-through with a fresh DB
7. Edge case tests — empty state, error state, permission denial
8. Type checks pass in both projects
9. Lint passes in both projects
10. Update `BACKLOG.md` and `.claude/session-log.md`

### 3. Non-Negotiable Best Practices
- Every tenant entity: `tenantId` column + `@Index` + extend `TenantScopedEntity`
- Every query on tenant data: `tenantId` in WHERE
- Every multi-step write: wrap in `DataSource.manager.transaction()`
- Every resolver: `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`
- Resource-level authorization: not just "is instructor" but "is instructor *of this section*"
- Every form: `react-hook-form` + `zod` schema — no chains of `useState`
- Every catch: typed narrowing with `err instanceof Error` — never `catch (err: any)`
- Every async UI: skeleton + empty + error state — three branches always
- Every new GraphQL operation: defined in `src/lib/graphql/queries/*` or `mutations/*` — not inline
- Every list query that could grow unbounded: paginate or limit

### 4. Sprint Test Criteria Template
Each sprint specifies tests in three buckets:
- **Smoke** — five-minute manual click-through proving the happy path renders
- **Edge cases** — explicitly enumerated empty/error/permission states
- **Regression risk** — what else could break, and how to spot it

If you cannot articulate all three, the sprint is not done.

---

## Sprint 1 — Structured Schedule Data Model + Admin UI

### Goal
Replace the schedule JSONB blob with typed columns and add admin/instructor forms to set them. The visual grid already renders — this sprint makes the data *enterable*.

### Why It Matters
The schedule grid at `/schedule` reads from a `schedule: jsonb` column on `course_sections`. Nothing in the UI writes that column. Without an editor, admins must craft JSON manually. No school accepts that. The blocking item is the editor, not the grid.

### Current State
- `CourseSection.schedule` is `jsonb` with a transformer that JSON-stringifies for GraphQL
- Frontend expects `{ meetingDays: string[], startTime: "HH:MM", endTime: "HH:MM" }`
- No form exists to write these values

### Scope
**In:**
- Replace JSONB with three typed columns: `meetingDays text[]`, `startTime time`, `endTime time`
- Add `room varchar` (currently `location` is overloaded)
- Migration that backfills existing rows from the old JSONB
- `EditSectionDialog` extension with day-of-week checkboxes + time pickers
- Instructor `CreateSectionDialog` extension (course detail page)
- GraphQL schema updates so the frontend reads the new fields
- Refactor `/schedule` page to consume typed fields directly (remove JSON.parse path)

**Out:**
- Multi-block sections (e.g. "MWF 9am, TR 11am") — current data model is one window per section
- Recurring exceptions (holidays, snow days)
- Term-level start/end date enforcement (already on `AcademicTerm`)

### Data Model
```typescript
// course-section.entity.ts
@Column({ type: 'text', array: true, default: [] })
@Field(() => [String])
meetingDays: string[];                       // ['MON', 'WED', 'FRI']

@Column({ type: 'time', nullable: true })
@Field({ nullable: true })
startTime: string | null;                    // '09:00'

@Column({ type: 'time', nullable: true })
@Field({ nullable: true })
endTime: string | null;                      // '10:30'

@Column({ type: 'varchar', length: 64, nullable: true })
@Field({ nullable: true })
room: string | null;                         // 'Room 204', 'Online'

// Keep schedule jsonb for one release as fallback; drop in Sprint 7
```

New composite index:
```typescript
@Index(['termId', 'instructorId'])
```

### Backend Steps
1. Add the four new columns to `CourseSection`
2. Migration that reads existing `schedule` JSONB rows and backfills the typed columns
3. Update `CreateSectionInput` / `UpdateSectionInput` DTOs with validators:
   - `@IsArray() @ArrayUnique() meetingDays`
   - `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime?: string`
4. Update `CoursesService.createSection()` and `updateSection()` for the new fields
5. Cross-field validation in service: `endTime > startTime`, `meetingDays.length > 0` when any time set
6. Keep `schedule` JSONB readable for one release; new writes go to typed columns

### Frontend Steps
1. zod schema `scheduleSchema` covering `meetingDays`, `startTime`, `endTime`, `room`
2. Shared `<ScheduleFields>` component — day checkboxes (Mon–Fri), two `<input type="time">`, room text input
3. Wire into admin `create-section-dialog.tsx` and `edit-section-dialog.tsx`
4. Wire into instructor `CreateSectionDialog` at `/courses/[id]/page.tsx`
5. Update section GraphQL queries to fetch new fields
6. Refactor `/schedule` page: read typed fields, delete JSON.parse `buildBlocks` branch

### Best Practices
- HTML5 `<input type="time">` — works everywhere, mobile-friendly, no extra dep
- Normalize time format (`9:00` → `09:00`) before validation via zod `.transform()`
- Server-side cross-field validation — never trust the client
- Keep day codes as `'MON' | 'TUE' | ...` string literal type — greppable, no timezone confusion
- Index on `(termId, instructorId)` for instructor's "my schedule" query

### Edge Cases
- Section with no schedule set → render as "Time TBD" in grid, no crash
- Schedule spanning lunch (11:30–13:00) → handled by slot grid already
- Schedule outside 7am–6pm grid → show "see details" link, don't crash
- Empty `meetingDays` → grid skips that section, `/courses` list still shows it
- `endTime <= startTime` → reject with clear error
- Two sections at the same time on different days → both render in respective columns

### Manual Test Plan
1. Admin → `/admin/catalog/sections` → edit a section → set MWF 9-10:30 Room 204 → save
2. Student in that section → `/schedule` → block appears Mon/Wed/Fri 9-10:30
3. Instructor of that section → `/schedule` → block appears
4. Edit → set endTime 08:00 → expect rejection
5. Create new section with no schedule → grid skips it without error
6. Parent linked to a student → no schedule view (out of scope, verify no crash if visited)

### Automated Tests (Required)
- Unit: `createSection` rejects `endTime <= startTime`
- Unit: `createSection` requires `meetingDays.length > 0` when any time set
- Integration: GraphQL `createSection` mutation persists and reads back

### Definition of Done
- [ ] All four columns added, migration runs cleanly on fresh DB and existing data
- [ ] Both admin section dialogs + instructor section dialog accept new fields
- [ ] `/schedule` reads typed fields, JSON.parse path removed
- [ ] Backend + frontend typecheck pass
- [ ] All six manual test steps pass on a fresh DB
- [ ] Section without schedule does not crash the grid
- [ ] Branch merged, BACKLOG.md updated

### Estimated Effort
**2 days** — 0.5 backend, 1 frontend, 0.5 testing & polish

---

## Sprint 2 — Assignment File Attachments

### Goal
Students can attach files (PDF, docx, images) to submissions; teachers can download them in gradebook + SpeedGrader; teachers can attach instructions files to assignments. Wiring sprint — R2 + uploads module exist.

### Why It Matters
The single most common everyday LMS action. Essays, problem sets, lab reports — none fit in a JSON content blob. Right now `Submission.content` is JSONB-only. Hard blocker for any school sale.

### Current State
- `Submission.content: jsonb` exists
- `axis-backend/src/modules/uploads/*` — `FileUpload` entity, presigned URL service, GraphQL resolver
- Verify `FileUpload.context: UploadContext` enum has `SUBMISSION` / `ASSIGNMENT` values; if not, add them
- No frontend uploader on submission or assignment pages

### Scope
**In:**
- Add `submissionId` and `assignmentId` (nullable, indexed) to `FileUpload`
- `attachments: FileUpload[]` field on `Submission` and `Assignment` GraphQL types
- Student submission UI: drag-drop uploader + file list + remove
- Instructor gradebook / SpeedGrader: download links per attachment
- Instructor assignment editor: instructions file attachments

**Out:**
- In-browser PDF preview (defer — download is fine)
- Antivirus scanning (Sprint 7)
- Per-school MIME whitelist (hardcode allowed types)

### Data Model
```typescript
// file-upload.entity.ts — add or verify:
@Column({ type: 'uuid', nullable: true })
@Index()
@Field({ nullable: true })
submissionId: string | null;

@Column({ type: 'uuid', nullable: true })
@Index()
@Field({ nullable: true })
assignmentId: string | null;

// Confirm UploadContext has SUBMISSION and ASSIGNMENT
```

### Backend Steps
1. Read `FileUpload` entity — add/confirm `submissionId`, `assignmentId`, enum values
2. Add `attachments: [FileUpload!]!` `@ResolveField()` on `Submission` GraphQL type using a `FileUploadLoader` (DataLoader)
3. Same on `Assignment` type
4. Submission flow: client uploads via existing presigned URL → gets `fileUploadId` → calls `createSubmission`/`updateSubmission` with `fileUploadIds: string[]` → service links inside a transaction
5. Authorization on download: requesting user must be submission owner OR instructor of the section OR admin in the tenant
6. Update `CreateSubmissionInput` / `UpdateSubmissionInput` with `fileUploadIds?: string[]`

### Frontend Steps
1. `<FileAttachmentUploader>` component using the existing presigned-URL flow (build `useUpload` hook if not present)
2. Drag-drop zone via `react-dropzone` (add as dep if not present)
3. File list with name, size, remove
4. Wire into student submission page (`/courses/[id]/section/[sectionId]/assignments/[assignmentId]`)
5. SpeedGrader + gradebook submission detail: download buttons → `signedDownloadUrl(fileUploadId)` query
6. Instructor assignment create/edit: same uploader for `assignmentInstructions`

### Best Practices
- Presigned URLs, never proxy — content flows direct between browser and R2
- Two-phase upload: 1) request signed URL, 2) PUT to R2, 3) confirm via mutation that creates `FileUpload` row
- Soft delete on resubmission attachments — mark `archivedAt`, never hard-delete
- MIME re-check server-side on the confirm mutation — clients can lie
- Size limit enforced in signed-URL request: 25MB submissions, 50MB instructions
- Generated UUID storage keys, original filename for display
- DataLoader on attachments resolver — without it, a list of 30 submissions = 30 queries

### Edge Cases
- Upload then nav away before submit → orphan row. Sprint 7 cleanup cron handles it.
- Submit with no attachments → still valid, `attachments: []`
- Resubmission → previous attempt's attachments stay linked to that attempt
- Instructor attaches instructions, removes them, edits assignment → unlink not delete (audit trail)
- R2 PUT succeeds, confirm mutation fails → orphan cleanup
- Two students upload identical filenames → UUID keys, no collision
- Download by user who lost access (unenrolled) → 403

### Manual Test Plan
1. Instructor creates assignment → attach instructions PDF → save
2. Student in section → open assignment → see PDF, download, file opens
3. Student creates submission → drag .docx → see file with size → submit
4. Student returns → file still there
5. Student resubmits with different file → previous attempt's file still in gradebook history
6. Instructor → SpeedGrader/gradebook → see submission → download file
7. Upload 100MB file → reject with size error
8. Upload .exe → reject with MIME error
9. Submit with no file → works

### Automated Tests (Required)
- Unit: `confirmUpload` rejects oversized files
- Unit: `signedUrl` only returns to authorized users
- Integration: full upload → confirm → download flow against mocked S3
- Integration: `Submission.attachments` returns only current attempt's files

### Definition of Done
- [ ] Students attach 0..N files to submissions
- [ ] Instructors attach 0..N files to assignments
- [ ] Files download via signed URL (no API proxy)
- [ ] Metadata preserved (size, MIME, original filename)
- [ ] Resubmission preserves history
- [ ] All nine manual cases pass
- [ ] DataLoader prevents N+1
- [ ] Backend + frontend typecheck pass

### Estimated Effort
**2.5 days** — 1 backend (wiring + DataLoader), 1.5 frontend (uploader + UI states + integration)

---

## Sprint 3 — K-12 Student Record Fields

### Goal
Add K-12 identity fields (grade level, homeroom, guardian relationship) so the admin people directory looks like a real school SIS.

### Why It Matters
Brentwood students each have a grade level (8–12), a homeroom teacher, a guardian network. Without these fields, admins can't filter or report on basics, and grade-level announcements have nothing to target.

### Current State
- `User.profile` JSONB exists, no typed K-12 fields
- `Announcement.targetGrade: int` exists but no `User.gradeLevel` to filter against
- `ParentStudent` link table exists (last session) but no relationship type

### Scope
**In:**
- `gradeLevel: int` nullable on `User`
- `homeroomTeacherId: uuid` nullable on `User`, FK to User
- `relationship: enum` on `ParentStudent`: PARENT, GUARDIAN, OTHER
- Admin user form: grade level dropdown + homeroom picker (shown only when STUDENT role)
- Parent link dialog: relationship dropdown
- Users table filter by grade level
- Grade-level announcement composer targets `User.gradeLevel`

**Out:**
- Multiple guardians per student with different access tiers (v2)
- Sibling linking (v2)
- Per-tenant custom fields (v2)

### Data Model
```typescript
// user.entity.ts
@Column({ type: 'int', nullable: true })
@Index()
@Field(() => Int, { nullable: true })
gradeLevel: number | null;       // 1-12

@Column({ type: 'uuid', nullable: true })
@Index()
@Field({ nullable: true })
homeroomTeacherId: string | null;

@ManyToOne(() => User, { nullable: true })
@JoinColumn({ name: 'homeroomTeacherId' })
homeroomTeacher: User | null;

// parent-student.entity.ts
export enum ParentRelationship {
  PARENT = 'parent',
  GUARDIAN = 'guardian',
  OTHER = 'other',
}
@Column({ type: 'enum', enum: ParentRelationship, default: ParentRelationship.PARENT })
@Field(() => ParentRelationship)
relationship: ParentRelationship;
```

### Backend Steps
1. Migration: add columns to `users` and `parent_students`. Existing rows get null gradeLevel.
2. Update `CreateUserInput`, `UpdateUserInput` with new fields
3. Validate: `gradeLevel` only valid when roles include STUDENT; `homeroomTeacherId` must be INSTRUCTOR in same tenant
4. Update `AdminUsersQuery` filter to support `gradeLevel: number`
5. Update `LinkStudentInput` (parent module) for `relationship`
6. Verify announcement fan-out (already in service) actually queries the new `gradeLevel` column

### Frontend Steps
1. Extend `create-user-dialog.tsx` and `edit-user-dialog.tsx` with grade-level select + homeroom async picker
2. Conditional render: grade-level / homeroom only when STUDENT role selected
3. Async homeroom select: debounced query for instructors by name, limit 20
4. Grade-level filter dropdown in users table
5. Update `LinkParentDialog` with relationship dropdown
6. Show "Grade X · Homeroom: Mr. Smith" badge on user detail view

### Best Practices
- `z.discriminatedUnion` on role array to make gradeLevel required when STUDENT, omitted otherwise
- Debounced async option lookup; never load all instructors upfront
- Soft constraint: homeroom teacher leaves → students keep the FK (set null), no cascade
- Index `gradeLevel` for announcement fan-out
- Grade as `int`, never string ("Grade 11" vs "11" is a bug factory)

### Edge Cases
- Existing students have null gradeLevel → warning banner on users page
- Instructor reassigned → old homeroom students keep link until admin changes
- Year promotion (all grade Xs become X+1) → individual edits for now; bulk in v2
- Non-student gets gradeLevel set in DB directly → server validation rejects on update

### Manual Test Plan
1. Admin creates a new grade 11 student with homeroom Mr. Smith → record saved
2. Admin filters users by grade 11 → only grade 11 students show
3. Admin sets gradeLevel on a non-student → UI hides the field; server rejects if forced
4. Admin posts a school-wide announcement with `targetGrade=11` → only grade 11 students see it
5. Admin links a parent with relationship=GUARDIAN → parent portal still works
6. Admin sets homeroom = a student → rejected

### Automated Tests (Required)
- Unit: validation rejects gradeLevel on non-student
- Unit: validation rejects homeroomTeacherId pointing to a non-instructor
- Integration: grade-level announcement filters correctly

### Definition of Done
- [ ] Three new fields persisted (gradeLevel, homeroomTeacherId, relationship)
- [ ] Admin UI surfaces all three
- [ ] Grade-level announcement targeting works end-to-end
- [ ] All six manual cases pass

### Estimated Effort
**1.5 days** — 0.5 backend, 1 frontend + UX

---

## Sprint 4 — Announcements Admin Composer (School-wide & Grade-level)

### Goal
Expose the existing backend announcement scopes (SCHOOL_WIDE, GRADE) through an admin UI. Backend works — UI doesn't exist.

### Why It Matters
"The principal sends a message to the entire school" comes up in the first 10 minutes of any school demo.

### Current State
- Backend: `AnnouncementScope` supports SECTION/GRADE/SCHOOL_WIDE
- `AnnouncementsService.create()` accepts `scope`
- Feed query merges section + grade-targeted + school-wide for students
- Frontend: only the instructor-side SECTION composer exists. No admin-level composer.

### Scope
**In:**
- `/admin/announcements` page listing all tenant announcements
- "New Announcement" dialog with scope selector
- Scope=Section → section picker; Scope=Grade → grade dropdown; Scope=School-wide → no extra
- Recipient count preview ("Visible to 230 students")
- Pin/unpin, priority controls
- Mobile preview pane

**Out:**
- Scheduled sending (defer)
- Attachments on announcements (defer; can layer on Sprint 2's infra)
- Multi-section fan-out (defer)

### Data Model
No schema changes — entity already supports everything.

### Backend Steps
1. `adminAnnouncements(filter, page)` query — paginated, returns author + section
2. `recipientCount(scope, targetGrade?, sectionId?): Int!` query — projected audience size
3. Verify `createAnnouncement` works for SCHOOL_WIDE (no sectionId) and GRADE (targetGrade required); relax DTO if it currently requires sectionId

### Frontend Steps
1. `/admin/announcements/page.tsx` — list with scope filter
2. `CreateAnnouncementDialog` with three-radio scope selector
3. Conditional fields driven by `react-hook-form` `watch()`
4. Debounced recipient count on scope/target change
5. Mobile preview pane on the right
6. Add to admin nav in `lib/navigation.ts`

### Best Practices
- zod discriminated union for scope: `z.literal('school_wide')` vs `z.object({ scope: z.literal('grade'), targetGrade: z.number().min(1).max(12) })`
- Confirmation modal for SCHOOL_WIDE — "Will notify 230 students and 18 staff. Send?"
- Optimistic UI on post, rollback on failure
- Empty state in list — "No announcements yet"
- Author name + role badge in list

### Edge Cases
- Non-admin tries SCHOOL_WIDE → rejected by role guard
- Grade announcement with no students at that grade → posts successfully but count=0; warning banner
- Pinned announcement persists at top of student feed
- Urgent priority → red border + bell icon

### Manual Test Plan
1. Admin posts SCHOOL_WIDE → all students see in feed
2. Admin posts GRADE=11 → only grade 11 students see
3. Instructor posts SECTION → only that section's students see
4. Recipient count updates as scope changes
5. Pin school-wide → appears at top of every student's feed
6. Urgent priority → red border + bell
7. Non-admin instructor → composer UI inaccessible

### Automated Tests (Required)
- Unit: `createAnnouncement` requires targetGrade when scope=GRADE
- Unit: `createAnnouncement` ignores/rejects sectionId when scope=SCHOOL_WIDE
- Integration: feed query returns correct set for a grade-11 student

### Definition of Done
- [ ] Composer with three scopes works
- [ ] Recipient count accurate
- [ ] Pin + priority render correctly on student feed
- [ ] All seven manual cases pass

### Estimated Effort
**1.5 days** — 0.5 backend, 1 frontend

---

## Sprint 5 — User + Enrollment CSV Import Admin UI

### Goal
Surface the existing `importUsers()` and `importEnrollments()` service methods through an admin wizard with row-level validation preview and dry-run mode.

### Why It Matters
Brentwood has student data in MySchool. They won't type 400 names into a UI. Without a credible bulk import, the migration conversation dies.

### Current State
- `CsvImportService.importUsers()` exists at line 679
- `CsvImportService.importEnrollments()` exists at line 834
- Catalog (courses/sections) import exposed at `/admin/catalog/import`
- No UI exposure for user/enrollment import

### Scope
**In:**
- Two new tabs on `/admin/catalog/import`: Users, Enrollments
- Each tab: textarea OR file picker → Dry Run / Live toggle → Import button
- Result panel: succeeded rows, failed rows, per-row error breakdown
- CSV template download button per tab
- Idempotent semantics: re-import updates, doesn't duplicate
- Email-based dedup for users; (student email, section code) for enrollments

**Out:**
- Field mapping wizard (fixed headers; document them)
- Async queue for huge files (defer to Sprint 7 if needed)
- Real-time progress bar (sync import fine up to ~5000 rows)

### Data Model
No schema changes.

### Backend Steps
1. Verify existing methods support `dryRun: boolean`; if not, add it (validate every row, skip writes when true)
2. Add `bulkImportUsers` and `bulkImportEnrollments` mutations
3. Return shape: `{ totalRows, successCount, errorRows: [{ row, message }] }`
4. Idempotency: upsert users by email; upsert enrollments by (studentEmail, sectionCode)

### Frontend Steps
1. Extend `/admin/catalog/import` with tabs: Catalog / Users / Enrollments
2. Shared `<CsvImporter>` component:
   - File picker + textarea
   - Download template link
   - Dry Run / Live toggle (default Dry Run)
   - Submit + result panel + per-row errors table
3. CSV templates as static `.csv` downloads

### Best Practices
- Always default to dry run; second click is "Yes, actually import"
- Diff preview: "Will create 12, update 3, skip 1"
- Per-row error reporting with row number + offending data + reason
- Idempotent — admins WILL re-upload after fixing
- Transaction wrap: all rows that validate succeed, or none do
- Strip BOM (existing service likely does — verify)

### Edge Cases
- Empty CSV → "No rows found"
- Row with email but no first name → row error
- gradeLevel on instructor → row error
- Duplicate emails in file → first wins, second is row error
- Enrollment for nonexistent section code → row error
- Enrollment for student not yet imported → row error, suggest "import users first"
- Duplicate enrollment (same student, same section) → silent upsert

### Manual Test Plan
1. Download users template → CSV opens in Excel
2. Paste 5 valid student rows → Dry Run → "5 valid"
3. Live → 5 students in `/people`
4. Re-import same 5 rows → "5 skipped (already exist)"
5. Import with junk email → row error, valid rows still proceed
6. Import enrollments for those students → roster updates
7. Enrollment for nonexistent section → "Section code 'MATH99' not found"

### Automated Tests (Required)
- Unit: `importUsers` idempotent — twice = same DB state
- Unit: `importUsers` rolls back all writes if mid-batch DB error
- Unit: `importEnrollments` upserts on (studentEmail, sectionCode)
- Integration: dry run produces zero DB changes

### Definition of Done
- [ ] Both tabs functional with dry-run preview
- [ ] CSV templates downloadable
- [ ] Idempotent re-imports verified
- [ ] All seven manual cases pass

### Estimated Effort
**1.5 days** — 0.5 backend, 1 frontend

---

## Sprint 6 — Google Calendar Sync

### Goal
Teacher connects Google once → Axis class schedule + assignment due dates appear in their Google Calendar.

### Why It Matters
The "wow" moment in a demo. School staff live in Google Workspace. Closes the "yet another system" objection.

### Current State
- Not built
- `.env.example` reserves `GOOGLE_CLIENT_ID/SECRET`
- No third-party OAuth infrastructure (only first-party JWT)

### Scope
**In:**
- Settings page: "Connect Google Calendar" → OAuth flow → "Connected ✓"
- Backend: store refresh token encrypted
- Sync 1: section schedule change → upsert recurring event
- Sync 2: assignment created → create one-off event with dueAt
- Sync 3: assignment updated → patch event
- Disconnect: revoke + delete tokens
- Manual "Sync now" for debugging

**Out:**
- Student-side sync (defer — much smaller value)
- Two-way sync (defer indefinitely)
- Outlook (defer)

### Data Model
```typescript
// new entity: external-calendar-link.entity.ts
@Entity('external_calendar_links')
@Index(['tenantId'])
@Index(['userId'])
export class ExternalCalendarLink extends TenantScopedEntity {
  @Column() userId: string;
  @Column({ type: 'enum', enum: ['google'] }) provider: 'google';
  @Column({ type: 'text' }) encryptedRefreshToken: string;
  @Column({ type: 'text', nullable: true }) accessToken: string;
  @Column({ type: 'timestamp', nullable: true }) accessTokenExpiry: Date;
  @Column({ type: 'varchar', nullable: true }) calendarId: string;
  @Column({ type: 'jsonb', default: {} }) eventIdMap: Record<string, string>;
}
```

### Backend Steps
1. New `GoogleCalendarModule`
2. OAuth controller: `GET /api/integrations/google/connect` → redirect; `GET .../callback` → token exchange
3. Encrypt refresh token (AES-256-GCM, key from `INTEGRATION_TOKEN_KEY` env)
4. Service methods:
   - `pushSectionSchedule(userId, sectionId)`
   - `pushAssignmentDueDate(userId, assignmentId)`
   - `revokeConnection(userId)`
5. Event listeners on `SECTION_UPDATED`, `ASSIGNMENT_CREATED`, `ASSIGNMENT_UPDATED`
6. BullMQ background queue — user shouldn't wait for Google API during a save

### Frontend Steps
1. Settings → Integrations tab
2. "Connect Google Calendar" button → OAuth popup
3. Status display + last-synced timestamp
4. Manual "Sync now"
5. Disconnect with confirmation

### Best Practices
- Never plaintext refresh tokens — AES-256-GCM with env-derived key
- Idempotent event creation — Google event ID stored in `eventIdMap`; update if exists, insert if not
- Every Google API call via BullMQ — retry on 429/503
- Capture rotated refresh tokens
- Minimum scope: `https://www.googleapis.com/auth/calendar.events` only
- Recurring event for schedule: `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=<termEnd>` — one event per section
- OAuth state param: random, stored in Redis, verified on callback
- Surface sync errors visibly — never silent

### Edge Cases
- User revokes from Google's dashboard → next sync 401 → mark expired → "Reconnect" banner
- Section deleted in Axis → delete event via `eventIdMap`
- Teacher reassigned to a new section → old event removed, new added
- Term ends → RRULE UNTIL stops recurrence
- Refresh fails → mark expired, notify user
- Connect, disconnect, reconnect → fresh map, no orphans

### Manual Test Plan
1. Instructor settings → Connect Google → OAuth popup → approve → "Connected ✓"
2. Google Calendar shows recurring events for every section this term
3. Create assignment due next Friday 5pm → event appears in Google Calendar
4. Edit dueAt → event updates
5. Disconnect → events removed; link row deleted
6. Reconnect → fresh rebuild
7. "Sync now" → no duplicate events

### Automated Tests (Required)
- Unit: encryption round-trip
- Unit: `eventIdMap` updated not appended on re-sync
- Integration: sync retries on 429
- Manual: full OAuth flow against real Google (can't be meaningfully automated)

### Definition of Done
- [ ] OAuth round-trip works in dev with a real Google account
- [ ] Recurring schedule events in Google Calendar
- [ ] Assignment events appear + update
- [ ] Disconnect removes all events + tokens
- [ ] Refresh token encrypted at rest

### Estimated Effort
**3 days** — 1.5 backend (OAuth + crypto + Google API + queue), 1 frontend (settings + popup), 0.5 testing

---

## Sprint 7 — Production Hardening

### Goal
Take Axis from "demo runs on my laptop" to "this could be hosted for a paying customer."

### Why It Matters
`synchronize: true` (TypeORM auto-DDL) is on. The first prod deploy with an entity change loses data. No seed data, no load testing, several indexes missing.

### Current State
- `TypeOrmModule.forRootAsync` runs `synchronize: true` in dev (verified in `app.module.ts`)
- Several entities have `@Index` from past audits — coverage uneven
- Zero migration files
- No seed script for demo data

### Scope
**In:**
- Generate baseline migration from current schema
- `synchronize: false` in production (dev flag-controlled)
- Missing indexes from EXPLAIN ANALYZE on top 10 queries
- Seed script for "Brentwood Demo School":
  - 1 admin, 5 instructors, 2 parents
  - 30 students across grades 9–12 with homerooms
  - 8 courses, 12 sections with realistic schedules
  - 4 weeks of attendance, 2 graded assignments per section, sample announcements
- BullMQ retry policies on every event handler
- Sentry wired in production (`SentryModule` already imported — verify connected)
- ThrottlerModule tuning (auth 5/min, GraphQL 100/min, signed URLs 30/min)
- Helmet middleware
- CORS allowlist tightened to `FRONTEND_URL`
- Orphan FileUpload cleanup cron (24h stale)

**Out:**
- Multi-region deploy
- Read replicas
- Backup automation (use hosting defaults)
- Full pen test

### Implementation Steps
1. **Migration baseline:**
   - `npm run typeorm migration:generate -- src/database/migrations/InitialSchema`
   - Review generated SQL, hand-edit if anything weird
   - Commit, run `migration:run` against fresh DB
   - `synchronize: process.env.NODE_ENV !== 'production'` everywhere — flip to `false` in prod
2. **Seed script:**
   - `axis-backend/src/database/seeds/demo-tenant.seed.ts`
   - Idempotent: re-run drops demo tenant and recreates
   - Realistic names via Faker (verify dep), realistic schedules (math at 9am MWF, science at 10:30 TR)
3. **Index audit:**
   - EXPLAIN ANALYZE on: feed, gradebook, schedule, attendance summary, parent enrollments
   - Add missing indexes
   - Verify all `tenantId` columns indexed (CLAUDE.md mandate)
4. **Cleanup cron:**
   - Use `@nestjs/schedule` (already in `app.module.ts`)
   - `@Cron('0 3 * * *')` → delete unconfirmed FileUploads >24h, expired reset tokens
5. **Security:**
   - `app.use(helmet())` in `main.ts`
   - CORS: replace `*` with `process.env.FRONTEND_URL`
   - Boot check: reject if `JWT_SECRET` is the example value
6. **Throttler tuning** as scoped above

### Best Practices
- After this sprint: never edit a committed migration; always add a new one
- Idempotent seeds, safe to re-run
- EXPLAIN ANALYZE every new query going forward
- Backup before migration in any non-trivial env
- Every new env var → `.env.example` + `.env.production.example` same day

### Manual Test Plan
1. Drop local DB, run migrations from scratch → app boots cleanly
2. Run seed, log in as `admin@brentwood-demo.local` → populated school visible
3. Top 10 user actions return <200ms locally
4. Auth endpoint rate-limited after 5 rapid logins
5. Helmet sets expected headers (`curl -I`)
6. CORS rejects unlisted origins
7. Orphan FileUpload cleanup ran (advance clock or trigger manually)

### Definition of Done
- [ ] `synchronize: false` in production config
- [ ] Baseline migration committed
- [ ] Seed script runs end-to-end on fresh DB
- [ ] All tenant-scoped columns indexed
- [ ] Helmet + CORS + Throttler tuned
- [ ] Cleanup cron registered
- [ ] All seven manual checks pass

### Estimated Effort
**2 days** — 0.5 migration baseline, 1 seeds, 0.5 security + indexes

---

## Sprint 8 — Pre-Demo Polish & End-to-End QA

### Goal
The week before the Brentwood demo, run every flow end-to-end. Fix anything janky. Polish empty states, loading skeletons, mobile layouts.

### Why It Matters
Demos die on small things — a missing skeleton, a console error, a button without a loading state.

### Scope
**In:**
- Run the Demo Script (below) twice — admin, instructor, student, parent roles
- Fix every UX rough edge found
- Mobile (375px) check on every demo-path page
- Browser console must be clean on every demo page
- Toasts: consistent verbs ("created", "saved", "deleted", "linked")
- Empty states: copy + action button
- Loading skeletons match the layout (no layout shift)
- Error states: retry CTA
- Verify Resend emails arrive in a real inbox

**Out:**
- Anything not on demo path
- Performance optimization beyond obvious wins

### Demo Script (Run Twice in Sprint 8)
**Setup:** seed script run, 4 browsers open: admin, instructor, student, parent.

**Admin walkthrough (~8 min):**
1. Log in → home dashboard with school stats
2. `/people` → filter by grade 11 → 8 students
3. Add User → create parent → toast
4. Find a student → Link Parent → search → link → toast
5. `/admin/announcements` → New → school-wide → "Parent-Teacher Conferences next Thursday" → recipient count → send
6. `/admin/catalog` → Sections → edit one → MWF 9-10:30 Room 204 → save
7. `/admin/catalog/import` → Users tab → paste 3 rows → Dry Run → "3 valid" → Live → see students in `/people`

**Instructor walkthrough (~5 min):**
1. Home dashboard
2. `/schedule` → weekly grid with sections
3. Click section → roster
4. Create assignment with PDF instructions attached → save
5. Switch to student tab: student attaches Word doc → submits
6. Back to instructor: gradebook → submission → download file → grade 18/20 + feedback
7. (Sprint 6 if done) Show assignment in Google Calendar

**Student walkthrough (~4 min):**
1. Home dashboard with feed showing school-wide announcement
2. `/schedule` → grid of enrolled classes
3. `/grades` → attendance + grades
4. `/notifications` → grade notification

**Parent walkthrough (~3 min):**
1. `/parent` → linked children as cards
2. Child → Classes → schedule
3. Grades → grades
4. Report Cards → published cards

**Total demo: ~20 min**

### Manual QA Checklist (every demo-path page)
- [ ] Skeleton loading state renders
- [ ] Empty state with copy + CTA
- [ ] Error state with retry
- [ ] Mobile (375px) doesn't break
- [ ] Console clean
- [ ] Toast verbs consistent
- [ ] Buttons disable during mutation
- [ ] Forms validate inline

### Definition of Done
- [ ] Demo script runs end-to-end twice with no reload, no console error, no visible bug
- [ ] Every demo-path page passes manual QA checklist
- [ ] Resend emails arrive in test inbox

### Estimated Effort
**2 days** — 1 day running script + filing bugs, 1 day fixing

---

## Sprint Summary

| # | Sprint | Days | Priority | Demo-blocking? |
|---|--------|------|----------|----------------|
| 1 | Schedule data model + admin UI | 2 | P0 | **Yes** |
| 2 | Assignment file attachments | 2.5 | P0 | **Yes** |
| 3 | K-12 student record fields | 1.5 | P1 | No, unlocks Sprint 4 |
| 4 | Announcements admin composer | 1.5 | P1 | **Yes** |
| 5 | User + enrollment CSV import UI | 1.5 | P1 | **Yes** (migration story) |
| 6 | Google Calendar sync | 3 | P2 | No — but "wow" |
| 7 | Production hardening | 2 | P1 | Not demo, **yes for sale** |
| 8 | Pre-demo polish & QA | 2 | P0 | **Yes** |

**Total: ~16 focused engineering days.**

**If only 10 days:** Sprints 1, 2, 4, 5, 8. Skip Google Calendar and full hardening.

**If only 5 days:** Sprints 1, 2, 8. Minimum viable demo.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| R2 not actually wired in dev | Medium | High | Sprint 2 first task: verify R2 round-trip with a tiny test file |
| Google OAuth verification needed for prod | Medium | Medium | Use dev OAuth client for demo; prod verification only after Brentwood signs |
| Schema migrations cause data loss | Medium | High | Backup before every migration; review every generated SQL; Sprint 7 baseline is riskiest |
| `synchronize: true` has drifted from would-be migrations | Likely | Medium | Sprint 7 baseline captures current state as Day 1 |
| Large CSV imports time out | Medium | Low | Document 5000-row max; queue if Brentwood exceeds it |
| Seed data not credible | Low | Medium | Pull real Brentwood course info from their public site for the demo seed |

---

## Pre-Flight Checklist (Before Any Sprint)

- [ ] `.env` populated (Resend, JWT secret, DB creds)
- [ ] Postgres running and reachable
- [ ] Redis running (BullMQ depends on it)
- [ ] `npm install` succeeds in both projects
- [ ] `npm run dev` starts both services cleanly
- [ ] You can log in as the existing admin
- [ ] Git working tree clean
- [ ] Sprint branch created

---

## Universal Definition of Done (Every Sprint)

A sprint is not done until:

- [ ] All Definition of Done items in the sprint section checked
- [ ] Backend `npm run typecheck` passes
- [ ] Frontend `npm run typecheck` passes
- [ ] Backend `npm run lint` passes
- [ ] Frontend `npm run lint` passes
- [ ] Manual test plan executed completely on a fresh DB
- [ ] No new browser console errors
- [ ] Branch merged to main, PR closed, branch deleted
- [ ] `BACKLOG.md` updated, sprint marked DONE
- [ ] `.claude/session-log.md` updated
- [ ] Any new env vars → `.env.example` and `.env.production.example`

---

## Explicitly Deferred to Post-MVP

- Quiz authoring UX polish
- Discussions/forums advanced features (threading depth, moderation)
- AI tutor expansion (already functional)
- Mobile native apps
- LTI integrations (deep linking, grade passback)
- SAML/SSO (Google login as admin convenience okay; SAML is enterprise)
- Multi-language
- Full WCAG accessibility audit
- White-labelling per tenant
- Bulk student grade promotion (year roll-over)
- Multiple guardians per student with tiered access

If a stakeholder asks for any of these during the Brentwood conversation: "v2."
