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

## Open Questions

1. **Should the course view support both timeline and module views?** Timeline is the default, but some instructors may want to organize by topic/module. Do we support both or commit fully to timeline?

2. **How does the parent role link to student accounts?** Invitation system? Verification? What prevents someone from claiming to be a parent?

3. **Tenant onboarding flow.** How does an institution get set up? Self-serve? Manual? What's the minimum configuration needed?

4. **AI model strategy.** Claude primary, abstraction layer in place — but do we need a local model option for institutions with strict data residency requirements?

---

*Last updated: 2026-02-07 (Phase 2 completion — Messaging + Content Builder merged)*
*Companion documents: [BACKLOG.md](./BACKLOG.md) | [STORY.md](./STORY.md) | [TECH_STACK.md](./TECH_STACK.md)*
