# Sprint Plan — Feature 3 (Schedule) & Feature 5 (Google Calendar)

> Written after reading the codebase. Every file reference is real. Every decision traces
> to what already exists so nothing is rebuilt unnecessarily.

---

## Key findings from the code audit

| What I found | Implication |
|---|---|
| `CourseSection` already has `schedule: jsonb` and `location: varchar` | No DB migration needed for schedule. Just define the JSONB shape and use it. |
| `AdminCreateSectionInput.schedule` already accepts `string` (JSON) | Backend DTO is already open to schedule data. Just not validated or documented. |
| `MY_ENROLLMENTS_QUERY` fetches `location` but not `schedule` | One line addition to the GQL query to unlock schedule data on the frontend. |
| `create-section-dialog` and `edit-section-dialog` have `location` field | Schedule time pickers can be added to the same forms with minimal surgery. |
| User entity has `googleId: string` and `preferences: jsonb` | Google Calendar refresh token lives in `preferences.googleCalendar` — no new column. |
| Auth module has only `jwt.strategy` and `local.strategy` | Google Calendar OAuth is a new REST flow, not a Passport strategy. Keep it separate from login. |
| Settings page (`/settings`) follows a Card-per-feature layout | Google Calendar connect card slots in naturally alongside the existing notification cards. |

---

## Feature 3 — Student Schedule Page

### Approach

The `schedule` JSONB on `CourseSection` is already there. The correct pattern is to define a
TypeScript interface for its shape, store structured data via the existing section forms, and
render it as a timetable grid on a new `/schedule` page. Zero schema changes.

This is the same pattern used by university SIS systems (UBC's SSC, UofT's Acorn, McGill's
Minerva) — a structured schedule object per section, rendered as a Mon–Fri weekly grid.

---

### Step-by-step implementation

#### Step 1 — Define the schedule shape (backend, 30 min)

**File:** `axis-backend/src/modules/courses/dto/schedule.types.ts` *(new)*

```typescript
export type WeekDay = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';

export interface SectionSchedule {
  meetingDays: WeekDay[];
  startTime: string;  // "HH:MM" 24h, e.g. "08:30"
  endTime: string;    // "HH:MM" 24h, e.g. "09:45"
}
```

This file is the single source of truth for the schedule shape. Both the service-layer validator
and the frontend parser reference this definition.

---

#### Step 2 — Validate schedule on input (backend, 30 min)

**File:** `axis-backend/src/modules/courses/dto/admin-course.types.ts`

The existing `AdminCreateSectionInput` and `UpdateSectionInput` both already have
`schedule?: string` (a JSON string). Add a `@IsJSON()` class-validator decorator to both fields
so malformed JSON is rejected at the controller boundary.

In `CoursesService.createSection` and `updateSection`, parse and re-serialize the JSON string
before saving to guarantee valid JSONB in the database.

No resolver changes needed — the mutations already wire through.

---

#### Step 3 — Expose schedule in GraphQL queries (frontend, 15 min)

**File:** `axis-frontend/src/lib/graphql/queries/courses.ts`

Add `schedule` to `MY_ENROLLMENTS_QUERY` and `MY_SECTIONS_QUERY`:

```graphql
section {
  id
  location
  schedule      # ← add this one field
  status
  course { ... }
  instructor { ... }
}
```

The `schedule` field is already exposed on `CourseSection` as `@Field(() => String, { nullable: true })`.
No backend change required.

---

#### Step 4 — Add schedule fields to admin section forms (frontend, 2–3 hrs)

**Files:**
- `axis-frontend/src/components/admin/create-section-dialog.tsx`
- `axis-frontend/src/components/admin/edit-section-dialog.tsx`

Add to each form:
1. A **day-of-week checkbox group** (Mon / Tue / Wed / Thu / Fri) — shadcn `Checkbox` components
   in a horizontal row
2. A **start time input** and **end time input** — `<Input type="time">` (native HTML time picker,
   no extra dependency, works everywhere)

On form submit, serialize to:
```json
{ "meetingDays": ["MON", "WED", "FRI"], "startTime": "08:30", "endTime": "09:45" }
```

Pass as the existing `schedule` string field in the mutation input. Zero DTO changes needed.

---

#### Step 5 — Build the /schedule page (frontend, 1 day)

**File:** `axis-frontend/src/app/(dashboard)/schedule/page.tsx` *(new)*

**What it renders:** A Mon–Fri timetable grid. Standard university schedule view.

```
         MON        TUE        WED        THU        FRI
 08:00  ┌──────┐             ┌──────┐
        │ CS   │             │ CS   │
        │ 101  │             │ 101  │
 09:00  └──────┘             └──────┘   ┌──────┐
                                        │ MATH │
 09:30             ┌──────┐             │ 201  │
                   │ ENG  │             └──────┘
 10:00             │ 202  │
                   └──────┘
```

Implementation approach:
- Query: reuse `MY_ENROLLMENTS_QUERY` (already fetches what we need once `schedule` is added)
- Parse `section.schedule` JSON per enrollment
- CSS Grid layout: 5 columns (Mon–Fri) + 1 label column, rows = 30-min slots from 07:00–18:00
- Place each course block using `grid-row-start` / `grid-row-end` calculated from start/end times
- Each block: course code badge + course title + room + instructor name
- Click block → `Link` to `/courses/[courseId]/section/[sectionId]`
- Empty state: if no sections have schedule data yet, show a friendly message with a link to
  `/courses` (the existing list view still works as a fallback)
- One line update to `navigation.ts` adds "Schedule" to `studentNav` and `instructorNav`

**No new dependencies.** CSS Grid handles the layout. Native `<time>` parsing handles the slot
math. The `MY_ENROLLMENTS_QUERY` + Apollo `useQuery` pattern is already used on every other page.

---

#### Step 6 — Add "Schedule" to navigation (frontend, 5 min)

**File:** `axis-frontend/src/lib/navigation.ts`

Add `{ label: 'Schedule', href: '/schedule', icon: Calendar }` to `studentNav` and
`instructorNav`. Add it to the mobile nav arrays too (replace a lower-priority item if at limit).

---

### Total effort: ~2 days

| Step | What | Time |
|---|---|---|
| 1 | Define schedule shape | 30 min |
| 2 | Backend validation | 30 min |
| 3 | Add `schedule` to GQL queries | 15 min |
| 4 | Section form time pickers | 2–3 hr |
| 5 | Timetable page | 1 day |
| 6 | Navigation wiring | 5 min |

---

## Feature 5 — Google Calendar Sync

### Approach — Two Phases

After researching the options, here is the honest recommendation:

**Phase A (1 day): Webcal subscription feed**
Generate a stable `.ics` URL per user. Teacher copies it into Google Calendar → "Add calendar → From URL". Google Calendar auto-refreshes every few hours. This is word-for-word how every
university SIS (UBC SSC, UofT Acorn, McGill Minerva, MIT Stellar) works. It also works with
Apple Calendar and Outlook — zero lock-in to Google. Zero GCP credentials needed.

**Phase B (2–3 days): Google Calendar API push sync**
Full OAuth 2.0 — teacher clicks "Connect Google Calendar" in settings, Axis pushes events in
real-time when they enroll or when assignments are created.

**Why Phase A first:** You said you'll set up Google credentials later. Phase A lets you demo the
calendar feature on day one without any GCP setup. Phase B is the deeper integration that makes it
feel premium, and can be layered on after the demo.

---

### Phase A — Webcal Subscription Feed

#### A1 — iCal generator service (backend, 3–4 hrs)

**File:** `axis-backend/src/modules/calendar/calendar.service.ts` *(new module)*

Uses the `ical-generator` npm package (10M weekly downloads, the standard Node.js iCal library).

```
npm install ical-generator
```

`CalendarService.generateForUser(userId, tenantId)`:
1. Load user's active enrollments with section schedule + location
2. Load user's upcoming assignments (due dates within 60 days)
3. Build an `ical()` calendar object:
   - One recurring `VEVENT` per section (RRULE repeating on `meetingDays` until term end date)
   - One `VEVENT` per assignment due date (with a 24-hour `VALARM` reminder)
4. Return the `.ics` string

**Auth on the feed URL:** The URL must be openable without the httpOnly cookie (Google Calendar
fetches it server-side, no browser cookie). Use an HMAC-signed token:

```
GET /api/calendar/feed?token=<HMAC_SHA256(userId + secret)>
```

The token is stable (not expiring) so the subscribed URL never breaks. Store the token in
`user.preferences.calendarFeedToken` on first generation. A `GET /api/calendar/token` endpoint
(JWT-authenticated) generates and returns it.

**File:** `axis-backend/src/modules/calendar/calendar.controller.ts` *(new)*

Two REST endpoints (REST because Google Calendar fetches `.ics` URLs — not GraphQL):
- `GET /api/calendar/token` — JwtAuthGuard, returns `{ url: 'webcal://...', token: '...' }`
- `GET /api/calendar/feed?token=...` — public, validates HMAC, returns `text/calendar`

#### A2 — Settings card (frontend, 1–2 hrs)

**File:** `axis-frontend/src/app/(dashboard)/settings/page.tsx`

Add a new Card below the existing notification cards:

```
┌─────────────────────────────────────────────┐
│ 📅 Calendar Subscription                     │
│                                              │
│ Add your Axis schedule to Google Calendar,   │
│ Apple Calendar, or Outlook.                  │
│                                              │
│ [Copy Subscription URL]  [How to add →]      │
└─────────────────────────────────────────────┘
```

On mount: call `GET /api/calendar/token` (with JWT cookie), get the `webcal://` URL, display it.
"Copy" button writes to clipboard. No OAuth needed. Works immediately.

Add a GraphQL query `myCalendarToken: String` or a REST `useEffect` fetch — both work, pick REST
to match the controller pattern.

---

### Phase B — Google Calendar API Push Sync

This phase is done after the demo, once GCP credentials are set up.

#### B1 — GCP setup (you do this, 30 min)

1. Google Cloud Console → New project (or reuse existing)
2. Enable the **Google Calendar API**
3. OAuth 2.0 Credentials → Web application
4. Authorized redirect URI: `http://localhost:3001/api/auth/google-calendar/callback` (dev) + your prod URL
5. Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into `axis-backend/.env`

#### B2 — Store token on User (backend, 30 min)

**File:** `axis-backend/src/database/entities/user.entity.ts`

No new column. Store in the existing `preferences` JSONB:

```typescript
// preferences shape for Google Calendar
interface UserPreferences {
  googleCalendar?: {
    refreshToken: string;      // encrypted
    accessToken: string;       // short-lived, cached
    tokenExpiresAt: number;    // unix ms
    connectedEmail: string;
    connectedAt: string;
  };
  calendarFeedToken?: string;  // Phase A
}
```

Encrypt the refresh token with AES-256-GCM using `CALENDAR_ENCRYPTION_KEY` env var before
storing. Do not store plaintext tokens in the database.

#### B3 — OAuth flow (backend, 2 hrs)

**File:** `axis-backend/src/modules/auth/auth.controller.ts` — add two endpoints:

`GET /api/auth/google-calendar`
- JwtAuthGuard (requires logged-in user)
- Build Google OAuth URL with scopes: `https://www.googleapis.com/auth/calendar.events`
- Redirect user's browser to Google

`GET /api/auth/google-calendar/callback`
- Exchange `code` for tokens via `google-auth-library`
- Encrypt and store refresh token in `user.preferences.googleCalendar`
- Redirect to `FRONTEND_URL/settings?calendar=connected`

#### B4 — Calendar push service (backend, 3 hrs)

**File:** `axis-backend/src/modules/calendar/google-calendar.service.ts` *(new)*

Uses `googleapis` npm package:

```
npm install googleapis google-auth-library
```

Key methods:
- `getClient(userId)` — load refresh token from user, build OAuth2 client, auto-refresh access token
- `pushSectionEvents(userId, enrollments)` — upsert recurring events for all enrolled sections
- `pushAssignmentDueDate(userId, assignment)` — create one-off event with 24h reminder
- `deleteEvent(userId, eventId)` — called on unenroll or assignment delete
- `disconnectCalendar(userId)` — clear `preferences.googleCalendar`, call `oauth2.revokeToken`

Store the Google Calendar event ID back in the enrollment or assignment record so future
updates/deletes target the right event. Options:
- Add `googleCalendarEventId?: string` to the `Enrollment` entity JSONB metadata field
- Or store in a separate lightweight `calendar_events` table

#### B5 — Event listener hooks (backend, 1 hr)

**File:** `axis-backend/src/modules/ai/ai-event.listener.ts` (already wired to EventEmitter2)

Or create `axis-backend/src/modules/calendar/calendar-event.listener.ts` — a cleaner separation.

Listen for existing events:
- `ENROLLMENT_CREATED` → `googleCalendarService.pushSectionEvents(userId, [enrollment])`
- `ASSIGNMENT_CREATED` → for each enrolled student in that section, push due date event
- `SUBMISSION_GRADED` / enrollment status change → delete event if dropped

These events already fire. Just add the calendar push as an additional handler.

#### B6 — Settings UI update (frontend, 1–2 hrs)

**File:** `axis-frontend/src/app/(dashboard)/settings/page.tsx`

Replace the Phase A "Copy URL" card with a more complete card:

```
┌────────────────────────────────────────────────┐
│ 📅 Google Calendar                              │
│                                                 │
│ ✅ Connected as teacher@brentwood.ca             │
│    Last synced: 3 minutes ago                   │
│                                                 │
│ [Sync Now]  [Disconnect]                        │
│                                                 │
│ ─── or ───                                      │
│ [Copy Subscription URL]  (for Apple/Outlook)    │
└────────────────────────────────────────────────┘
```

GraphQL mutations to add:
- `connectGoogleCalendar(code: String!): User` — called on OAuth callback (or from token exchange)
- `disconnectGoogleCalendar: User`
- `syncGoogleCalendar: Boolean`

---

### Phase B Total effort: 2–3 days (after GCP setup)

| Step | What | Time |
|---|---|---|
| B1 | GCP setup (you) | 30 min |
| B2 | Token storage design | 30 min |
| B3 | OAuth REST endpoints | 2 hr |
| B4 | GoogleCalendarService | 3 hr |
| B5 | Event listener hooks | 1 hr |
| B6 | Settings UI | 1–2 hr |

---

## Dependencies between the two features

```
Feature 3 (Schedule) ──────────────────────┐
  Step 1–4: section schedule data model     │
  Step 5: /schedule page                    ▼
                                    Feature 5 Phase A uses
                                    schedule data to generate
                                    RRULE events in the .ics feed

Feature 5 Phase A (Webcal) ────────── Demo-ready, zero GCP needed
Feature 5 Phase B (OAuth push) ────── Post-demo, needs GCP credentials
```

Do Feature 3 first. Phase A calendar feed can be built in parallel with Feature 3 Step 5.
Phase B starts after the demo when GCP credentials are ready.

---

## Recommended execution order

```
Day 1 AM   Feature 3 Steps 1–3: entity shape, validation, GQL query update
Day 1 PM   Feature 3 Step 4: schedule time pickers in admin section forms
Day 2      Feature 3 Step 5: /schedule timetable page
Day 3 AM   Feature 5 Phase A: ical-generator service + calendar controller
Day 3 PM   Feature 5 Phase A: settings card + webcal URL copy flow
           → DEMO READY at end of Day 3
Day 4–6    Feature 5 Phase B: Google OAuth flow + push sync (after GCP setup)
```

---

## Packages to install

```bash
# Backend
cd axis-backend
npm install ical-generator        # Phase A (webcal feed)
npm install googleapis            # Phase B (push sync)
npm install google-auth-library   # Phase B (OAuth)

# No new frontend packages needed.
```

---

## What is NOT needed

- No new TypeORM entities (schedule = existing JSONB, token = existing preferences JSONB)
- No new Passport strategies (Google Calendar OAuth is a manual REST flow, not a login strategy)
- No new NestJS modules for Feature 3 (schedule logic lives in existing CoursesService)
- No database migrations (synchronize: true handles any JSONB shape changes automatically)
