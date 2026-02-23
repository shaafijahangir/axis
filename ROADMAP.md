# NexusEd Development Roadmap

> **Guiding filter:** Does this feature boost growth or eliminate noise? If not, it doesn't belong.
>
> **Task reference:** See [BACKLOG.md](./BACKLOG.md) for the detailed, prioritized task list with file references and acceptance criteria.

---

## Where We Are

### Completed Phases

**Phase 0 — Foundation** ✅
- [x] Next.js 16 + NestJS project scaffolding
- [x] Authentication system (JWT httpOnly cookies + bcrypt + Google OAuth)
- [x] Multi-tenant foundation (Tenant entity with subscription plans, billing status)
- [x] Core database entities (28 total): Tenants, Users, Academic Terms, Courses, Course Sections, Enrollments, Assignments, Submissions, Announcements, AI Conversations, AI Messages, AI Usage Logs, TenantAiConfig, CustomAgent, DegreeProgram, StudentDegreeProfile, GraduationPlan, Conversation, ConversationParticipant, DirectMessage, CourseContent, FeedEngagement, LtiPlatform, LtiDeployment, LtiContext, LtiUser, LtiState, BaseEntity, TenantScopedEntity
- [x] GraphQL API with Apollo Server 5
- [x] Login and registration pages
- [x] Base UI components (shadcn/ui)

**Phase 1 — Feed & Navigation** ✅
- [x] Role-based navigation shell (Student, Instructor, Admin, Parent — 3 nav items each)
- [x] Mobile-responsive layout (bottom bar on mobile, sidebar on desktop)
- [x] Student home feed with ML-weighted personalization (5-feature model)
- [x] Instructor home feed (grading queue, deadline reminders)
- [x] Admin home feed (stat cards)
- [x] Unified course timeline (content + assignments + announcements in one stream)
- [x] Assignment detail view with submission
- [x] Toggleable dashboard widgets with user preference persistence

**Phase 2 — Core Academic** ✅
- [x] Assignment creation (5 types: standard, quiz, exam, discussion, project)
- [x] Assignment submission (text entry)
- [x] Inline grading with rubric support
- [x] Course roster view
- [x] Gradebook with statistics (mean, median, distribution)
- [x] CSV grade export
- [x] Messaging system (DMs, real-time Socket.IO, typing indicators, unread badges, enrollment-based contacts)
- [x] Content builder (Tiptap rich text, draft/publish workflow, timeline integration)
- [x] Admin panel (user/term/catalog/enrollment management)
- [x] Bulk operations (extend deadline, send announcement)

**Phase 2.5 — Infrastructure Hardening** ✅
- [x] SEC-001–004: All P0 security fixes (tenant scoping, auth on queries, httpOnly JWT, database indexes)
- [x] DATA-001–007: All P1 data integrity fixes (tenantId on all entities, per-tenant email, transactions, Apollo type policies, error boundaries)
- [x] ARCH-001–006: All P2 architecture (base entities, tenant interceptor, DataLoader verification, AI provider abstraction, remove unused deps, Turborepo + pnpm)
- [x] TEST-001–004: Testing foundation (117 unit tests, 22 integration tests, Playwright E2E for 5 critical flows)

**Phase 3 — AI Intelligence Layer** ✅
- [x] FEAT-001: AI Chat UI (two-panel, agents, tool indicators, conversation history)
- [x] FEAT-002: Wired event listeners (enrollment → welcome, submission → feedback draft, low grade → support)
- [x] FEAT-005: Socket.IO real-time messaging
- [x] FEAT-006: Dashboard toggleable widgets
- [x] FEAT-012: Per-tenant AI governance console (tool permissions, rate limits, budgets, audit log)
- [x] FEAT-013: Agent Builder (instructors create custom agents via UI)
- [x] FEAT-014: ML-based feed personalization (5-feature weighted model, engagement tracking)
- [x] FEAT-015: AI Course Planner agent (degree progress, eligible courses, what-if simulator)

**Phase 4 — Production & Compliance** ✅
- [x] FEAT-007: Database migration infrastructure (synchronize: false, CLI commands)
- [x] FEAT-008: Admin analytics dashboard (institution-wide metrics, at-risk students)
- [x] FEAT-009: PWA setup (manifest, service worker, install prompt, offline page)
- [x] FEAT-010: WCAG 2.1 AA accessibility (axe-core enforcement, reduced motion, high contrast, focus management)
- [x] FEAT-011: LTI 1.3 integration (OIDC login, JWT verification, user provisioning, role mapping)

**Phase 5 — Institutional Onboarding** ✅
- [x] ONBOARD-001: Catalog data model extensions (credits, prerequisites, corequisites, schedule, seat capacity, enrollment modes)
- [x] ONBOARD-002: Admin catalog CRUD (course management, degree program editor, department management)
- [x] ONBOARD-003: CSV catalog import (template downloads, validation pipeline, transactional import)
- [x] ONBOARD-004: AI-assisted catalog import from PDF documents (Claude extraction, review queue)

**Phase 6 — Student Enrollment** ✅ (ENROLL-001–006)
- [x] ENROLL-001: Course catalog (browse, search, filter, seat availability)
- [x] ENROLL-002: Self-enrollment + invite codes (two enrollment modes)
- [x] ENROLL-003: Enrollment lifecycle (status machine: pending → active → completed/dropped/withdrawn)
- [x] ENROLL-004: Enrollment notifications & onboarding checklist
- [x] ENROLL-005: Enroll-from-AI (Course Planner can enroll students via tool)
- [x] ENROLL-006: Proactive prerequisite alerts (strict/warn/off enforcement modes)

**Phase 7 — AI Graduation Planner** ✅ (in branch, pending merge)
- [x] GRAD-001: Constraint-based plan generator (topological sort + greedy bin-packing)
- [x] GRAD-002: Dynamic replanning with diff view (what-if controls)
- [x] GRAD-003: Financial projections (per-credit/flat-rate, cost overlay on roadmap)
- [x] GRAD-004: Financial aid awareness (SAP warnings, full-time threshold alerts)

---

## Current Phase: Phase A — Complete Web Platform ← NOW

**Estimated:** 4-5 weeks
**Goal:** Fill remaining gaps so the backend API is complete and the mobile app can build against a stable, feature-complete API. Also add a minimal public-facing presence so the product is discoverable.

> **Why this phase:** The mobile app (Phase B) will consume the same GraphQL API. Every feature we add here — file uploads, notifications, discussions, quizzes — is automatically available to the mobile app. Building this first means the mobile app doesn't block on backend work.

### A1: Merge Graduation Planner Branch ✅
- [x] GRAD-001–004 already merged to main (commits on main branch)
- **Completed:** 2026-02-23

### A2: File Upload Service (Cloudflare R2) — INFRA-001 ✅
- [x] `uploads` module with presigned URL two-phase upload (request → PUT to R2 → confirm)
- [x] `FileUpload` entity (key, originalName, mimeType, size, context, contextId, confirmed, tenantId)
- [x] Per-context validation constraints (size limits + allowed mime types for 4 contexts)
- [x] Frontend: `FileUpload` drag-and-drop component with XHR progress tracking
- [x] Frontend: `FileAttachmentList` component with presigned download URLs
- [x] Integrated into assignment submission form
- [x] `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` — R2/S3 interchangeable
- **Completed:** 2026-02-23

### A3: Email Notification Service — INFRA-002 ✅
- [x] Resend SDK integration via `NotificationsModule`
- [x] Event-driven: `SUBMISSION_GRADED` → email student, `ASSIGNMENT_CREATED` → email section, `ENROLLMENT_CREATED` → email student
- [x] Due date reminders cron (8am + 6pm UTC, skips already-submitted assignments)
- [x] HTML email templates with NexusEd branding (inline styles, email-client compatible)
- [x] User notification preferences stored in user.preferences JSONB (5 toggle types)
- [x] Settings page at `/settings` with toggle UI; "Settings" added to user menu
- **Completed:** 2026-02-23

### A4: Push Notification Infrastructure — INFRA-003
- [ ] Notification entity (userId, type, title, body, read, data)
- [ ] User device token storage (web push VAPID + FCM for mobile later)
- [ ] Backend provider abstraction (web push now, FCM added in Phase B)
- [ ] Web push via VAPID keys (builds on existing PWA service worker handlers)
- [ ] Notification inbox page (bell icon in nav)
- **Effort:** 3-4 days

### A5: Discussion Threads — FEAT-016
- [ ] `Discussion` + `DiscussionReply` entities (threaded, tenant-scoped, on course timeline)
- [ ] @mentions with notification triggers
- [ ] Instructor pinning, locking, marking as answered
- [ ] Frontend: discussion view in timeline, reply threading, inline reply form
- **Effort:** 4-5 days

### A6: Quiz Engine — FEAT-017
- [ ] MCQ question builder for instructors (question text, options, correct answer, points)
- [ ] Quiz delivery UI for students (one question at a time or all-at-once, configurable)
- [ ] Auto-grading on submission
- [ ] Attempt tracking with configurable max attempts
- [ ] Optional time limits with countdown
- **Effort:** 5-6 days

### A7: Mobile Responsive Audit — MOB-001 through MOB-005
- [ ] Dashboard layouts at 375-428px
- [ ] Course/assignment pages at mobile
- [ ] AI chat and messaging two-panel collapse
- [ ] Admin pages on tablet/phone
- [ ] Touch interaction polish (44px tap targets)
- **Effort:** 3-4 days

### A8: Marketing & Public Pages — SITE-001 through SITE-003
- [ ] SITE-001: Landing page at `/` (hero, problem statement, feature showcase, CTA)
- [ ] SITE-002: Features page at `/features` (detailed breakdowns of 10x differentiators)
- [ ] SITE-003: About page at `/about` (the UVic story from MISSION.md, team, contact form)
- [ ] `(marketing)` route group in existing Next.js app — public, no auth required
- [ ] Responsive, accessible, shares existing Tailwind design system
- **Effort:** 3-4 days

### Outcome
The web platform is feature-complete for a working LMS demo. Students can upload files, receive email/push notifications, participate in discussions, take quizzes, and view grades — all on mobile-responsive layouts. The product has a public face that anyone can visit.

---

## Phase B: React Native Mobile App (Expo)

**Estimated:** 5-6 weeks
**Goal:** A focused student mobile app with the 20% of features students use 80% of the time.

> **Architecture:** `nexused-mobile/` in the monorepo. Shared GraphQL schema and TypeScript types from the backend. Expo Router for navigation. Apollo Client for data fetching. Socket.IO for real-time messaging. expo-secure-store for token storage. Firebase Cloud Messaging for push.
>
> **Scope:** Students only. Instructors and admins use the web app. The mobile app is for checking grades, reading the feed, submitting assignments, messaging, and talking to AI.

### B1: Project Setup — MOB-APP-001
- [ ] Expo + Expo Router project in `nexused-mobile/`
- [ ] Apollo Client mobile configuration (credentials, token from secure storage)
- [ ] Shared GraphQL types from backend
- [ ] Secure token storage (expo-secure-store)
- [ ] Biometric auth (Face ID / fingerprint unlock)

### B2: Auth Flow — MOB-APP-002
- [ ] Login screen, register screen
- [ ] Biometric unlock for returning users
- [ ] Persistent session with secure token refresh

### B3: Feed / Home — MOB-APP-003
- [ ] AI-prioritized feed (same GraphQL query as web)
- [ ] Pull-to-refresh
- [ ] Tap to navigate to assignment/course/message

### B4: Courses — MOB-APP-004
- [ ] Course list (enrolled courses)
- [ ] Course detail with section selector
- [ ] Timeline view (assignments + content + announcements)

### B5: Assignments — MOB-APP-005
- [ ] Assignment detail view
- [ ] Text submission + camera photo upload + file upload (via R2 presigned URLs)
- [ ] Submission history with grades

### B6: Grades — MOB-APP-006
- [ ] Grades summary across all courses
- [ ] Per-course grade breakdown

### B7: Messages — MOB-APP-007
- [ ] Conversation list with unread badges
- [ ] Message thread with real-time (Socket.IO)
- [ ] New message compose

### B8: AI Chat — MOB-APP-008
- [ ] Agent selection
- [ ] Conversation thread with tool indicators
- [ ] Quick-access from feed items

### B9: Push Notifications — MOB-APP-009
- [ ] Firebase Cloud Messaging (FCM) integration
- [ ] Device token registration with backend
- [ ] Notification inbox with badge counts
- [ ] Deep linking from notifications to relevant screens

### B10: Profile & Settings — MOB-APP-010
- [ ] Profile view/edit
- [ ] Notification preferences
- [ ] Theme selection (light/dark)

### Outcome
Students have a native iOS + Android app for their daily LMS interactions. Push notifications for grades, due dates, and messages. Camera uploads for assignments. AI chat on the go.

---

## Phase C: Go-to-Market Infrastructure (When Ready)

**Estimated:** 4-6 weeks
**Goal:** Everything needed for institutional pilots, fundraising, or paid adoption.

> **Deferred until the product is solid.** These are business infrastructure, not product features. The product must be complete and tested before we build the sales funnel.

### C1: Stripe Billing — BIZ-001
- [ ] Subscription plans (Free pilot, Institutional, Enterprise)
- [ ] Stripe Checkout integration
- [ ] Plan enforcement (feature gating per tier)
- [ ] Invoice generation and billing portal
- [ ] Webhook handlers for subscription lifecycle

### C2: Tenant Self-Serve Onboarding — BIZ-002
- [ ] "Create your institution" wizard (institution name, domain, admin account)
- [ ] Default plan assignment
- [ ] Welcome email sequence
- [ ] Quick-start guide (upload catalog, create first course, invite students)

### C3: SAML 2.0 / Institutional SSO — BIZ-003
- [ ] SAML 2.0 Service Provider implementation
- [ ] IdP metadata import (Shibboleth, Azure AD, Okta)
- [ ] Attribute mapping (email, name, roles)
- [ ] Per-tenant SSO configuration
- [ ] JIT user provisioning from SAML assertions

### C4: LTI Grade Passback (AGS) — BIZ-004
- [ ] Assignment and Grade Services 2.0 implementation
- [ ] Grades assigned in NexusEd flow back to Canvas/Blackboard/Moodle gradebook
- [ ] Line item management

### C5: Advanced Enrollment Features
- [ ] ENROLL-007: Smart course discovery (AI natural language search)
- [ ] ENROLL-008: Bulk enrollment (admin CSV upload)
- [ ] ENROLL-009: Enrollment policy engine
- [ ] ENROLL-010: Waitlist intelligence
- [ ] ENROLL-011: SIS event-driven sync (Banner/PeopleSoft/Workday)

### C6: Advanced Graduation Planning
- [ ] GRAD-005: Course availability modeling (only-offered-Fall, fills-quickly flags)
- [ ] GRAD-006: Career-to-curriculum mapping ("I want to be a data scientist" → plan)

### C7: Parent Role (Functional)
- [ ] Parent-student linking mechanism
- [ ] Parent dashboard (child's grades, upcoming deadlines, activity summary)
- [ ] Configurable visibility (what parents can/can't see)

### Outcome
NexusEd is commercially ready. Universities can self-onboard, pay for subscriptions, use institutional SSO, and integrate with their existing LMS via LTI. The product has a sales funnel from landing page → demo → onboarding → paid.

---

## 10x Differentiators

Already built. These create the competitive moat.

| # | Differentiator | Why Competitors Can't Copy |
|---|---------------|---------------------------|
| 1 | Production-grade agentic loop | Requires rearchitecting their entire AI layer. Chatbot wrappers can't become agentic loops without a rewrite. |
| 2 | Three-tier AI governance | Governance must be designed in, not bolted on. Retrofitting auto/suggest/blocked into existing systems breaks their APIs. |
| 3 | Per-tenant AI cost tracking | Requires tenantId propagation through every AI call. Single-tenant architectures can't add this without restructuring. |
| 4 | Event-driven proactive AI | Requires an event bus through every module. Adding events to a monolithic LMS means touching every feature. |
| 5 | Declarative agent definitions | New agent = 30 lines of config. Competitors need engineering sprints to add each new AI feature. |
| 6 | Pedagogically defensible Study Coach | Socratic enforcement at the architecture level. Other AI tutors just prompt-engineer and hope. |
| 7 | Feed-first architecture | The entire UX is built around the feed. Competitors have dashboards they'd need to replace, not supplement. |
| 8 | Context snapshot | Anti-hallucination by design. Other systems query live data, which changes between AI turns. |
| 9 | Constraint-based graduation planner | Semester-by-semester plan with financial projections and aid awareness. DegreeWorks killer. |
| 10 | Unified course timeline | Content + assignments + discussions in one stream. Competitors have separate tabs they can't merge without UX redesign. |
| 11 | AI-assisted institutional onboarding | Upload a PDF academic calendar → AI extracts your entire course catalog. No competitor does this. |
| 12 | AI-native enrollment | "Enroll me in a 3-credit elective" in conversation. First LMS where enrollment is AI-powered. |

> Full narrative: [STORY.md](./STORY.md)

---

## Decisions That Are Locked

| Decision | Rationale |
|----------|-----------|
| Feed-first UX | The home feed is the product. Not a dashboard, not a file browser. |
| 3 nav items per role (max 4 for admin) | If we need more, the information architecture is wrong. |
| Unified course timeline | Content + assignments + discussions in one stream. No separate tabs. |
| TA is a scoped instructor, not a separate role | Reduces complexity. Permission scope, not role proliferation. |
| AI is infrastructure | The priority engine runs the feed. AI isn't a sidebar feature. |
| Multi-tenant with RLS | Schema-per-tenant + PostgreSQL Row-Level Security. Proven pattern. |
| Mobile-first | Every feature is designed for phones first, desktop second. |
| No standalone notification center | The feed *is* the notification center. Bell icon for quick glance only. |
| No standalone announcements page | Announcements are feed items and course timeline entries. |
| No standalone discussions section | Discussions live inside the course timeline. |
| Dashboard = toggleable widgets | Pin/unpin/collapse. Not drag-and-drop (too complex, low ROI). |
| httpOnly cookies for JWT | Not localStorage. Security is non-negotiable. |
| Database indexes on every entity | Performance is not optional. Every entity gets `@Index`. |
| tenantId on every data entity | Denormalization is correct here. No multi-join tenant scoping. |
| AI provider abstraction | No direct SDK imports in feature code. Go through the abstraction. |
| Content format = Tiptap | Rich text editor with prose rendering. Decision made. |
| File storage = Cloudflare R2 | S3-compatible, zero egress fees. If we move to S3 later, it's a config change. |
| Mobile app = React Native (Expo) in monorepo | Shared GraphQL types, same backend, one CI pipeline. Student-focused. |
| Web app = power users (instructors, admins) | Mobile handles the 20% of features students use 80% of the time. |

---

*Last updated: 2026-02-21 (Restructured into Phase A/B/C based on commercial readiness assessment)*
*This file is the strategic overview. See [BACKLOG.md](./BACKLOG.md) for detailed task specs.*
