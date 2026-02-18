# NexusEd Development Roadmap

> **Guiding filter:** Does this feature boost growth or eliminate noise? If not, it doesn't belong.
>
> **Task reference:** See [BACKLOG.md](./BACKLOG.md) for the detailed, prioritized task list with file references and acceptance criteria.

---

## Where We Are

### What's Built and Working (Merged to Main)

**Phase 0 — Foundation** ✅
- [x] Next.js 16 + NestJS project scaffolding
- [x] Authentication system (JWT + bcrypt + Google OAuth)
- [x] Multi-tenant foundation (Tenant entity with subscription plans, billing status, RLS)
- [x] Core database entities (9 core + 3 AI = 12 total): Tenants, Users, Academic Terms, Courses, Course Sections, Enrollments, Assignments, Submissions, Announcements, AI Conversations, AI Messages, AI Usage Logs
- [x] GraphQL API with Apollo Server 5
- [x] Tenant CRUD operations
- [x] Login and registration pages
- [x] Base UI components (shadcn/ui)

**Phase 1 — Feed & Navigation** ✅
- [x] Role-based navigation shell (Student, Instructor, Admin, Parent — 3 nav items each)
- [x] Mobile-responsive layout (bottom bar on mobile, sidebar on desktop)
- [x] Student home feed with server-side aggregation and urgency ranking
- [x] Instructor home feed (grading queue, deadline reminders)
- [x] Admin home feed (stat cards)
- [x] Unified course timeline (content + assignments + announcements in one stream)
- [x] Assignment detail view with submission

**Phase 2 — Core Academic** ✅
- [x] Assignment creation (5 types: standard, quiz, exam, discussion, project)
- [x] Assignment submission (text entry)
- [x] Inline grading with rubric support
- [x] Course roster view
- [x] Gradebook with statistics (mean, median, distribution)
- [x] CSV grade export
- [x] Messaging system (DMs, threads, unread badges, enrollment-based contacts)
- [x] Content builder (Tiptap rich text, draft/publish workflow, timeline integration)
- [x] Admin panel (user/term/catalog/enrollment management)
- [x] Bulk operations (extend deadline, send announcement)

**AI Module (Backend Only)** ✅
- [x] AgentExecutor — Production-grade agentic loop with multi-turn tool use
- [x] GovernanceService — Three-tier action types (auto/suggest/blocked) with rate limiting
- [x] UsageTrackingService — Per-tenant AI cost tracking
- [x] ToolRegistry — 16 tools (course, enrollment, assignment, grading, analytics)
- [x] AgentRegistry — Study Coach + Feedback Copilot (declarative definitions)
- [x] AiEventListener — 4 event handler stubs (logging-only, needs FEAT-002 to wire up)
- [x] ContextService — Snapshot system to prevent hallucination
- [ ] No frontend UI for AI features

### Infrastructure Audit Findings (Session 9)

A comprehensive code audit found **4 P0 security issues**, **7 P1 data integrity issues**, and **5 P2 architecture improvements** needed. These are fully documented in [BACKLOG.md](./BACKLOG.md).

**The audit also identified 10 "Hidden Gem" differentiators** — architectural decisions already in the codebase that competitors would need months to replicate. These are documented in [STORY.md](./STORY.md) and protected in the backlog.

---

## Phase 2.5: Infrastructure Hardening ← NEXT

**Estimated:** 1-2 weeks
**Why before features:** FERPA compliance, institutional trust, and data integrity. An LMS that leaks student data across tenants or stores tokens insecurely will never be adopted by a university. Fix the foundation before building the floors.

### Security (P0 — Backlog SEC-001 through SEC-004)
- [ ] Tenant scoping on all findById methods
- [ ] Authorization on assignmentSubmissions query
- [ ] JWT migration from localStorage to httpOnly cookies
- [ ] Database indexes on all entities

### Data Integrity (P1 — Backlog DATA-001 through DATA-007)
- [ ] Add tenantId to Enrollment, Assignment, Submission, Announcement
- [ ] Per-tenant email unique constraint
- [ ] TypeORM transactions for multi-step operations
- [ ] Apollo Client type policies and error link
- [ ] Frontend error boundaries
- [ ] Fix `as any` casts in feed.service.ts

### Architecture Quick Wins (P2 — selected)
- [ ] BaseEntity + TenantScopedEntity abstract classes (ARCH-001)
- [ ] Remove unused @tanstack/react-query (ARCH-003)
- [ ] Turborepo + pnpm monorepo setup (ARCH-006)

### Outcome
Every query is tenant-scoped, authorized, indexed, and transactional. The frontend gracefully handles errors. The monorepo builds in parallel with caching.

---

## Phase 3: Complete Core Experience

**Estimated:** 3-4 weeks
**Goal:** The platform works end-to-end for a real course with AI visible to users.

### AI Chat UI (FEAT-001) — The Differentiator
- [ ] Chat interface with message bubbles and streaming
- [ ] Tool-use indicators (show when AI is looking up grades, checking enrollments)
- [ ] Agent selector (Study Coach vs Feedback Copilot)
- [ ] Conversation history
- [ ] Integration into course view and standalone page

### Messaging System (FEAT-003)
- [ ] Conversation, Participant, Message entities
- [ ] Enrollment-based contact resolution
- [ ] Cursor-based message pagination
- [ ] Read tracking with unread badges
- [ ] Two-panel frontend (list + thread)

### Content Builder (FEAT-004)
- [ ] Content entity with rich text (Tiptap)
- [ ] Draft/published workflow
- [ ] Timeline integration
- [ ] Instructor CRUD (create, edit, publish, unpublish, delete)

### Real-time (FEAT-005)
- [ ] Socket.IO gateway for messaging
- [ ] SSE for AI response streaming
- [ ] Feed push updates

### Dashboard Widgets (FEAT-006)
- [ ] Toggleable feed widgets (pin/unpin/collapse)
- [ ] User preferences persistence

### Test Foundation (TEST-001 through TEST-003)
- [ ] Jest configuration and mock factories
- [ ] Unit tests for GovernanceService, FeedService, AssignmentsService
- [ ] Resolver integration tests for auth and tenant scoping

### Outcome
Students can chat with the Study Coach, message their instructors, view rich content in the timeline, and customize their feed. Instructors can create content and use Feedback Copilot. Critical paths have test coverage.

---

## Phase 4: AI Intelligence Layer

**Estimated:** 3-4 weeks
**Goal:** AI becomes proactive, intelligent, and configurable.

### Wire Event Listeners (FEAT-002)
- [ ] ENROLLMENT_CREATED → Study Coach welcome message
- [ ] SUBMISSION_CREATED → FeedbackCopilot draft feedback
- [ ] GRADE_UPDATED → Threshold alerts
- [ ] ASSIGNMENT_CREATED → Rubric suggestions

### Feed ML Ranking (FEAT-014)
- [ ] Track user engagement signals (clicks, time-on-item, dismissals)
- [ ] Replace rule-based ranking with behavior-based model
- [ ] A/B testing framework

### AI Course Planner (New Agent)
- [ ] Student degree profile: major, completed courses, credits earned
- [ ] Prerequisite chain analysis
- [ ] "What should I take next semester?" recommendations
- [ ] "How many credits until graduation?" calculator
- [ ] "What if I change my major?" scenario modeling

### Instructor AI Tools
- [ ] Syllabus-to-course-structure generator
- [ ] Quiz auto-generation from course content
- [ ] Feedback Copilot UI (review + approve AI-drafted feedback)
- [ ] At-risk student detection (engagement pattern analysis)

### AI Provider Abstraction (ARCH-005)
- [ ] AiProvider interface
- [ ] AnthropicProvider implementation
- [ ] OpenAI fallback provider

### AI Governance Console (FEAT-012)
- [ ] Admin UI for per-tenant AI settings
- [ ] Tool action type configuration
- [ ] Rate limit adjustment
- [ ] Usage and cost dashboards
- [ ] Audit log viewer

### Outcome
AI proactively engages with students. Instructors have AI-assisted tools. Administrators control AI behavior at the institutional level. The AI Course Planner — the feature that started this entire project — is live.

---

## Phase 5: Production & Market Readiness

**Estimated:** 4-6 weeks
**Goal:** Ready for institutional pilots. Performance, accessibility, integrations, and the features that make procurement teams say yes.

### Database & Infrastructure
- [ ] Database migrations — disable synchronize, generate baseline (FEAT-007)
- [ ] NestJS Fastify adapter swap (3x throughput)
- [ ] DataLoader for all GraphQL relations (ARCH-004)
- [ ] Connection pooling
- [ ] Global tenant interceptor (ARCH-002)

### Compliance & Accessibility
- [ ] WCAG 2.1 AA audit and fixes (FEAT-010)
- [ ] FERPA compliance documentation
- [ ] Accessibility linting in CI (axe-core)

### Integrations
- [ ] LTI 1.3 provider + consumer (FEAT-011)
- [ ] SAML 2.0 / institutional SSO
- [ ] Calendar export (iCal)
- [ ] Stripe billing integration

### Mobile & Performance
- [ ] PWA setup (FEAT-009)
- [ ] Lazy loading and code splitting
- [ ] Image optimization for course content

### Analytics & Reporting
- [ ] Admin analytics dashboard (FEAT-008)
- [ ] Student engagement analytics (for instructors)
- [ ] AI usage and impact metrics

### Advanced Features
- [ ] Agent Builder admin UI (FEAT-013)
- [ ] Parent dashboard (child progress, grade notifications)
- [ ] Playwright E2E tests for 5 critical flows (TEST-004)

### Outcome
NexusEd is production-ready, accessible, and integrates with institutional infrastructure. Ready for pilot deployments.

---

## 10x Differentiators

Already built. These create the competitive moat. Competitors would need months to replicate any single one.

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
| 9 | SaaS billing in data model | Business model embedded in the tenant entity. Competitors build billing as an afterthought. |
| 10 | Unified course timeline | Content + assignments + discussions in one stream. Competitors have separate tabs they can't merge without UX redesign. |

> Full narrative: [STORY.md](./STORY.md)

---

## Decisions That Are Locked

These architectural and design decisions are final and should not be revisited:

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
| DataLoader for GraphQL relations | N+1 prevention is mandatory, not optional. |
| Content format = Tiptap | Rich text editor with prose rendering. Decision made. |

---

## Phase 6: Institutional Onboarding & Catalog Management

**Estimated:** 2-3 weeks
**Goal:** An institution can get set up on NexusEd with their full course catalog and degree programs — from AI-assisted PDF import to structured CSV import to manual admin CRUD.

> **Why this phase comes first:** Nothing else works without the data. Enrollment, graduation planning, AI course discovery — all depend on the institution's courses and degree requirements being in the system. This is the foundation for everything in Phase 7 and 8.
>
> **Competitive angle:** DegreeWorks (Ellucian) charges $100k+/year and requires weeks of manual setup. NexusEd's AI-assisted import can onboard an institution's catalog in hours, not weeks. This is the "wow" moment in a sales demo.

### Catalog Data Model (ONBOARD-001)
- [ ] Extend Course entity with catalog-specific fields: credits, department, category (core/elective/gen-ed/lab), description, prerequisite references, corequisites, course level (100-400+), offered semesters (Fall/Spring/Summer)
- [ ] Extend CourseSection with: maxEnrollment (seat capacity), schedule (meeting times/days), location, enrollmentMode (open/invite-only), inviteCode
- [ ] Extend AcademicTerm with: enrollmentWindowStart, enrollmentWindowEnd, dropDeadline, withdrawDeadline
- [ ] Extend DegreeProgram entity (from FEAT-015) with: programType (major/minor/certificate/diploma), department, totalCredits, expectedDuration (in semesters), catalog year

### Admin Catalog CRUD (ONBOARD-002)
- [ ] Backend: `CatalogService` for full course and program management — CRUD, bulk operations, catalog versioning by academic year
- [ ] Frontend: Admin catalog management pages — course list with search/filter, course create/edit forms, department management, prerequisite chain editor (visual or form-based)
- [ ] Frontend: Admin degree program editor — requirement group management (add/remove groups, assign courses to groups, set credit thresholds)

### CSV Catalog Import (ONBOARD-003)
- [ ] Backend: CSV parser for standard templates: `courses.csv` (code, title, credits, department, prerequisites, description), `programs.csv` (name, type, department, total credits, requirements), `prerequisites.csv` (course_code, prerequisite_code, min_grade)
- [ ] Backend: Bulk validation with detailed error reporting (row-by-row errors: "Row 42: CS 301 lists prerequisite CS 201 which doesn't exist in the import")
- [ ] Backend: Import as transaction — all-or-nothing with rollback on failure
- [ ] Frontend: Admin import wizard — upload CSV → preview parsed data → review errors → confirm import
- [ ] Template downloads for each CSV type

### AI-Assisted Catalog Import (ONBOARD-004) — THE DIFFERENTIATOR
- [ ] Backend: PDF/document parsing endpoint — accept academic calendar PDF, course catalog PDF, or plain text
- [ ] Backend: AI extraction pipeline — use Claude to extract structured course data from unstructured documents:
  - Course code, title, credits, description, prerequisites (parse "Prerequisite: CS 101 or permission of instructor")
  - Degree requirements (parse "Complete 15 credits from the following: CS 301, CS 302, CS 310, CS 315, CS 320")
  - Program definitions (parse "Bachelor of Science in Computer Science — 120 credits")
- [ ] Backend: Extraction review queue — AI extracts, admin reviews/corrects, then confirms import
- [ ] Frontend: "Import from Document" wizard — upload PDF → AI processes → review extracted data in editable table → fix errors → confirm
- [ ] **This is the sales demo feature** — "Upload your academic calendar, and NexusEd sets itself up"

### Outcome
An institution can onboard in hours: upload their academic calendar PDF → AI extracts courses and programs → admin reviews and confirms → catalog is live. Alternatively, use CSV import or manual entry. All degree programs and prerequisites are modeled for the graduation planner.

---

## Phase 7: Student Enrollment & Course Discovery

**Estimated:** 3-4 weeks (3 sub-phases)
**Goal:** Students can discover, enroll in, and get onboarded into courses — from self-serve to AI-assisted to institutional-scale.

> **Why this matters:** Every LMS has enrollment, but none have AI-native enrollment. Canvas uses CSV imports, Moodle uses manual enrollment plugins, Google Classroom uses invite codes. NexusEd can be the first LMS where a student says "I need a 3-credit elective that counts toward my CS degree" and the AI finds, recommends, and enrolls them — all in one conversation.

### Phase 7A: Working Enrollment (ENROLL-001 through ENROLL-004)
**Goal:** Students can find and join courses. Instructors and admins control who gets in.

- [ ] **Course Catalog** (ENROLL-001) — Browseable, searchable, filterable catalog of courses available for the current term. Tenant-scoped. Students can view course details (instructor, schedule, seats, prerequisites) before enrolling.
- [ ] **Self-Enrollment + Invite Codes** (ENROLL-002) — Two enrollment modes per section, configurable by instructor/admin:
  - **Open enrollment:** Student clicks "Enroll" from the catalog
  - **Invite-only:** Student enters a 6-character alphanumeric code generated by the instructor
  - Enrollment creates a `pending` enrollment record → instructor can auto-approve or manually approve
- [ ] **Enrollment Lifecycle** (ENROLL-003) — Full status machine: `pending` → `active` → `completed` | `dropped` | `withdrawn`. Drop/withdraw deadlines configurable per term. Students can drop courses before the deadline. Instructors can remove students. Admins can override any status.
- [ ] **Enrollment Notifications & Onboarding** (ENROLL-004) — When enrollment status changes to `active`:
  - Feed item: "You're enrolled in CS 101!"
  - Study Coach welcome message (already wired via FEAT-002 event listener)
  - Course appears in student's sidebar navigation
  - Student sees course timeline from day 1

### Phase 7B: AI-Assisted Enrollment (ENROLL-005 through ENROLL-007)
**Goal:** The Course Planner agent (FEAT-015) can enroll students, not just recommend courses.

- [ ] **Enroll-from-AI** (ENROLL-005) — New AI tool `enroll_in_course` that checks prerequisites, seat availability, and enrollment policy, then creates the enrollment. Governance default: `suggest` (AI recommends, student confirms).
- [ ] **Proactive Prerequisite Alerts** (ENROLL-006) — When a student tries to enroll in a course with unmet prerequisites, show what's missing and suggest alternative paths. Configurable enforcement: strict, warn, or off.
- [ ] **Smart Course Discovery** (ENROLL-007) — New AI tool `discover_courses` for natural language queries: "I need a 3-credit lab science", "What counts toward my CS electives?", "Morning classes on MWF". Cross-references degree requirements.

### Phase 7C: Institutional Scale (ENROLL-008 through ENROLL-011)
**Goal:** Universities can bulk-manage enrollment at scale with policy enforcement.

- [ ] **Bulk Enrollment** (ENROLL-008) — Admin CSV upload for bulk enroll/move/drop with error reporting
- [ ] **Enrollment Policy Engine** (ENROLL-009) — Per-tenant policies: capacity limits, enrollment windows, prerequisite enforcement, credit hour limits per term
- [ ] **Waitlist Intelligence** (ENROLL-010) — Auto-promotion from waitlist on drops, configurable confirmation window, position tracking
- [ ] **SIS Event-Driven Sync** (ENROLL-011) — Webhook receiver for Banner/PeopleSoft/Workday Student enrollment events

### Outcome
Students can self-enroll from a catalog, use invite codes, or ask the AI Course Planner to find and enroll them in courses. Institutions can bulk-manage enrollment with policy enforcement, waitlists, and SIS integration. NexusEd becomes the first LMS with AI-native enrollment.

---

## Phase 8: AI Graduation Planner

**Estimated:** 3-4 weeks
**Goal:** Every student gets a personalized, semester-by-semester graduation roadmap that adapts to their timeline, finances, and life circumstances.

> **Product thesis:** This is a stronger product than the LMS itself. Many universities already have Canvas/Moodle but hate their degree audit tool (DegreeWorks) or don't have one. NexusEd can be "the AI-native graduation planner that also has an LMS built in."
>
> **Why this is different from FEAT-015:** The existing Course Planner (FEAT-015) tracks progress and checks prerequisites. This phase generates a **complete semester-by-semester plan** that accounts for constraints — time, money, course availability, and life changes.

### Constraint-Based Plan Generator (GRAD-001)
- [ ] Backend: `GraduationPlannerService` that models planning as constraint satisfaction:
  - **Inputs:** completed courses, target degree, max credits per semester, target graduation date (or "ASAP"), available semesters (include/exclude summer, specific terms off), course availability by semester
  - **Constraints:** prerequisites must be satisfied before scheduling, max credits per term, course availability (CS 301 only offered in Fall), corequisites scheduled in same term
  - **Output:** Ordered list of semesters, each with assigned courses, credit totals, and cumulative progress
  - **Algorithm:** Topological sort of prerequisite DAG → greedy bin-packing into semesters respecting constraints → backtrack if infeasible
- [ ] Backend: `GraduationPlannerResolver` — `generateGraduationPlan(input)`, `regeneratePlan(planId, changedConstraints)`
- [ ] Frontend: Graduation plan view — semester columns/rows showing assigned courses, drag-to-reorder (stretch), "what if I skip Summer 2027?" instant replan

### Dynamic Replanning (GRAD-002)
- [ ] Backend: When a student's situation changes, replan automatically:
  - Failed a course → re-insert into a future semester, cascade downstream prerequisites
  - Dropped a course → rebalance remaining semesters
  - Changed major → simulate credit transfer, generate new plan with remaining requirements
  - Changed max credits/semester → stretch or compress the timeline
  - Took a semester off → shift everything forward
- [ ] Frontend: "What if..." controls — toggle summer terms, adjust credits per semester, change target graduation date → plan regenerates in real time
- [ ] AI integration: Course Planner agent can call `regenerate_graduation_plan` tool when student describes a change in conversation

### Financial Projections (GRAD-003)
- [ ] Backend: Per-tenant tuition configuration: per-credit cost, flat-rate thresholds (e.g., 12-18 credits = same price), summer premium, fees
- [ ] Backend: Financial calculations per plan: estimated cost per semester (credits × rate), cumulative total, cost of extending by N semesters, full-time vs part-time cost comparison
- [ ] Frontend: Financial overlay on graduation plan — cost per semester, running total, comparison view:
  - "15 credits/semester → graduate May 2028 → est. $48,000 total"
  - "9 credits/semester → graduate Dec 2029 → est. $54,000 total (3 extra semesters × $6,000)"
  - "If you take 15 credits this Fall instead of 12, you graduate one semester earlier and save ~$6,000"
- [ ] AI integration: Course Planner can answer "How much will it cost if I go part-time next year?"

### Financial Aid Awareness (GRAD-004)
- [ ] Backend: Financial aid rules per tenant (configurable): full-time credit threshold (typically 12), minimum credits for aid eligibility, maximum timeframe (150% of program length)
- [ ] Frontend: Warnings when plan triggers aid issues:
  - "Dropping below 12 credits in Fall 2027 may affect your financial aid eligibility"
  - "You're at 140% of program length — check with financial aid office about SAP (Satisfactory Academic Progress)"
- [ ] AI integration: Proactive alerts when a student's plan change would affect aid status

### Course Availability Modeling (GRAD-005)
- [ ] Backend: Course offering patterns — historical/configured data on which courses are offered in which semesters (Fall only, Spring only, every semester, alternating years)
- [ ] Backend: Seat availability forecasting — based on historical enrollment data, flag courses likely to fill up early
- [ ] Frontend: Availability indicators in the plan view — "CS 301 is only offered in Fall" (info), "CS 450 fills up fast — enroll early" (warning)
- [ ] Admin UI: Course offering schedule management — set availability patterns per course

### Career-to-Curriculum Mapping (GRAD-006) — FUTURE DIFFERENTIATOR
- [ ] Backend: Career profile definitions — job titles mapped to recommended degree programs, skills, and course clusters
- [ ] AI integration: Student says "I want to be a data scientist" → AI maps to relevant programs (CS, Stats, Data Science), identifies skill gaps, suggests course sequences that build toward that career
- [ ] Frontend: Career explorer — browse careers, see required skills, see which NexusEd programs align
- [ ] This is the "what do I want to be when I grow up?" feature Shaafi described

### Outcome
Every student has a personalized graduation roadmap. A student who can only afford 9 credits/semester sees a 5.5-year plan with cost estimates. A transfer student with 60 credits sees a 2-year plan. When life changes (failed course, changed major, took a semester off), the plan regenerates instantly. Financial impact is visible at every decision point. NexusEd becomes the AI-native DegreeWorks killer — 10x better UX, 10x cheaper, and actually intelligent.

---

## Open Questions

1. **Should the course view support both timeline and module views?** Timeline is the default, but some instructors may want to organize by topic/module. Do we support both or commit fully to timeline?

2. **How does the parent role link to student accounts?** Invitation system? Verification? What prevents someone from claiming to be a parent?

3. **AI model strategy.** Claude primary, abstraction layer in place — but do we need a local model option for institutions with strict data residency requirements?

---

*Last updated: 2026-02-17 (Phase 6-8 — Institutional Onboarding, Enrollment, and Graduation Planner)*
*Companion documents: [BACKLOG.md](./BACKLOG.md) | [STORY.md](./STORY.md) | [TECH_STACK.md](./TECH_STACK.md)*
