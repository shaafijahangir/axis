# PLAN.md — Axis Engineering Master Plan

> **Purpose:** Single source of truth for everything left to build, fix, and ship.
> Honest assessment over optimism. Priority is not opinion — it's consequence.
>
> **Last updated:** 2026-05-05
> **Written by:** Claude Sonnet 4.6 after reading all codebase context

---

## Reality Check — Where We Actually Are

The ROADMAP.md is stale. Here is what actually exists vs. what it claims is TODO.

| Area | ROADMAP says | Reality |
|------|-------------|---------|
| Push Notifications (A4) | TODO | **Backend done** — `notifications` module with `web-push.service.ts`, `in-app-notification.service.ts`, entities, resolver. Frontend wiring unclear. |
| Discussion Threads (A5) | TODO | **Backend done** — `discussions.module.ts`, `.service.ts`, `.resolver.ts` exist. Frontend integration unknown. |
| Quiz Engine (A6) | TODO | **Backend done** — `quiz.module.ts`, `.service.ts`, `.resolver.ts` exist. Frontend `QuizBuilder` and `QuizDelivery` components exist in assignment page. |
| Marketing Pages (A8) | TODO | **Done** — `/`, `/features`, `/about` all exist (POLISH-001 session confirmed this). |
| Mobile App (Phase B) | Not started | **Substantially started** — Expo app with 5 tabs (home, courses, grades, ai, messages) + auth screens. ~1,400 lines of screen code. |

**Actual current state:** The product is further along than documented. The gap is not missing features — it's depth of implementation, test coverage, production readiness, and a handful of genuinely unfinished areas.

---

## The Critical Path

```
Audit what's actually shipped (Phase A gaps)
    ↓
Wire the frontend to existing backend modules (notifications, discussions, quiz)
    ↓
Bring mobile to shippable state
    ↓
Production deployment infrastructure
    ↓
Go-to-market (Stripe, SSO, onboarding)
```

Nothing in the bottom half is reachable until the top half is solid.

---

## TIER 1 — Must Be Done Before Any Demo or Pitch

These are not features. They are table stakes. A demo that crashes or shows wrong numbers kills credibility instantly.

---

### T1-001: Audit and wire the "built but not connected" modules

**Problem:** The backend has notifications, discussions, and quiz modules. The ROADMAP calls them TODO. They are not TODO — they are **half-done**. Shipping half-done is worse than not shipping at all because it creates the illusion of completeness.

**Work:**

**Notifications:**
- [ ] Confirm `NotificationsResolver` is registered in `app.module.ts`
- [ ] Confirm the in-app notification bell actually calls `notifications` resolver (not just shows a hardcoded badge count)
- [ ] Confirm `web-push.service.ts` is wired to the VAPID flow in PWA service worker
- [ ] Verify notification bell popover reads from the `notifications` table, not `AiConversation` events
- [ ] Test: create an assignment → student gets notification → bell count increments → marking read clears it

**Discussions:**
- [ ] Confirm `DiscussionsModule` is in `app.module.ts`
- [ ] Audit whether discussions are surfaced in the course timeline (they appear in timeline as `DISCUSSION` type entries — check if creating a discussion via the resolver actually creates a timeline entry)
- [ ] Frontend: confirm the discussion detail view (reply threading, mark-as-answered) is actually built, not just a placeholder
- [ ] Test: instructor creates discussion → student sees it → student replies → instructor sees reply count increment

**Quiz:**
- [ ] `QuizBuilder` and `QuizDelivery` exist in the assignment page — confirm they talk to `QuizService` resolver, not just render UI shells
- [ ] Test: instructor creates quiz assignment → adds MCQ questions via QuizBuilder → student opens assignment → sees quiz → submits answers → auto-graded
- [ ] Confirm `maxAttempts` and `timeLimitMinutes` are enforced in `QuizService`, not just stored

**Effort:** 3-5 days of audit + wiring (not building from scratch). **This is not optional before a demo.**

---

### T1-002: Establish a real AI demo environment

**Problem:** Every AI feature returns "invalid x-api-key" in dev. The governance console, event-driven feedback, Study Coach — all non-functional without an `ANTHROPIC_API_KEY`. This is listed in KNOWN NON-BUGS but it means zero AI features have ever been tested end-to-end in a real browser session.

**Work:**
- [ ] Document the correct `.env` setup with real `ANTHROPIC_API_KEY` in `.env.example` (the key itself stays out of the repo)
- [ ] Run WORKFLOW-003 (student submission) with a real API key — verify FeedbackCopilot actually sends a draft to the instructor
- [ ] Run Study Coach conversation with a real API key — verify Socratic responses and tool invocations work
- [ ] Run WORKFLOW-005 (AI Governance) with a real key — verify a blocked tool actually gets blocked in a conversation
- [ ] Fix any bugs found (expect 2-4 integration bugs when the AI pipeline runs end-to-end for the first time)

**Effort:** 1 day to test + estimated 2-3 days of fixes.

---

### T1-003: Parent role — build the relationship model or kill the stub

**Problem:** `PARENT` exists as a UserRole. `ParentHomeFeed` is a stub component. There is no `ParentStudentRelationship` entity, no way to link a parent to a student, no parent-facing views with real data. The parent role is advertised but nonfunctional.

**Decision:** Either build it properly or remove the role from the UI entirely until Phase C.

**If building (recommended for Phase C, defer for now):**
- New entity: `ParentStudentLink` (parentId, studentId, tenantId, permissionLevel, createdAt)
- `ParentModule` with resolver: `myChildren`, `childGrades(studentId)`, `childAssignments(studentId)`
- Admin UI: link parent account to student account
- `ParentHomeFeed`: child grade summaries, upcoming deadlines for all linked children
- Configurable visibility: admin controls what parents can see

**If deferring (honest recommendation for now):**
- [ ] Remove `PARENT` from the role selector in the Create User dialog (admin can't usefully create parent accounts yet)
- [ ] Keep the entity — don't break existing data
- [ ] Add a `// TODO: Phase C` comment on `ParentHomeFeed`

**Effort if deferring:** 30 minutes. If building: 5-7 days.

---

### T1-004: E2E test factory — stop depending on hardcoded seed IDs

**Problem:** All E2E tests reference `40000000-0000-0000-0000-000000000001` (cs101sec) and similar hardcoded IDs via environment variables. If anyone runs tests against a fresh database (CI, staging, another dev machine), they silently fail or skip. This is the #1 test infrastructure debt item.

**The industry pattern:** Tests create their own data via API, capture the real IDs returned, use those IDs for the test run, then clean up (or let the test database reset handle it).

**Work:**
- [ ] Add `beforeAll` hook to the seed fixture that logs in as student and queries `courses` + `myEnrollments` to get real course/section IDs
- [ ] Add a helper to find an assignment with `submittedAt IS NULL` for that student (for submit tests) and one with submissions (for grade tests)
- [ ] Update `testData` fixture to use dynamically fetched IDs instead of env var fallbacks
- [ ] Remove `E2E_COURSE_ID`, `E2E_SECTION_ID`, `E2E_ASSIGNMENT_ID` from env var documentation (they become internal to the fixture)
- [ ] Keep `E2E_STUDENT_EMAIL`, `E2E_INSTRUCTOR_EMAIL`, etc. — those are config, not data

**Why now:** This is 50-80 lines of fixture code. Every day we wait, more tests get written that assume hardcoded IDs. The longer we wait, the more expensive the fix.

**Effort:** 1 day.

---

### T1-005: Seed realism — Faker.js for the dev seed

**Problem:** Current seed has 7 hand-crafted users. For a demo of "institution-wide analytics" showing 10 total users, the analytics page looks thin and unimpressive.

**The right approach:** Keep the current seed as the **base seed** (exact UUIDs, predictable state for tests). Add a **`seed:demo` command** that layers in generated data on top.

**Work:**
- [ ] Install `@faker-js/faker` as a dev dependency in axis-backend
- [ ] Create `src/database/seed-demo.ts` — generates realistic demo data using Faker:
  - 3 departments × 5 instructors each = 15 instructors
  - 8 courses × 2 sections each = 16 active sections
  - 150 students distributed across sections
  - Realistic grade distributions (normal distribution, ~72% mean)
  - 40% submission rate on past-due assignments (realistic, not 100%)
  - 30 days of AI conversation history (for audit log demo)
  - 6 parent accounts each linked to 1-3 students
- [ ] All generated IDs are real UUIDs (`crypto.randomUUID()`), not fixed
- [ ] Script is idempotent via `ON CONFLICT DO NOTHING`
- [ ] Add `"seed:demo": "ts-node src/database/seed-demo.ts"` to package.json

**Do NOT replace the base seed.** The base seed is what tests rely on. The demo seed is additive.

**Effort:** 2-3 days.

---

## TIER 2 — Mobile App to Shippable State

The mobile app exists but needs a quality audit before it can be put in front of real users.

---

### T2-001: Mobile app feature audit

The 5 tabs exist. The question is depth. Audit each screen:

**Home (feed):**
- [ ] Does it call `studentFeed` GraphQL query with auth? (not mocked data)
- [ ] Does pull-to-refresh work?
- [ ] Are feed cards tappable → navigate to assignment/announcement?

**Courses:**
- [ ] Does it call `myEnrollments`?
- [ ] Does tapping a course navigate to course detail → section timeline?
- [ ] Is the section timeline (assignments + announcements) rendered on mobile?
- [ ] Can a student submit an assignment from the mobile app?

**Grades:**
- [ ] Does it call `myGrades` or `courseSectionGrades`?
- [ ] Are per-course grade breakdowns visible?

**AI:**
- [ ] Does it call `availableAgents` and `aiConversations`?
- [ ] Can a student send a message and get a response?
- [ ] Are tool use indicators shown?

**Messages:**
- [ ] Does it call `myConversations`?
- [ ] Is the message thread real-time via Socket.IO?
- [ ] Can a student send a new message?

**Auth:**
- [ ] Does login call `/api/auth/login` and store the JWT correctly (expo-secure-store)?
- [ ] Does the auth guard redirect to login when token is missing?
- [ ] Does token refresh work?

**Effort:** 3-5 days audit + bug fixes (expect significant issues in Socket.IO and auth token handling on native).

---

### T2-002: Mobile push notifications (FCM)

**Backend prep:**
- [ ] Add `deviceToken` and `platform` (ios/android/web) to the Notification entity or a new `UserDevice` entity
- [ ] Add `registerDevice` GraphQL mutation
- [ ] Update `WebPushService` to route to FCM when platform is ios/android

**Mobile:**
- [ ] Install `expo-notifications` and `expo-device`
- [ ] Register for FCM token on app start
- [ ] Call `registerDevice` mutation with token
- [ ] Handle notification tap → deep link to the relevant screen
- [ ] Handle background notifications (badge updates)

**Effort:** 3-4 days.

---

### T2-003: Mobile file upload (camera + document picker)

Students submit assignments. On mobile, they need to attach photos and files.

- [ ] Install `expo-image-picker` and `expo-document-picker`
- [ ] Implement the same two-phase upload flow (request presigned URL → PUT to R2 → confirm) that the web uses
- [ ] Add attachment preview to the submission form on mobile
- [ ] Handle upload progress indicator

**Effort:** 2-3 days.

---

### T2-004: Mobile app store preparation

- [ ] Configure `app.json` with production bundle ID, version, build number
- [ ] Generate production icons and splash screens (1024×1024 for App Store, adaptive icon for Play Store)
- [ ] Configure EAS Build (`eas.json`) for preview and production profiles
- [ ] Set up environment variable injection for API URL per environment (dev/staging/prod)
- [ ] Internal TestFlight / Play Store internal testing track

**Effort:** 1-2 days.

---

## TIER 3 — Production Infrastructure

Nothing ships without this. Currently there is no deployment configuration.

---

### T3-001: Docker and deployment configuration

**Problem:** No `Dockerfile`, no `docker-compose.prod.yml`, no deployment scripts. The app can only run by following README steps manually on a dev machine. This is not production.

**Work:**
- [ ] `Dockerfile` for axis-backend (multi-stage: build → production image)
- [ ] `Dockerfile` for axis-frontend (Next.js standalone output)
- [ ] `docker-compose.prod.yml` with backend, frontend, postgres, and nginx reverse proxy
- [ ] Environment variable documentation (`.env.production.example`)
- [ ] Health check endpoints (backend `/health` already exists — wire it to Docker HEALTHCHECK)
- [ ] Database migration on container start (migrations should run before the app starts serving)

**Target platform:** Railway, Render, or Fly.io — all support Docker, have managed Postgres, zero DevOps overhead for a small team.

**Effort:** 2-3 days.

---

### T3-002: Staging environment

**Problem:** There is no staging environment. Every change goes directly to dev (local) or prod. This is how you break demos.

**Work:**
- [ ] Deploy the Docker build to a staging URL (e.g., `staging.axis.io`)
- [ ] Staging database with the `seed:demo` data loaded
- [ ] Environment variable management: staging `.env` committed to a secrets manager, not a file
- [ ] GitHub Actions: deploy to staging automatically on push to `main`
- [ ] GitHub Actions: deploy to production only on explicit release tag

**Effort:** 1-2 days (mostly configuration).

---

### T3-003: Error monitoring (Sentry)

**Problem:** If something crashes in production, we find out when a user complains. There is no error tracking.

**Work:**
- [ ] Install `@sentry/nestjs` in backend — captures unhandled exceptions, GraphQL errors
- [ ] Install `@sentry/nextjs` in frontend — captures client-side errors, performance spans
- [ ] Install `@sentry/react-native` in mobile — captures native crashes
- [ ] Configure source maps upload in CI so stack traces are readable
- [ ] Set up Sentry alerts (Slack/email on first occurrence of a new error)
- [ ] Scrub PII from error reports (no student names, no emails in breadcrumbs)

**Effort:** 1 day.

---

### T3-004: Structured logging (backend)

**Problem:** Currently using `console.log`. In production, you need structured logs that can be searched, filtered, and correlated.

**Work:**
- [ ] Install `winston` and `nest-winston`
- [ ] Configure JSON log output (level, timestamp, requestId, tenantId, userId)
- [ ] Add request ID propagation via `AsyncLocalStorage` (reuse the existing tenant context pattern)
- [ ] Log all GraphQL mutations at INFO level (operation name, duration, tenantId)
- [ ] Log all errors at ERROR level with full context
- [ ] Suppress stack traces in production (keep message + context, not the full trace)

**Effort:** 1 day.

---

### T3-005: Rate limiting at the API layer

**Problem:** The AI governance module has per-tenant AI rate limiting. But there is no HTTP-level rate limiting on the API. A bot can hammer `/api/auth/login` with credential stuffing at full connection speed.

**Work:**
- [ ] Install `@nestjs/throttler`
- [ ] Global rate limit: 100 req/min per IP for all endpoints
- [ ] Stricter limit on auth endpoints: 10 req/min per IP for `/api/auth/login` and `/api/auth/register`
- [ ] Exempt health check endpoint
- [ ] Return `429 Too Many Requests` with `Retry-After` header

**Effort:** Half a day.

---

## TIER 4 — Go-to-Market Infrastructure

This tier is about converting a product into a business. Do not start this until Tier 1-3 are complete. A half-built product with Stripe billing is not a product — it's a billing system with no value attached.

---

### T4-001: Stripe subscription billing (BIZ-001)

**Plan:** Three tiers.
- **Pilot** (free): 1 institution, 50 users, no custom AI agents, no LTI
- **Institutional** ($X/month): unlimited users, custom agents, LTI, email support
- **Enterprise** (custom): SAML SSO, SIS sync, dedicated support, custom AI governance

**Work:**
- [ ] Stripe account setup, webhook signing secret, product/price IDs
- [ ] `StripeModule` with `StripeService`: `createCustomer`, `createSubscription`, `cancelSubscription`, `getPortalSession`
- [ ] Webhook handlers for `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`
- [ ] `Tenant.subscriptionPlan` and `Tenant.billingStatus` already exist — wire them to Stripe subscription status
- [ ] Feature gating: middleware that checks plan before allowing access to plan-restricted features
- [ ] Billing portal link in admin settings page
- [ ] Subscription management page for tenant admin

**Effort:** 5-7 days.

---

### T4-002: Tenant self-serve onboarding wizard (BIZ-002)

**The flow:** Visitor lands → clicks "Start Free Trial" → creates institution → gets admin account → tours the product in their own tenant.

**Work:**
- [ ] Public `/signup` page with institution name, domain, admin email + password
- [ ] Backend: `POST /api/auth/register-institution` — creates Tenant + admin User in a transaction, assigns Pilot plan
- [ ] Onboarding checklist (already partially built in `enrollment-onboarding-checklist` component) — adapt for institution admins:
  1. Upload course catalog (link to CSV import)
  2. Create your first course
  3. Invite an instructor
  4. Invite students
  5. Try the AI
- [ ] Welcome email sequence (email already works via Resend — add 3 automated emails at day 0, 3, 7)
- [ ] "Quick demo data" button that runs seed:demo for the new tenant

**Effort:** 5-7 days.

---

### T4-003: SAML 2.0 / Institutional SSO (BIZ-003)

Universities use Shibboleth, Azure AD, or Okta. Without SSO, they will not adopt. This is the #1 adoption blocker for enterprise.

**Work:**
- [ ] Install `passport-saml` and configure as a Passport strategy
- [ ] `SamlModule`: SP metadata endpoint, assertion consumer service (ACS), SLO
- [ ] Per-tenant SAML configuration (entityId, SSO URL, certificate, attribute mapping)
- [ ] Admin UI: upload IdP metadata XML → configure attribute mapping → test connection
- [ ] JIT provisioning: user logs in via SAML for the first time → account auto-created with correct role from SAML attribute
- [ ] Session management: SAML sessions vs. JWT sessions — handle logout correctly

**Effort:** 7-10 days. This is the hardest thing in Phase C.

---

### T4-004: LTI Grade Passback — Assignment and Grade Services 2.0 (BIZ-004)

LTI launch exists. But when Axis grades a submission, the grade doesn't flow back to Canvas/Blackboard/Moodle. Without this, instructors have to enter grades twice. That is not acceptable.

**Work:**
- [ ] Implement LTI AGS 2.0 line item management
- [ ] On `SUBMISSION_GRADED` event: if the submission is for an LTI-linked section, send grade back to the platform
- [ ] Handle platform OAuth 2.0 token (client credentials grant, cached and refreshed)
- [ ] Admin/instructor can see LTI grade sync status per submission
- [ ] Handle failures gracefully (retry queue, error notification)

**Effort:** 4-5 days.

---

### T4-005: Parent role — full implementation (Phase C)

This was deferred in T1-003. Now is the time if parent engagement is a selling point.

**Work:**
- [ ] `ParentStudentLink` entity (parentId, studentId, tenantId, permissions JSONB)
- [ ] Admin UI: link parent to student(s)
- [ ] `ParentModule` resolver: `myChildren` → grades per child, upcoming deadlines, attendance (if tracked)
- [ ] Configurable visibility: admin chooses what parents can see (grades only, attendance, AI conversation summaries)
- [ ] Parent notification preferences (weekly digest, grade alerts, missed deadline alerts)
- [ ] `ParentHomeFeed` — actually implemented, not a stub

**Effort:** 5-7 days.

---

## TIER 5 — Advanced Features (After Go-to-Market)

Only start these when you have paying customers giving feedback that drives prioritization.

---

### T5-001: Advanced enrollment features

- ENROLL-007: AI natural language course search ("find me a 3-credit elective on Thursday afternoons")
- ENROLL-008: Bulk enrollment via admin CSV upload
- ENROLL-010: Waitlist intelligence (auto-promote when seat opens, notify waitlisted students)
- ENROLL-011: SIS event-driven sync — Banner/PeopleSoft/Workday pushes enrollment events to Axis

---

### T5-002: Advanced graduation planning

- GRAD-005: Course availability modeling (only-offered-Fall, fills-quickly, low-enrollment-warning)
- GRAD-006: Career-to-curriculum mapping ("I want to be a data scientist" → recommended plan)

---

### T5-003: Attendance tracking

Basic attendance is a common request. Instructors mark attendance per session, students see their attendance record, at-risk detection includes poor attendance.

---

### T5-004: AI-generated rubrics

Instructor creates an assignment → AI proposes a rubric with criteria and point breakdowns → instructor adjusts and saves. FeedbackCopilot uses the stored rubric when generating feedback.

---

### T5-005: SIS two-way sync (full)

Beyond event-driven enrollment: bidirectional sync with Banner, PeopleSoft, Colleague. Full course catalog sync, grade passback to SIS, user identity sync.

---

## ENGINEERING QUALITY — Ongoing, Not a Phase

These are not features. They are the hygiene that prevents the codebase from rotting.

---

### EQ-001: Database migration discipline

- [ ] Every schema change must go through a migration file — no `synchronize: true` exceptions
- [ ] Migrations run in CI as part of the integration test suite
- [ ] Rollback tested for every migration (manually for now, automated later)
- [ ] Migration naming convention: `YYYYMMDD_description.ts`

---

### EQ-002: Integration test coverage gaps

The 22 integration tests cover `CoursesResolver`. The following have NO integration tests:
- `AssignmentsResolver` — grading flows (security-critical)
- `MessagingResolver` — cross-tenant message isolation
- `NotificationsResolver` — permission checks
- `AiResolver` — rate limiting, tenant isolation
- `AnalyticsResolver` — admin-only data access

Each needs a test file with the same 4 categories: auth, authorization, tenant scoping, happy path.

**Effort per resolver:** 1-2 days. Priority order: assignments → messaging → notifications → ai → analytics.

---

### EQ-003: Feed service personalization accuracy

The ML-weighted feed model (5 features) has 14 unit tests. But the tests use mocked data. The model hasn't been validated against real engagement patterns.

- [ ] Add integration test: seed 30 days of fake engagement data → call `studentFeed` → verify high-weight items appear first
- [ ] Document the 5 features and their weights in a comment in `feed.service.ts` (they're implicit right now)
- [ ] Add a way for Shaafi to inspect feed scores during dev (a `?debug=true` query param that shows item scores)

---

### EQ-004: API documentation

The GraphQL schema is the API contract. But there is no documentation for:
- Authentication (how to get a token, cookie vs. Authorization header)
- Multi-tenancy (how tenant scoping works for external integrations)
- Webhook events (LTI, email, push notification payloads)
- Rate limiting headers

Generate from the existing schema using Apollo Studio or graphql-voyager.

---

### EQ-005: Component library / Storybook

As the frontend grows, components are getting hard to develop in isolation. A Storybook instance would allow:
- Developing UI components without a running backend
- Visual regression testing
- Design review without deploying
- Onboarding contributors

This is a nice-to-have, not blocking. Add it when the component count passes 50 (it's approaching that now).

---

## Non-Obvious Judgment Calls

These are decisions that aren't obvious and where being explicit about the reasoning matters.

**Why Faker.js seed:demo is separate from the test seed:** Tests need determinism. A Faker-generated seed with random UUIDs is useless for tests that reference specific records. The two seeds serve different masters and must stay separate.

**Why push notifications before Phase B ships:** Mobile users expect push. If the mobile app ships without push notifications, users disable it within a week. Push is not a nice-to-have for a mobile LMS — it's the product.

**Why SAML before Stripe:** Institutions won't pay for software they can't integrate with their identity provider. If they have to create separate accounts for 500 students, they will not adopt. SAML removes the adoption blocker; Stripe captures the value.

**Why parent role in Tier 4, not Tier 1:** The parent workflow requires a complete feature set (grade visibility, permission controls, notification preferences, admin linking UI). A half-implemented parent role is worse than no parent role — it shows up in demos and fails. Defer until you can ship it properly.

**Why no Row-Level Security (PostgreSQL RLS) yet:** The ROADMAP says "multi-tenant with RLS" but the implementation uses `WHERE tenantId = $1` in application code, not database-level RLS. RLS is the right long-term answer but adding it now would require rewriting every query and every TypeORM entity. The current approach is correct and safe *if* tenant scoping is consistently applied (which SEC-001 addressed). Defer RLS to a dedicated security sprint when there are paying customers to justify the risk.

**Why not a monorepo shared types package yet:** Sharing TypeScript types between backend and frontend/mobile requires either a dedicated package or codegen. The backend uses NestJS GraphQL code-first (types from decorators), and the frontend/mobile use Apollo. The right solution is `graphql-codegen` generating TypeScript types from the schema. This is a 1-day setup task that pays back every time a backend type changes. Add this in EQ phase.

---

## Effort Summary

| Tier | Focus | Estimated Days | Blocks |
|------|-------|---------------|--------|
| T1 | Demo readiness | 10-15 | Everything else |
| T2 | Mobile to shippable | 10-14 | App store launch |
| T3 | Production infrastructure | 5-8 | Any real users |
| T4 | Go-to-market | 25-35 | Revenue |
| T5 | Advanced features | Ongoing | Customer feedback |
| EQ | Engineering quality | Ongoing | Technical debt |

**Realistic time to first paying customer:** 3-4 months of focused work if T1-T4 are done sequentially by one person. 6-8 weeks with two people working in parallel on T2+T3 while T1 is closing out.

---

## What to Do Today

If you only have one day, do **T1-004** (E2E test factory). It's the lowest-effort, highest-leverage task: it makes every future test more reliable without touching any feature code.

If you have a week, do:
1. T1-001 (audit the half-built modules) — 3-5 days
2. T1-004 (test factory) — 1 day
3. T1-002 (real AI demo) — 1 day

After that week, you will know exactly what you're actually shipping vs. what you think you're shipping.

---

*This plan supersedes the priority sections of BACKLOG.md and ROADMAP.md for anything dated before 2026-05-05. Those files remain the source of truth for completed work history.*
