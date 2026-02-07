# NexusEd Backlog

> **Priority levels:** P0 (fix before ANY new features) → P1 (fix before demo) → P2 (fix before production) → P3 (do when capacity allows)
>
> **Status values:** `TODO` | `IN_PROGRESS` | `DONE`
>
> **Rule:** Always work top-down. Don't start a P1 until all P0s are DONE. Don't start a feature until all P0s and P1s are DONE.

---

## P0 — Security & Data Integrity

> These are **blocking**. Any of these could expose user data across tenants or allow unauthorized access. Fix before writing another line of feature code.

### SEC-001: Add tenant scoping to all findById methods
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **Files:** `users.service.ts`, `courses.service.ts`, `assignments.service.ts`
- **Problem:** `findById(id)` queries have no tenant filter. An authenticated user could access another tenant's data by guessing UUIDs.
- **Fix:** Change `findById(id)` → `findById(id, tenantId)` in every service. Update all resolver callers to pass `tenantId` from `@CurrentUser()`.
- **Pattern:**
  ```typescript
  // WRONG
  async findById(id: string): Promise<User> {
    return this.repo.findOneOrFail({ where: { id } });
  }

  // RIGHT
  async findById(id: string, tenantId: string): Promise<User> {
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }
  ```
- **Acceptance:** Every `findById`/`findOne` call in the codebase includes a `tenantId` filter. No service method returns data without tenant scoping.

### SEC-002: Add authorization to assignmentSubmissions query
- **Status:** `DONE`
- **Completed:** 2026-02-07 — Added @Roles guard (INSTRUCTOR/TA/ADMIN) + tenant scoping
- **File:** `assignments.resolver.ts` (line 39-43)
- **Problem:** Any authenticated user can query ALL submissions for ANY assignment. Students can see other students' work.
- **Fix:** Add role check — instructors/TAs see all submissions for their sections; students see only their own.
- **Pattern:**
  ```typescript
  @Query(() => [Submission])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async assignmentSubmissions(
    @CurrentUser() user: User,
    @Args('assignmentId') assignmentId: string,
  ): Promise<Submission[]> {
    // Also verify user teaches the section this assignment belongs to
    return this.assignmentsService.findSubmissionsByAssignment(assignmentId, user);
  }
  ```
- **Acceptance:** Students cannot access `assignmentSubmissions` query. Instructors can only see submissions for assignments in their sections.

### SEC-003: Migrate JWT from localStorage to httpOnly cookies
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **Files:** `auth.controller.ts`, `jwt.strategy.ts`, `main.ts`, `graphql/client.ts`, `auth.store.ts`, `auth-guard.tsx`
- **Problem:** JWT in localStorage is vulnerable to XSS attacks. Any injected script can steal the token.
- **Fix:** Set JWT as httpOnly cookie on login response. Remove localStorage token management. Update Apollo Client to use `credentials: 'include'`. Update Zustand store to remove token persistence.
- **Implementation:**
  - Backend: Added cookie-parser middleware, set httpOnly cookie on login/register, added logout endpoint that clears cookie
  - JWT Strategy: Extracts token from cookie first, falls back to Authorization header for backward compatibility
  - Frontend: Apollo Client uses `credentials: 'include'`, auth store no longer persists token (only user info for UI)
- **Acceptance:** No token in localStorage. No token in JavaScript-accessible storage. Cookie is httpOnly, secure, sameSite: 'lax'. Apollo Client sends cookies automatically.

### SEC-004: Add database indexes to all entities
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **Files:** All `*.entity.ts` in `src/database/entities/` and `src/modules/*/entities/`
- **Problem:** Zero `@Index` decorators on any entity. Every query is a sequential scan. Performance degrades linearly with data size.
- **Fix:** Added `@Index` decorators to all entities:
  - User: `tenantId`, `email+tenantId` (unique composite, also fixes DATA-002)
  - Course: `tenantId`
  - CourseSection: `courseId`, `instructorId`, `termId`
  - Enrollment: `userId`, `sectionId`, `userId+sectionId` (unique), `status`
  - Assignment: `sectionId`, `dueAt`
  - Submission: `assignmentId`, `userId`, `assignmentId+userId`
  - Announcement: `sectionId`, `createdAt`
  - AcademicTerm: `tenantId`, `tenantId+isCurrent`
  - AiConversation: `tenantId`, `userId`, `status`
  - AiMessage: `conversationId`, `createdAt`
  - AiUsageLog: `tenantId`, `userId`, `createdAt`
  - CourseContent: `sectionId`, `tenantId`
  - Conversation: `tenantId`
  - ConversationParticipant: `userId`, `conversationId`
  - DirectMessage: `conversationId`, `createdAt`
- **Acceptance:** Every entity has at least a `tenantId` index. Every foreign key used in WHERE clauses has an index. Explain plans show index usage on all common queries.

---

## P1 — Data Model & Infrastructure

> Important fixes that prevent bugs, data corruption, or frontend crashes. Fix before any demo.

### DATA-001: Add tenantId column to Enrollment, Assignment, Submission, Announcement
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **Files:** `enrollment.entity.ts`, `assignment.entity.ts`, `submission.entity.ts`, `announcement.entity.ts`, service files, resolver files
- **Problem:** These entities lack a direct `tenantId` column. Tenant scoping requires joining through section → course → tenant, which is slow and error-prone.
- **Fix:** Added `@Column() tenantId: string` and `@ManyToOne(() => Tenant) tenant: Tenant` to each entity. Updated all service creation methods to accept and store tenantId. Updated resolvers to pass `user.tenantId` on entity creation.
- **Acceptance:** Every entity in the database has a `tenantId` column. No query needs more than one join to scope by tenant.

### DATA-002: Make email unique constraint per-tenant
- **Status:** `DONE`
- **Completed:** 2026-02-07 (as part of SEC-004)
- **File:** `user.entity.ts`
- **Problem:** `@Column({ unique: true }) email` is globally unique. A user with `john@gmail.com` at University A blocks the same email at University B.
- **Fix:** Removed `unique: true` from `@Column`. Added `@Index(['email', 'tenantId'], { unique: true })` to the entity class.
- **Acceptance:** Same email can exist in different tenants. Same email cannot exist twice in the same tenant.

### DATA-003: Wrap multi-step operations in TypeORM transactions
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **Files:** `messaging.service.ts`
- **Problem:** Multi-step operations (grade + update stats, enroll + create records) don't use transactions. A crash between steps leaves data inconsistent.
- **Fix:** Added TypeORM transactions using `DataSource.createQueryRunner()` for:
  - `getOrCreateConversation`: Creates conversation + 2 participants atomically
  - `sendMessage`: Creates message + updates conversation + updates participant atomically
- **Pattern:** Used queryRunner for explicit transaction control:
  ```typescript
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    // Multiple operations using queryRunner.manager
    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
  ```
- **Acceptance:** Critical multi-step operations in messaging are wrapped in transactions.

### DATA-004: Add Apollo Client InMemoryCache type policies
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **File:** `graphql/client.ts`
- **Problem:** `new InMemoryCache()` with no configuration. Apollo can't correctly merge or deduplicate cached entities. Stale data and incorrect cache updates are likely.
- **Fix:** Added `typePolicies` for all entity types (User, Course, CourseSection, Assignment, Submission, Enrollment, Announcement, Conversation, DirectMessage, AiConversation, AiMessage, CourseContent) with `keyFields: ['id']`. Added field policies for feed queries (`merge: false`) to replace rather than merge arrays.
- **Acceptance:** Apollo DevTools shows correctly normalized cache entries. Mutations that update entities reflect immediately in all views.

### DATA-005: Add Apollo error link for 401 auto-logout
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **File:** `graphql/client.ts`
- **Problem:** When JWT expires, GraphQL queries silently fail. User sees empty states instead of being redirected to login.
- **Fix:** Added `ErrorLink` that checks for 401 status or `UNAUTHENTICATED` GraphQL error, calls `logout()`, and redirects to `/login`. Updated to Apollo Client 4.0 API using `CombinedGraphQLErrors.is()`.
- **Acceptance:** Expired token → automatic redirect to login page with no user confusion.

### DATA-006: Add frontend error boundaries
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **Files:** `(dashboard)/error.tsx`, `(auth)/error.tsx`
- **Problem:** Unhandled React errors crash the entire app with a white screen. No recovery option.
- **Fix:** Added Next.js `error.tsx` files in each route group. Display friendly error message with "Try again" button. Shows error details in development mode.
- **Acceptance:** Any uncaught error in a route group shows a recoverable error page instead of a white screen.

### DATA-007: Fix `as any` casts in feed.service.ts
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **File:** `feed.service.ts`
- **Problem:** `status: 'active' as any` bypasses TypeScript. If the `EnrollmentStatus` enum value changes, this silently breaks.
- **Fix:** Imported and used `EnrollmentStatus.ACTIVE` for enrollments and `SectionStatus.ACTIVE` for sections.
- **Acceptance:** Zero `as any` casts in `feed.service.ts`. All enum references use the imported enum type.

---

## P2 — Architecture

> Structural improvements that make future development faster and more reliable.

### ARCH-001: Create BaseEntity and TenantScopedEntity abstract classes
- **Status:** `TODO`
- **Files:** Create `src/database/entities/base.entity.ts`
- **Problem:** Every entity duplicates `id`, `createdAt`, `updatedAt`. Most duplicate `tenantId` and tenant relation. No enforcement of common patterns.
- **Fix:** Create `BaseEntity` (id, createdAt, updatedAt) and `TenantScopedEntity extends BaseEntity` (tenantId, tenant relation). Have all entities extend one of these.
- **Acceptance:** No entity directly declares `id`, `createdAt`, or `updatedAt`. All tenant-scoped entities extend `TenantScopedEntity`.

### ARCH-002: Global tenant interceptor
- **Status:** `TODO`
- **File:** Create `src/interceptors/tenant.interceptor.ts`
- **Problem:** Every service method manually receives and filters by `tenantId`. Easy to forget, leads to SEC-001-type bugs.
- **Fix:** Create a NestJS interceptor that extracts `tenantId` from the authenticated user and attaches it to a request-scoped context. Services read from context instead of passing `tenantId` as a parameter.
- **Acceptance:** Service methods don't receive `tenantId` as a parameter. Tenant scoping happens automatically at the interceptor level.

### ARCH-003: Remove unused @tanstack/react-query
- **Status:** `TODO`
- **File:** `nexused-frontend/package.json`
- **Problem:** `@tanstack/react-query` is installed but never imported. Adds ~30KB to bundle and confuses contributors.
- **Fix:** `npm uninstall @tanstack/react-query` from the frontend project.
- **Acceptance:** Package removed from `package.json` and `node_modules`. No import references exist.

### ARCH-004: DataLoader for GraphQL N+1 prevention
- **Status:** `TODO`
- **Files:** Create loaders in each module (e.g., `users.loader.ts`, `courses.loader.ts`)
- **Problem:** Nested GraphQL queries generate N+1 database calls. Querying 20 assignments with their sections = 21 queries instead of 2.
- **Fix:** Create DataLoader instances as `@Injectable({ scope: Scope.REQUEST })` providers. Use in `@ResolveField()` methods.
- **Acceptance:** GraphQL queries with nested relations batch database calls. A query for 20 assignments with sections makes 2 database calls, not 21.

### ARCH-005: AI provider abstraction layer
- **Status:** `TODO`
- **Files:** Create `src/modules/ai/providers/ai-provider.interface.ts`, `anthropic.provider.ts`
- **Problem:** Direct `@anthropic-ai/sdk` imports create vendor lock-in. Can't swap providers or add fallbacks without modifying the agentic loop.
- **Fix:** Define `AiProvider` interface with `chat()` and `stream()` methods. Wrap current Anthropic SDK in `AnthropicProvider` class. AgentExecutor depends on interface, not concrete SDK.
- **Acceptance:** No file outside `providers/` imports `@anthropic-ai/sdk`. AgentExecutor works with any `AiProvider` implementation.

### ARCH-006: Switch monorepo to Turborepo + pnpm
- **Status:** `TODO`
- **Files:** Root `package.json`, create `turbo.json`, create `pnpm-workspace.yaml`, update CI workflows
- **Problem:** Sequential builds, no caching, slow CI. `npm run build` rebuilds everything even when nothing changed.
- **Fix:** Install pnpm, configure Turborepo with task pipeline, update GitHub Actions to use pnpm + turbo.
- **Acceptance:** `turbo build` runs backend and frontend in parallel. Cached builds complete in <5 seconds. CI is 50%+ faster.

---

## P3 — Test Foundation

> No tests exist beyond NestJS scaffolding defaults. Build the testing infrastructure before it becomes unmanageable.

### TEST-001: Testing infrastructure setup
- **Status:** `TODO`
- **Files:** Jest config, mock factories, test database config
- **Problem:** Only 1 test file exists (NestJS scaffold default `app.controller.spec.ts`). No mock factories, no test database, no test utilities.
- **Fix:** Configure Jest for both projects. Create entity factory functions. Set up test database (Testcontainers or in-memory). Create reusable test fixtures.
- **Acceptance:** `npm test` runs a real test suite. Test factories can create any entity with sensible defaults. Test database spins up and tears down automatically.

### TEST-002: Unit tests for critical services
- **Status:** `TODO`
- **Targets:** GovernanceService, FeedService, AssignmentsService, CoursesService
- **Why these four:**
  - GovernanceService: AI guardrail — if this is wrong, AI does things it shouldn't
  - FeedService: Feed ranking — if this is wrong, students miss deadlines
  - AssignmentsService: Grading flow — if this is wrong, grades are corrupted
  - CoursesService: Enrollment — if this is wrong, students are in wrong classes
- **Acceptance:** 80%+ coverage on these four services. All edge cases tested (empty results, unauthorized access, invalid input).

### TEST-003: Resolver integration tests
- **Status:** `TODO`
- **Targets:** Guards, roles, tenant scoping at the resolver level
- **Problem:** Unit tests mock the database. Integration tests verify that guards actually block unauthorized access and tenant scoping actually filters data.
- **Acceptance:** Integration tests prove: (1) unauthenticated requests are rejected, (2) wrong-role requests are rejected, (3) cross-tenant data is never returned.

### TEST-004: Playwright E2E for critical user flows
- **Status:** `TODO`
- **Targets:** 5 flows — login, view feed, navigate to course, submit assignment, grade submission
- **Problem:** No automated verification that the full stack works end-to-end.
- **Acceptance:** 5 E2E tests pass reliably in CI. Tests are not flaky (Playwright's auto-waiting helps here).

---

## Feature Backlog

> Ordered by impact. Each feature unlocks user value or market readiness.

### FEAT-001: Build AI Chat UI
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **Priority:** HIGH — The AI backend exists but has no frontend. This is the #1 differentiator and must be demo-able.
- **Files Created:**
  - GraphQL: `lib/graphql/queries/ai.ts`, `lib/graphql/mutations/ai.ts`
  - Components: `components/ai/ai-message-bubble.tsx`, `ai-thinking-indicator.tsx`, `ai-tool-indicator.tsx`, `ai-agent-selector.tsx`, `ai-chat-thread.tsx`, `ai-conversation-list.tsx`, `ai-empty-state.tsx`, `ai-new-conversation.tsx`
  - Page: `app/(dashboard)/ai/page.tsx`
- **Files Modified:** `lib/navigation.ts` — Added AI nav item with Sparkles icon to studentNav and instructorNav
- **Details:** Two-panel chat interface (conversation list + thread) matching messaging page pattern. Agent selector cards, message bubbles with tool indicators, thinking animation, date separators, mobile responsive with list/thread toggle. URL param `?conversation=<id>` for deep linking.
- **Acceptance:** Student can open Study Coach, ask a question about their enrolled course, and get a Socratic response with visible tool usage.

### FEAT-002: Wire AI event listener to invoke agents
- **Status:** `TODO`
- **Priority:** HIGH — Event stubs exist but only log. This is what makes AI proactive.
- **File:** `ai-event.listener.ts`
- **Details:** Replace logging stubs with actual agent invocations:
  - `ENROLLMENT_CREATED` → Study Coach sends welcome message
  - `SUBMISSION_CREATED` → FeedbackCopilot drafts rubric feedback
  - `GRADE_UPDATED` → Check if grade drops below threshold, alert student
  - `ASSIGNMENT_CREATED` → Suggest rubric improvements
- **Acceptance:** Submitting an assignment triggers FeedbackCopilot to draft feedback. Enrolling triggers a Study Coach welcome. These happen asynchronously via BullMQ.

### FEAT-003: Build messaging system (from Session 7 spec)
- **Status:** `DONE`
- **Priority:** HIGH
- **Completed:** 2026-02-07 — Merged in `feat(root): complete Phase 2` commit
- **Details:** Conversation, ConversationParticipant, DirectMessage entities. MessagingService with enrollment-based contacts, cursor pagination, read tracking. Frontend with two-panel layout, conversation list, message thread, new message dialog.

### FEAT-004: Build content builder (from Session 8 spec)
- **Status:** `DONE`
- **Priority:** HIGH
- **Completed:** 2026-02-07 — Merged in `feat(root): complete Phase 2` commit
- **Details:** Content entity with rich text (Tiptap editor), draft/published workflow, integration into course timeline. Instructor creates content → appears as timeline entry.

### FEAT-005: Activate Socket.IO for real-time
- **Status:** `TODO`
- **Priority:** MEDIUM
- **Details:** Socket.IO gateway for messaging (real-time message delivery), feed updates (new items push to client), AI response streaming indicators. Replace polling in conversation list and message thread.
- **Acceptance:** New messages appear instantly without polling. Feed updates push to the client. Connection handles reconnection gracefully.

### FEAT-006: Dashboard as toggleable widgets
- **Status:** `TODO`
- **Priority:** MEDIUM
- **Details:** Feed items as pin/unpin/collapse widgets. Students can customize what appears on their home feed. NOT drag-and-drop (too complex, low ROI). Simple toggle list in settings.
- **Acceptance:** Student can hide announcement widgets, pin deadline widgets. Preferences persist across sessions (stored in user preferences JSONB).

### FEAT-007: Database migrations
- **Status:** `TODO`
- **Priority:** MEDIUM
- **Details:** Disable `synchronize: true`. Generate initial migration from current schema as baseline. All future schema changes via migration files. Add migration commands to package.json.
- **Acceptance:** `npm run migration:generate` creates a migration. `npm run migration:run` applies it. `synchronize: false` in all environments.

### FEAT-008: Admin analytics dashboard
- **Status:** `TODO`
- **Priority:** LOW
- **Details:** Enrollment statistics, grade distributions, AI usage metrics, active users per course. Admin-only view using existing data.
- **Acceptance:** Admin can view institution-wide metrics. Data is accurate and updates in real-time (or near-real-time).

### FEAT-009: PWA setup
- **Status:** `TODO`
- **Priority:** LOW
- **Details:** `manifest.json`, service worker, offline feed cache, install prompt. Mobile students should be able to "install" NexusEd on their home screen.
- **Acceptance:** App is installable on mobile. Offline mode shows cached feed. Push notifications work.

### FEAT-010: WCAG 2.1 AA accessibility
- **Status:** `TODO`
- **Priority:** LOW (but required for institutional sales — DOJ ADA Title II deadline)
- **Details:** Add eslint-plugin-jsx-a11y, skip navigation links, focus management, aria-live regions for feed updates, color contrast audit, keyboard navigation for all interactive elements. Add axe-core to CI.
- **Acceptance:** Zero axe-core violations on all pages. Keyboard-only navigation works for all flows. Screen reader announces feed updates.

### FEAT-011: LTI 1.3 integration
- **Status:** `TODO`
- **Priority:** LOW (but required for institutional adoption)
- **Details:** LTI 1.3 provider using `ltijs` library. Allows NexusEd courses to embed external tools (Turnitin, Kaltura, etc.) and external LMS to embed NexusEd content.
- **Acceptance:** External LTI tool can be launched from within NexusEd. NexusEd can be launched as an LTI tool from Canvas/Brightspace.

### FEAT-012: Per-tenant AI governance console
- **Status:** `TODO`
- **Priority:** LOW (enterprise tier feature)
- **Details:** Admin UI for configuring AI governance per tenant. Set action types per tool, adjust rate limits, set token budgets, view AI audit logs.
- **Acceptance:** Admin can change a tool from "auto" to "suggest" and it takes effect immediately. Usage logs are visible with timestamps and costs.

### FEAT-013: Agent Builder admin UI
- **Status:** `TODO`
- **Priority:** LOW (marketplace potential)
- **Details:** UI for creating custom agents per course. Instructors define system prompts, select tools, set constraints. Agents appear in the student's agent selector.
- **Acceptance:** Instructor can create a custom agent for their course. Student can interact with it. Agent respects governance rules.

### FEAT-014: ML-based feed personalization
- **Status:** `TODO`
- **Priority:** LOW (requires data to train)
- **Details:** Replace rule-based feed ranking with a model trained on user behavior. Track which feed items are clicked, how long users spend, what gets ignored. Use engagement signals to personalize ranking.
- **Acceptance:** Feed order reflects individual user behavior patterns. A/B test shows higher engagement than rule-based ranking.

---

## 10x Differentiators (Already Built — Protect These)

> These are what separate NexusEd from every competitor. Don't remove, simplify, or refactor these unless you fully understand why they exist.

| ID | Gem | Key Files |
|----|-----|-----------|
| GEM-001 | Production-grade agentic loop | `agent-executor.service.ts` |
| GEM-002 | Three-tier AI governance | `governance.service.ts` |
| GEM-003 | Per-tenant AI cost tracking | `usage-tracking.service.ts`, AI entities |
| GEM-004 | Event-driven proactive AI | `ai-event.listener.ts`, `ai-events.ts` |
| GEM-005 | Declarative agent definitions | Agent registry in `ai.module.ts` |
| GEM-006 | Pedagogically defensible Study Coach | Agent definition + governance rules |
| GEM-007 | Feed-first architecture | `feed.service.ts`, `feed.resolver.ts` |
| GEM-008 | Context snapshot (anti-hallucination) | Context service + JSONB column |
| GEM-009 | Tenant entity with SaaS billing | `tenant.entity.ts` |
| GEM-010 | Unified course timeline | Timeline types + frontend components |

---

*Last updated: 2026-02-07 (Session 11 — FEAT-001 AI Chat UI)*
*This file is the primary task reference for all development sessions.*
