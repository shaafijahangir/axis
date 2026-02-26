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
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **Files:** Created `src/database/entities/base.entity.ts`, updated 11 entities
- **Problem:** Every entity duplicates `id`, `createdAt`, `updatedAt`. Most duplicate `tenantId` and tenant relation. No enforcement of common patterns.
- **Fix:** Created `BaseEntity` (id, createdAt, updatedAt) and `TenantScopedEntity extends BaseEntity` (tenantId, tenant relation).
- **Updated entities:**
  - `BaseEntity`: Tenant, CourseSection
  - `TenantScopedEntity`: User, Course, AcademicTerm, Enrollment, Assignment, Submission, Announcement, AiConversation, Conversation
  - Log entities (unchanged - only have createdAt): AiMessage, AiUsageLog, DirectMessage, ConversationParticipant
- **Acceptance:** No entity directly declares `id`, `createdAt`, or `updatedAt`. All tenant-scoped entities extend `TenantScopedEntity`.

### ARCH-002: Global tenant interceptor
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **Files:** Created `src/tenant/tenant-context.ts`, `src/tenant/tenant.interceptor.ts`
- **Problem:** Every service method manually receives and filters by `tenantId`. Easy to forget, leads to SEC-001-type bugs.
- **Fix:** Created TenantContext (AsyncLocalStorage) and TenantInterceptor. Services can now inject TenantContext and call getTenantId(). Updated AnnouncementsService as proof of concept.
- **Acceptance:** Infrastructure in place. Services can gradually migrate to use TenantContext instead of explicit tenantId parameters.

### ARCH-003: Remove unused @tanstack/react-query
- **Status:** `DONE`
- **Completed:** 2026-02-07
- **File:** `nexused-frontend/package.json`
- **Problem:** `@tanstack/react-query` is installed but never imported. Adds ~30KB to bundle and confuses contributors.
- **Fix:** `npm uninstall @tanstack/react-query` from the frontend project.
- **Acceptance:** Package removed from `package.json` and `node_modules`. No import references exist.

### ARCH-004: DataLoader for GraphQL N+1 prevention
- **Status:** `DONE`
- **Completed:** 2026-02-09
- **Finding:** N+1 prevention is already implemented at the service layer via eager loading (`leftJoinAndSelect`, `relations: []`). No @ResolveField() methods exist — all resolvers are query/mutation only. The architecture follows the batch-load pattern throughout.
- **Verification:** Grep for `@ResolveField` returns 0 matches. All services use joins or relations arrays for nested data.
- **Acceptance:** Already met — the codebase was designed correctly from the start.

### ARCH-005: AI provider abstraction layer
- **Status:** `DONE`
- **Completed:** 2026-02-09
- **Files Created:**
  - `src/modules/ai/providers/ai-provider.interface.ts` — Vendor-agnostic types (AiMessage, AiContentBlock, AiToolDefinition, AiProvider interface, AI_PROVIDER injection token)
  - `src/modules/ai/providers/anthropic.provider.ts` — Anthropic SDK wrapper implementing AiProvider
  - `src/modules/ai/providers/index.ts` — Barrel export
- **Files Modified:**
  - `agent-executor.service.ts` — Now injects AI_PROVIDER and uses vendor-agnostic types
  - `ai.service.ts` — Deprecated, delegates to provider (kept for backward compatibility)
  - `ai.module.ts` — Registers AnthropicProvider with AI_PROVIDER token
  - `tools/tool-registry.ts` — Added `toProviderFormat()` method (deprecated `toClaudeFormat`)
- **Acceptance:** `@anthropic-ai/sdk` is only imported in `providers/anthropic.provider.ts`. AgentExecutor uses the AiProvider interface. New providers can be added without touching the agentic loop.

### ARCH-006: Switch monorepo to Turborepo + pnpm
- **Status:** `DONE`
- **Completed:** 2026-02-09
- **Files Created:**
  - `turbo.json` — Task pipeline (build, lint, test, typecheck, dev)
  - `pnpm-workspace.yaml` — Workspace configuration
  - `.github/workflows/ci.yml` — Unified CI with pnpm + turbo
- **Files Modified:**
  - Root `package.json` — Added turbo scripts, packageManager field
  - `nexused-backend/package.json` — Added `dev`, `typecheck` scripts
  - `nexused-frontend/package.json` — Added `typecheck` script
  - `.gitignore` — Added package-lock.json exclusion
- **Files Removed:**
  - `.github/workflows/backend-ci.yml`, `.github/workflows/frontend-ci.yml` (replaced by unified ci.yml)
  - `package-lock.json` files (replaced by pnpm-lock.yaml)
- **Acceptance:** ✓ `pnpm build` runs both projects in parallel. ✓ Cached builds are instant. ✓ 101 tests pass.

---

## P3 — Test Foundation

> No tests exist beyond NestJS scaffolding defaults. Build the testing infrastructure before it becomes unmanageable.

### TEST-001: Testing infrastructure setup
- **Status:** `DONE`
- **Completed:** 2026-02-09
- **Files Created:**
  - `src/test/factories/index.ts` — Entity factories with sensible defaults (createUser, createCourse, createAssignment, etc.)
  - `src/test/mocks/repository.mock.ts` — Mock repository factory and query builder mocks
  - `src/modules/ai/governance.service.spec.ts` — 18 tests for GovernanceService
  - `src/modules/feed/feed.service.spec.ts` — 14 tests for FeedService
- **Files Modified:**
  - `src/database/entities/base.entity.ts` — Fixed circular dependency (use string reference for Tenant relation)
- **Test count:** 33 tests (1 scaffold + 18 governance + 14 feed)
- **Acceptance:** ✓ `npm test` runs 33 tests. ✓ Factories create any entity with defaults. Test database not needed yet (unit tests with mocks).

### TEST-002: Unit tests for critical services
- **Status:** `DONE`
- **Completed:** 2026-02-09
- **Targets:** GovernanceService, FeedService, AssignmentsService, CoursesService
- **Why these four:**
  - GovernanceService: AI guardrail — if this is wrong, AI does things it shouldn't
  - FeedService: Feed ranking — if this is wrong, students miss deadlines
  - AssignmentsService: Grading flow — if this is wrong, grades are corrupted
  - CoursesService: Enrollment — if this is wrong, students are in wrong classes
- **Files Created:**
  - `src/modules/assignments/assignments.service.spec.ts` — 27 tests
  - `src/modules/courses/courses.service.spec.ts` — 41 tests
- **Test count:** 101 total (1 scaffold + 18 governance + 14 feed + 27 assignments + 41 courses)
- **Acceptance:** ✓ All critical services have comprehensive unit tests covering tenant scoping, authorization, edge cases.

### TEST-003: Resolver integration tests
- **Status:** `DONE`
- **Completed:** 2026-02-09
- **Files Created:**
  - `test/helpers/test-app.ts` — Integration test application helper with database utilities
  - `test/courses.e2e-spec.ts` — 22 integration tests for CoursesResolver
- **Files Modified:**
  - `test/jest-e2e.json` — Added moduleNameMapper and testTimeout
  - `.env.test` — Test database configuration
  - `src/modules/content/course-content.entity.ts` — Fixed publishedAt GraphQL type
- **Test categories:**
  - Authentication (5 tests): Unauthenticated requests are rejected
  - Authorization (7 tests): Wrong-role requests are rejected, correct roles allowed
  - Tenant Scoping (5 tests): Cross-tenant data is never returned
  - Happy Path (4 tests): Normal operations work correctly
- **CI Note:** Tests require PostgreSQL, which is provided by GitHub Actions service container. Tests skip gracefully when no database is available locally.
- **Acceptance:** ✓ Integration tests prove all three security properties.

### TEST-004: Playwright E2E for critical user flows
- **Status:** `DONE`
- **Completed:** 2026-02-10
- **Files Created:**
  - `nexused-frontend/playwright.config.ts` — Playwright configuration
  - `nexused-frontend/e2e/fixtures/auth.fixture.ts` — Auth fixtures (loginAs, loginAsStudent, etc.)
  - `nexused-frontend/e2e/fixtures/seed.fixture.ts` — Test data and GraphQL helper
  - `nexused-frontend/e2e/fixtures/index.ts` — Fixture barrel export
  - `nexused-frontend/e2e/01-login.spec.ts` — Login flow tests (7 tests)
  - `nexused-frontend/e2e/02-feed.spec.ts` — Feed viewing tests (8 tests)
  - `nexused-frontend/e2e/03-course-navigation.spec.ts` — Course navigation tests (9 tests)
  - `nexused-frontend/e2e/04-submit-assignment.spec.ts` — Assignment submission tests (7 tests)
  - `nexused-frontend/e2e/05-grade-submission.spec.ts` — Grading flow tests (9 tests)
  - `nexused-backend/src/health/health.controller.ts` — Health endpoint for CI readiness
- **Files Modified:**
  - `nexused-frontend/package.json` — Added Playwright scripts
  - `package.json` — Added test:e2e script and wait-on dependency
  - `turbo.json` — Added test:e2e task
  - `.github/workflows/ci.yml` — Added E2E test job
  - `.gitignore` — Added Playwright output directories
  - `nexused-backend/src/app.module.ts` — Added HealthController
- **Test flows covered:**
  1. Login (successful login, invalid credentials, session persistence, logout)
  2. View feed (student feed, instructor feed, navigation items)
  3. Navigate to course (course list, course detail, section timeline)
  4. Submit assignment (find assignment, fill form, submit, view history)
  5. Grade submission (view submissions, enter grade/feedback, save)
- **CI Notes:** E2E tests run only on main branch (PRs run unit tests only). Requires backend + frontend servers running.
- **Acceptance:** ✓ 5 critical flows have E2E tests. ✓ CI configured to run Playwright. ✓ Health endpoint added for server readiness checks.

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
- **Status:** `DONE`
- **Completed:** 2026-02-09
- **Priority:** HIGH — Event stubs exist but only log. This is what makes AI proactive.
- **Files Modified:**
  - `src/modules/ai/events/ai-event.listener.ts` — Full implementation
  - `src/modules/ai/ai.module.ts` — Added CourseSection to TypeORM imports
- **Details:** Replaced logging stubs with actual agent invocations:
  - `ENROLLMENT_CREATED` → StudyCoach sends personalized welcome message
  - `SUBMISSION_CREATED` → FeedbackCopilot drafts rubric-aligned feedback for instructor
  - `GRADE_UPDATED` → Checks if score < 60%, triggers StudyCoach support if below
  - `ASSIGNMENT_CREATED` → Placeholder for future CourseBuilder agent
- **Pattern:** Fire-and-forget async handlers — errors are logged but don't block the main action (enrollment/submission/grading succeeds even if AI fails).
- **Acceptance:** ✓ Submitting an assignment triggers FeedbackCopilot. ✓ Enrolling triggers StudyCoach welcome. ✓ Low grades trigger StudyCoach support. All async.

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
- **Status:** `DONE`
- **Completed:** 2026-02-10
- **Priority:** MEDIUM
- **Files Created:**
  - `nexused-backend/src/modules/messaging/messaging.gateway.ts` — WebSocket gateway with JWT auth from cookies, room-based subscriptions
  - `nexused-frontend/src/lib/socket.ts` — Socket.IO client initialization with auth
  - `nexused-frontend/src/hooks/use-socket.ts` — React hooks for socket lifecycle, conversation events, typing indicators
- **Files Modified:**
  - `nexused-backend/src/modules/messaging/messaging.service.ts` — Added EventEmitter2 events for MESSAGE_SENT, CONVERSATION_CREATED
  - `nexused-backend/src/modules/messaging/messaging.module.ts` — Added MessagingGateway, JwtModule
  - `nexused-frontend/src/components/messaging/conversation-list.tsx` — Real-time updates instead of 10s polling
  - `nexused-frontend/src/components/messaging/message-thread.tsx` — Real-time messages, typing indicators
- **Features:**
  - JWT authentication from httpOnly cookies in WebSocket handshake
  - Room-based subscriptions per conversation
  - Real-time message delivery via `message:new` event
  - Typing indicators with debouncing (2s timeout)
  - Connection status indicator (Wifi icon)
  - Graceful fallback to polling when socket disconnected
- **Acceptance:** ✓ New messages appear instantly without polling. ✓ Typing indicators show when other user types. ✓ Connection reconnects automatically on disconnect.

### FEAT-006: Dashboard as toggleable widgets
- **Status:** `DONE`
- **Completed:** 2026-02-10
- **Priority:** MEDIUM
- **Files Created:**
  - `nexused-frontend/src/hooks/use-widget-preferences.ts` — Hook for widget visibility, collapse state, type mappings
  - `nexused-frontend/src/components/feed/widget-settings.tsx` — Settings dialog with Switch toggles per widget type
  - `nexused-frontend/src/lib/graphql/mutations/user.ts` — UPDATE_PREFERENCES_MUTATION
- **Files Modified:**
  - `nexused-frontend/src/types/auth.ts` — Added preferences field to User type
  - `nexused-frontend/src/stores/auth.store.ts` — Added setUser method for preferences updates
  - `nexused-frontend/src/lib/graphql/queries/user.ts` — Added preferences to ME_QUERY
  - `nexused-frontend/src/components/feed/student-home-feed.tsx` — Widget filtering + settings button
  - `nexused-frontend/src/components/feed/instructor-home-feed.tsx` — Widget filtering + settings button
- **Features:**
  - Students can toggle deadlines, grades, announcements, courseUpdates widgets
  - Instructors can toggle ungraded, upcomingDeadlines, announcements widgets
  - Preferences persisted in user.preferences JSONB via GraphQL mutation
  - Settings accessible via "Customize" button on feed header
- **Acceptance:** ✓ Student can hide announcement widgets. ✓ Preferences persist across sessions. ✓ Instructor has separate widget types.

### FEAT-007: Database migrations
- **Status:** `DONE`
- **Completed:** 2026-02-09
- **Priority:** MEDIUM
- **Files Created:**
  - `src/database/typeorm.config.ts` — TypeORM CLI data source for migration commands
  - `src/database/migrations/` — Directory for migration files
- **Files Modified:**
  - `package.json` — Added 4 migration scripts (generate, run, revert, show)
  - `database.config.ts` — `synchronize: false`, `migrationsRun: true`
  - `app.module.ts` — Load migrations from `dist/database/migrations/*.js`
- **Usage:**
  ```bash
  pnpm --filter nexused-backend migration:generate -- src/database/migrations/AddNewFeature
  pnpm --filter nexused-backend migration:run
  pnpm --filter nexused-backend migration:revert
  pnpm --filter nexused-backend migration:show
  ```
- **Acceptance:** ✓ `synchronize: false` in all environments. ✓ Migrations run on startup. ✓ CLI commands generate/run/revert migrations.

### FEAT-008: Admin analytics dashboard
- **Status:** `DONE`
- **Completed:** 2026-02-11
- **Priority:** LOW
- **Files Created:**
  - `nexused-backend/src/modules/analytics/analytics.module.ts`
  - `nexused-backend/src/modules/analytics/analytics.service.ts`
  - `nexused-backend/src/modules/analytics/analytics.resolver.ts`
  - `nexused-backend/src/modules/analytics/dto/analytics.types.ts`
  - `nexused-frontend/src/lib/graphql/queries/analytics.ts`
  - `nexused-frontend/src/app/(dashboard)/admin/analytics/page.tsx`
- **Files Modified:**
  - `nexused-backend/src/app.module.ts` — Added AnalyticsModule
  - `nexused-frontend/src/lib/navigation.ts` — Added Analytics nav item for admins
  - `nexused-frontend/src/app/(dashboard)/admin/page.tsx` — Redirects to /admin/analytics
- **Details:**
  - Backend AnalyticsModule with tenant-scoped aggregation queries
  - GraphQL queries: adminDashboard, tenantStats, userStats, gradeStats, submissionMetrics, atRiskStudents, aiUsageSummary, aiAgentUsage, topCourses
  - Frontend dashboard with stat cards, grade distribution chart, role distribution chart, AI usage table, top courses list, at-risk students list
  - All queries admin-only via @Roles(UserRole.ADMIN)
- **Acceptance:** ✓ Admin can view institution-wide metrics. ✓ Data includes users, courses, grades, submissions, AI usage. ✓ At-risk students identified by average score < 60%.

### FEAT-009: PWA setup
- **Status:** `DONE`
- **Completed:** 2026-02-11
- **Priority:** LOW
- **Files Created:**
  - `nexused-frontend/public/manifest.json` — PWA manifest with app metadata, icons, shortcuts
  - `nexused-frontend/public/sw.js` — Service worker with caching strategies
  - `nexused-frontend/public/icons/` — 8 PNG icons (72-512px) generated from SVG
  - `nexused-frontend/src/app/offline/page.tsx` — Offline fallback page
  - `nexused-frontend/src/hooks/use-pwa.ts` — PWA hook (install, online status, SW registration)
  - `nexused-frontend/src/components/pwa/install-prompt.tsx` — Install banner component
  - `nexused-frontend/src/components/pwa/offline-indicator.tsx` — Offline status banner
  - `nexused-frontend/scripts/generate-icons.js` — Icon generation script
- **Files Modified:**
  - `nexused-frontend/src/app/layout.tsx` — PWA metadata, viewport, apple-touch-icon
  - `nexused-frontend/src/app/(dashboard)/layout.tsx` — Added InstallPrompt, OfflineIndicator
- **Details:**
  - Service worker caches: static assets (cache-first), pages (network-first with offline fallback), API (network-only)
  - Install prompt shows on supported browsers, dismissable per session
  - Offline indicator banner when connection lost
  - App shortcuts for Home, Courses, AI
  - Push notification handlers ready for future use
- **Acceptance:** ✓ App is installable on mobile. ✓ Offline mode shows cached pages or offline page. ✓ Push notification handlers ready.

### FEAT-010: WCAG 2.1 AA accessibility
- **Status:** `DONE`
- **Completed:** 2026-02-11 (Phase 1), 2026-02-11 (Phase 2)
- **Priority:** LOW (but required for institutional sales — DOJ ADA Title II deadline)
- **Details:** Comprehensive WCAG 2.1 AA accessibility overhaul across the entire frontend.
- **Phase 1 Changes (Session 17):**
  - **ESLint:** Added strict jsx-a11y rules to `eslint.config.mjs` (20+ rules enforced at error level)
  - **Root layout:** Removed `userScalable: false` and `maximumScale: 1` (WCAG 1.4.4 zoom requirement)
  - **Skip navigation:** Added skip-to-content link visible on focus in dashboard layout
  - **Landmark regions:** Added `aria-label` to all `<nav>`, `<aside>`, `<header>`, `<main>` elements
  - **Active navigation:** Added `aria-current="page"` to active sidebar and mobile nav links
  - **Screen-reader announcements:** Added aria-live regions for chat messages, AI responses, typing indicators, feed loading states
  - **Route announcer:** Created `RouteAnnouncer` component for SPA navigation announcements
  - **Form labels:** Added `<label>` elements and `aria-label` to all textareas and inputs (messaging, AI chat)
  - **Icon-only buttons:** Added `aria-label` to all icon-only buttons (Back, Send, New conversation, User menu)
  - **Decorative icons:** Added `aria-hidden="true"` to all decorative icons across sidebar, mobile nav, top nav, feed cards, timeline cards
  - **Badge accessibility:** Unread message badges use `aria-hidden` with count conveyed via `aria-label` on parent link
  - **Error announcements:** Added `role="alert"` to login/register error messages
  - **Focus indicators:** Added global `:focus-visible` outline styles
  - **axe-core E2E:** Installed `@axe-core/playwright`, created 12 accessibility tests covering login, register, dashboard, courses, messages, AI chat, and keyboard navigation
- **Phase 2 Changes (Session 18):**
  - **prefers-reduced-motion (WCAG 2.3.3):** CSS rule disables all animations/transitions when user enables "Reduce motion" in OS settings
  - **prefers-contrast (WCAG 1.4.11):** Enhanced borders, focus rings, and muted-foreground colors for users with high-contrast preference
  - **forced-colors (Windows High Contrast):** Support for Windows High Contrast mode with proper border and focus styles
  - **AccessibilityProvider:** Context provider with `useSyncExternalStore` for detecting OS a11y preferences, centralized live region announcements
  - **Focus management:** `useFocusOnRouteChange` hook moves focus to main content after SPA navigation (WCAG 2.4.3), `useFocusTrap` for custom modals, `useRestoreFocus` for dialog close
  - **Form autocomplete (WCAG 1.3.5):** Added `autocomplete` attributes to login (email, current-password) and register (given-name, family-name, email, new-password) forms
  - **Form error descriptions:** Added `aria-describedby` linking inputs to error messages and password hint text
  - **Accessible loading states:** Auth guard spinner now has `role="status"`, `aria-label`, and sr-only text
  - **AccessibleLoader component:** Reusable loading component with proper ARIA attributes
  - **Route announcer fix:** Refactored to use ref-based DOM manipulation instead of setState (React 19 compatible)
  - **Enhanced E2E tests:** Added 4 new test groups: form autocomplete verification, reduced motion CSS, live region assertions, password hint aria-describedby
- **Files Created (Phase 2):**
  - `nexused-frontend/src/components/a11y/accessibility-provider.tsx`
  - `nexused-frontend/src/components/a11y/focus-on-route-change.tsx`
  - `nexused-frontend/src/components/a11y/accessible-loader.tsx`
  - `nexused-frontend/src/hooks/use-focus-management.ts`
- **Files Modified (Phase 2):** `globals.css`, `auth-guard.tsx`, `login/page.tsx`, `register/page.tsx`, `(dashboard)/layout.tsx`, `route-announcer.tsx`, `06-accessibility.spec.ts`
- **Acceptance:** ✓ Zero axe-core violations at critical/serious level. ✓ Keyboard-only navigation works. ✓ Screen reader announces route changes and feed updates. ✓ Skip link focuses main content. ✓ All interactive elements have accessible names. ✓ Reduced motion disables animations. ✓ High contrast mode enhances borders/text. ✓ Forms have autocomplete attributes. ✓ Focus moves to main content on navigation.

### FEAT-011: LTI 1.3 integration
- **Status:** `DONE`
- **Completed:** 2026-02-11
- **Priority:** LOW (but required for institutional adoption)
- **Details:** Full LTI 1.3 integration allowing external LMS platforms (Canvas, Brightspace, Moodle, etc.) to launch NexusEd as a tool.
- **Backend Implementation:**
  - 5 new entities: `LtiPlatform`, `LtiDeployment`, `LtiContext`, `LtiUser`, `LtiState`
  - `LtiService`: Platform management, OIDC login flow, JWT verification, user provisioning, role mapping, context linking
  - `LtiController`: REST endpoints for `/api/lti/login`, `/api/lti/launch`, `/api/lti/.well-known/jwks.json`, `/api/lti/config`
  - `LtiResolver`: GraphQL admin interface for platform registration
  - `LtiCleanupService`: Periodic cleanup of expired OIDC states
  - Automatic user creation with LTI role to NexusEd role mapping
  - Course context detection and linking to NexusEd sections
- **Frontend Implementation:**
  - Admin integrations page at `/admin/integrations`
  - Tool configuration display for LMS registration
  - Platform registration form with OIDC endpoints
  - Platform list with status, deployment count, user count
  - Integrations nav item added to admin navigation
- **Files Created:**
  - Backend: `lti.config.ts`, `lti-platform.entity.ts`, `lti-deployment.entity.ts`, `lti-context.entity.ts`, `lti-user.entity.ts`, `lti-state.entity.ts`, `lti.types.ts`, `lti.service.ts`, `lti.controller.ts`, `lti.resolver.ts`, `lti-cleanup.service.ts`, `lti.module.ts`
  - Frontend: `queries/lti.ts`, `mutations/lti.ts`, `admin/integrations/page.tsx`
- **Acceptance:** ✓ NexusEd can be registered as an LTI 1.3 tool in external LMS. ✓ OIDC login flow implemented. ✓ Users auto-provisioned on first launch. ✓ Admin UI for managing platform registrations. ✓ Context linking for course mapping.

### FEAT-012: Per-tenant AI governance console
- **Status:** `DONE`
- **Completed:** 2026-02-12
- **Priority:** LOW (enterprise tier feature)
- **Details:** Admin UI for configuring AI governance per tenant. Set action types per tool, adjust rate limits, set token budgets, view AI audit logs.
- **Backend Implementation:**
  - `TenantAiConfig` entity — per-tenant governance settings (enabled flag, JSONB tool overrides, rate limits, budgets)
  - Updated `GovernanceService` — loads tenant-specific config from DB, falls back to global defaults. Added monthly budget check.
  - `GovernanceResolver` — admin-only GraphQL resolver with queries (aiGovernanceConfig, aiAuditLogs, aiUsageTrend) and mutations (updateAiGovernanceConfig, updateToolPermission, resetToolPermission)
  - GraphQL DTOs: GovernanceConfig, ToolPermission, AuditLogEntry, AuditLogPage, UsageTrend, DailyUsagePoint
  - 3 new unit tests for tenant-specific governance (disabled AI, tool override, blocked override)
- **Frontend Implementation:**
  - Admin page at `/admin/ai-governance` with 4 tabbed sections:
    1. Tool Permissions — table of all 16 tools with dropdown to change action type (auto/suggest/blocked), reset-to-default button
    2. Rate Limits & Budget — configurable requests/min, daily token budget, monthly USD budget with progress bar
    3. Usage Trend — 30-day bar chart of daily token usage with summary stats
    4. Audit Log — paginated table of AI interactions with user info, agent type, tokens, cost, filterable by agent
  - Overview stat cards: tool overrides count, rate limit, today's tokens, month's cost
  - AI enabled/disabled toggle with warning banner
  - Added "AI Governance" nav item with Shield icon to admin navigation
- **Files Created:**
  - `nexused-backend/src/modules/ai/entities/tenant-ai-config.entity.ts`
  - `nexused-backend/src/modules/ai/dto/governance.types.ts`
  - `nexused-backend/src/modules/ai/governance.resolver.ts`
  - `nexused-frontend/src/lib/graphql/queries/governance.ts`
  - `nexused-frontend/src/lib/graphql/mutations/governance.ts`
  - `nexused-frontend/src/app/(dashboard)/admin/ai-governance/page.tsx`
- **Files Modified:**
  - `nexused-backend/src/modules/ai/governance.service.ts` — DB-backed config, monthly budget checks
  - `nexused-backend/src/modules/ai/ai.module.ts` — Added TenantAiConfig entity, GovernanceResolver
  - `nexused-backend/src/database/entities/index.ts` — Added TenantAiConfig
  - `nexused-backend/src/modules/ai/governance.service.spec.ts` — Updated with TenantAiConfig mock, 3 new tests
  - `nexused-frontend/src/lib/navigation.ts` — Added Shield icon, AI Governance nav for admin
- **Acceptance:** ✓ Admin can change a tool from "auto" to "suggest" and it takes effect immediately. ✓ Usage logs are visible with timestamps and costs. ✓ Rate limits and budgets are configurable per tenant. ✓ AI can be disabled entirely per tenant. ✓ 104 tests pass.

### FEAT-013: Agent Builder admin UI
- **Status:** `DONE`
- **Completed:** 2026-02-12
- **Priority:** LOW (marketplace potential)
- **Details:** UI for creating custom agents per course. Instructors define system prompts, select tools, set constraints. Agents appear in the student's agent selector.
- **Backend Implementation:**
  - `CustomAgent` entity — DB-stored agent definitions with slug, displayName, description, systemPrompt, tools (JSONB), allowedRoles, maxTurns, isActive, optional courseId scope
  - `CustomAgentService` — CRUD operations, tool validation against ToolRegistry, slug generation, `resolveAgent()` method that checks built-in registry then falls back to DB
  - `CustomAgentResolver` — instructor/admin GraphQL resolver with customAgents, customAgent, availableTools queries and createCustomAgent, updateCustomAgent, deleteCustomAgent mutations
  - Updated `AgentExecutorService` — uses `CustomAgentService.resolveAgent()` instead of direct AgentRegistry.get() for both start and continue flows
  - Updated `AiResolver.availableAgents` — merges built-in agents with custom agents filtered by role and course enrollment
- **Frontend Implementation:**
  - Agent Builder page at `/ai/agents` with card grid showing all custom agents
  - Create/Edit dialog with agent name, description, system prompt editor (with char count), tool picker (checkbox grid with action type badges), role selector, max turns config
  - Active/inactive toggle, delete confirmation dialog
  - Empty state with call-to-action for first agent creation
  - Added "Agent Builder" nav item with Bot icon to instructor navigation
  - Updated conversation list to display custom agent names from slug
- **Files Created:**
  - `nexused-backend/src/modules/ai/entities/custom-agent.entity.ts`
  - `nexused-backend/src/modules/ai/dto/custom-agent.types.ts`
  - `nexused-backend/src/modules/ai/custom-agent.service.ts`
  - `nexused-backend/src/modules/ai/custom-agent.resolver.ts`
  - `nexused-frontend/src/lib/graphql/queries/custom-agents.ts`
  - `nexused-frontend/src/lib/graphql/mutations/custom-agents.ts`
  - `nexused-frontend/src/app/(dashboard)/ai/agents/page.tsx`
- **Files Modified:**
  - `nexused-backend/src/modules/ai/agent-executor.service.ts` — Uses CustomAgentService.resolveAgent()
  - `nexused-backend/src/modules/ai/ai.resolver.ts` — Merges custom agents into availableAgents query
  - `nexused-backend/src/modules/ai/ai.module.ts` — Registered CustomAgent entity, CustomAgentService, CustomAgentResolver
  - `nexused-backend/src/database/entities/index.ts` — Added CustomAgent to entities array
  - `nexused-frontend/src/lib/navigation.ts` — Added Agent Builder nav for instructors
  - `nexused-frontend/src/components/ai/ai-conversation-list.tsx` — Custom agent label from slug
- **Acceptance:** ✓ Instructor can create a custom agent for their course. ✓ Custom agents appear in student's agent selector (role + course filtered). ✓ Agent respects governance rules (same AgentExecutor loop). ✓ 104 tests pass.

### FEAT-015: AI Course Planner
- **Status:** `DONE`
- **Completed:** 2026-02-12
- **Priority:** HIGH — "The feature that started the entire project" (ROADMAP.md)
- **Details:** AI-powered academic advisor that helps students plan courses, track graduation progress, explore what-if scenarios for changing majors, and find eligible courses.
- **Backend Implementation:**
  - `DegreeProgram` entity — tenant-scoped degree definitions with name, code, department, totalCreditsRequired, and JSONB requirements (groups of core/elective/gen-ed/concentration with course refs and credit/course thresholds)
  - `StudentDegreeProfile` entity — links student to a degree program, tracks completedCourseIds and currentCourseIds (JSONB), enrollment year, expected graduation
  - `PlannerService` — CRUD for programs and profiles, progress calculation (per-requirement-group credit/course tracking), course eligibility (prerequisite checking + unfulfilled requirement matching), major change simulation
  - `PlannerResolver` — GraphQL queries (degreePrograms, myDegreeProfiles, degreeProgress, eligibleCourses, simulateMajorChange) and mutations (createDegreeProgram, updateDegreeProgram, createStudentDegreeProfile, updateStudentDegreeProfile)
  - `PlannerModule` — standalone module, exports PlannerService for AI module consumption
  - 6 new AI tools: get_degree_progress, get_student_degree_profiles, get_eligible_courses, get_degree_requirements, list_degree_programs, simulate_major_change
  - Course Planner agent definition — maxTurns: 20, tools: 6 planner + 3 course tools, Socratic-directive hybrid prompt
- **Frontend Implementation:**
  - Degree Planner page at `/planner` with SVG progress ring, stat cards (credits completed, remaining, estimated semesters), requirements breakdown grid with progress bars, eligible courses list with prerequisite badges, what-if major change simulator
  - Setup dialog for selecting degree program and enrollment year
  - CTA linking to AI Course Planner conversation
  - Added "Planner" nav item with Map icon to student navigation
  - Updated AI conversation list with Course Planner icon and label
- **Files Created:**
  - `nexused-backend/src/database/entities/degree-program.entity.ts`
  - `nexused-backend/src/database/entities/student-degree-profile.entity.ts`
  - `nexused-backend/src/modules/planner/planner.service.ts`
  - `nexused-backend/src/modules/planner/planner.resolver.ts`
  - `nexused-backend/src/modules/planner/planner.module.ts`
  - `nexused-backend/src/modules/planner/dto/planner.types.ts`
  - `nexused-backend/src/modules/ai/tools/planner.tools.ts`
  - `nexused-backend/src/modules/ai/agents/course-planner.agent.ts`
  - `nexused-frontend/src/lib/graphql/queries/planner.ts`
  - `nexused-frontend/src/lib/graphql/mutations/planner.ts`
  - `nexused-frontend/src/app/(dashboard)/planner/page.tsx`
- **Files Modified:**
  - `nexused-backend/src/database/entities/index.ts` — Added DegreeProgram, StudentDegreeProfile
  - `nexused-backend/src/modules/ai/ai.module.ts` — Registered planner tools and Course Planner agent
  - `nexused-backend/src/app.module.ts` — Added PlannerModule
  - `nexused-frontend/src/lib/navigation.ts` — Added Planner nav for students
  - `nexused-frontend/src/components/ai/ai-conversation-list.tsx` — Course Planner icon and label
- **Acceptance:** ✓ Student can set up degree profile. ✓ Progress tracked with per-requirement breakdown. ✓ Eligible courses filtered by prerequisites and requirements. ✓ What-if simulator shows credit transfer. ✓ AI Course Planner agent available in chat. ✓ 104 tests pass.

### FEAT-014: ML-based feed personalization
- **Status:** `DONE`
- **Completed:** 2026-02-12
- **Priority:** LOW (requires data to train)
- **Details:** Replace rule-based feed ranking with a weighted scoring model trained on user behavior. Track clicks, impressions, and dismissals per feed item per user. Use engagement signals to personalize ranking.
- **Backend Implementation:**
  - `FeedEngagement` entity — append-only event log tracking clicks, impressions, dismissals with tenantId, userId, feedItemType, courseCode, dwellTimeMs
  - `FeedPersonalizationService` — builds per-user engagement profile (type CTR, course CTR, seen items), scores feed items using 5-feature weighted model (urgency 0.35, typeAffinity 0.20, courseAffinity 0.15, recency 0.20, novelty 0.10), falls back to rule-based ranking for new users
  - GraphQL mutations: `recordFeedEngagement` (single), `recordFeedEngagementBatch` (batched impressions)
  - GraphQL query: `feedEngagementStats` (admin-only tenant analytics)
  - Updated `FeedResolver.studentFeed` to apply personalized ranking after data fetch
  - 13 new unit tests for personalization service (scoring model, profiles, stats)
- **Frontend Implementation:**
  - `useFeedEngagement` hook — tracks clicks (immediate), impressions (batched every 5s via IntersectionObserver), dismissals (immediate). Deduplicates impressions, fire-and-forget mutations
  - `useFeedCardVisibility` hook — IntersectionObserver wrapper that fires impression callback at 50% visibility threshold
  - Updated `FeedCard` — accepts `onImpression` and `onClick` callbacks, wraps in visibility-tracked div
  - Updated `StudentHomeFeed` — wires engagement tracking into all feed cards
  - Updated `InstructorHomeFeed` — extracted `InstructorFeedCard` component with engagement tracking
- **Files Created:**
  - `nexused-backend/src/modules/feed/entities/feed-engagement.entity.ts`
  - `nexused-backend/src/modules/feed/feed-personalization.service.ts`
  - `nexused-backend/src/modules/feed/dto/engagement.types.ts`
  - `nexused-backend/src/modules/feed/feed-personalization.service.spec.ts`
  - `nexused-frontend/src/hooks/use-feed-engagement.ts`
  - `nexused-frontend/src/lib/graphql/mutations/feed-engagement.ts`
- **Files Modified:**
  - `nexused-backend/src/modules/feed/feed.service.ts` — Removed sorting (delegated to personalization)
  - `nexused-backend/src/modules/feed/feed.resolver.ts` — Added engagement mutations, personalized ranking
  - `nexused-backend/src/modules/feed/feed.module.ts` — Registered FeedEngagement entity and personalization service
  - `nexused-backend/src/database/entities/index.ts` — Added FeedEngagement to TypeORM
  - `nexused-backend/src/modules/feed/feed.service.spec.ts` — Updated sort test
  - `nexused-frontend/src/components/feed/feed-card.tsx` — Added engagement tracking props
  - `nexused-frontend/src/components/feed/student-home-feed.tsx` — Wired engagement tracking
  - `nexused-frontend/src/components/feed/instructor-home-feed.tsx` — Wired engagement tracking
- **Acceptance:** ✓ Engagement events tracked per user. ✓ Feed ranking adapts to user behavior. ✓ New users get rule-based fallback. ✓ Urgent deadlines still prioritized (0.35 weight). ✓ Admin can view engagement stats. ✓ 117 tests pass (13 new).

---

## Sprint: Institutional Onboarding & Catalog Management

> **Goal:** An institution can get set up on NexusEd with their full course catalog and degree programs. This is the data foundation — nothing else (enrollment, graduation planning, AI course discovery) works without it.
>
> **Competitive angle:** DegreeWorks (Ellucian) charges $100k+/year and requires weeks of manual setup. NexusEd's AI-assisted import can onboard an institution's catalog in hours. This is the "wow" moment in a sales demo.

### ONBOARD-001: Catalog Data Model Extensions
- **Status:** `DONE`
- **Completed:** 2026-02-17
- **Priority:** HIGH — Data foundation for everything
- **Scope:**
  - Extend `Course` entity with catalog fields: `credits` (int), `department` (varchar), `category` (enum: core/elective/gen-ed/lab/seminar), `description` (text), `courseLevel` (int: 100-400+), `offeredSemesters` (JSONB array: ['Fall', 'Spring', 'Summer']), `prerequisiteCourseIds` (JSONB string array), `corequisiteCourseIds` (JSONB string array)
  - Extend `CourseSection` entity: `maxEnrollment` (int, seat capacity), `schedule` (JSONB: { days: string[], startTime: string, endTime: string }), `location` (varchar), `enrollmentMode` (enum: 'open' | 'invite_only', default 'open'), `inviteCode` (varchar, nullable, 6-char alphanumeric), `autoApprove` (boolean, default true)
  - Extend `AcademicTerm` entity: `enrollmentWindowStart` (timestamp), `enrollmentWindowEnd` (timestamp), `dropDeadline` (timestamp), `withdrawDeadline` (timestamp)
  - Extend `DegreeProgram` entity (from FEAT-015): `programType` (enum: 'major' | 'minor' | 'certificate' | 'diploma'), `department` (varchar), `expectedDurationSemesters` (int), `catalogYear` (varchar)
  - Add `@Index` decorators on new columns used in queries (department, category, courseLevel)
  - Generate TypeORM migration for all schema changes
- **Acceptance:** All entities have the extended fields. Migration runs cleanly. Existing seed data still works. No breaking changes to current API.

### ONBOARD-002: Admin Catalog CRUD
- **Status:** `DONE`
- **Completed:** 2026-02-18
- **Priority:** HIGH — Admins need to manage catalog data
- **Depends on:** ONBOARD-001
- **Scope:**
  - Backend: `CatalogService` with CRUD operations for courses and programs, search (title, code, department), filter (category, level, credits, offered semesters), pagination
  - Backend: `CatalogResolver` — admin-only mutations: `createCatalogCourse`, `updateCatalogCourse`, `deleteCatalogCourse`, `updateDegreeProgram`. Queries: `catalogCourses(filters)`, `catalogCourse(id)`, `departmentList`
  - Frontend: `/admin/catalog` page with:
    - Course list table with search, filter by department/category/level, pagination
    - Create/edit course form (all catalog fields, prerequisite picker — select from existing courses)
    - Bulk course operations (deactivate, change department)
    - Degree program list and editor (requirement group management, assign courses to groups)
  - Frontend: Add "Catalog" nav item with BookOpen icon to admin navigation
- **Acceptance:** Admin can create, edit, delete courses. Admin can manage degree program requirements. Search and filters work. All operations are tenant-scoped.

### ONBOARD-003: CSV Catalog Import
- **Status:** `DONE`
- **Priority:** HIGH — Structured bulk import for institutions with SIS exports
- **Depends on:** ONBOARD-002
- **Scope:**
  - Backend: CSV parsing service with standard templates:
    - `courses.csv`: code, title, credits, department, category, level, description, prerequisites (comma-separated codes), corequisites, offered_semesters
    - `programs.csv`: name, type, department, total_credits, expected_duration, catalog_year
    - `requirements.csv`: program_code, group_name, group_type (core/elective/gen-ed), course_codes (comma-separated), min_credits, min_courses
  - Backend: Validation pipeline — parse → validate required fields → check referential integrity (prerequisite course exists) → generate error report (row-by-row)
  - Backend: Import as transaction — all-or-nothing with rollback on any failure
  - Backend: Mutation: `importCatalogFromCsv(type, csvData)` → returns `{ imported: number, errors: [{ row, field, message }] }`
  - Frontend: Admin import wizard — select CSV type → upload file → preview parsed data in table → review/fix errors → confirm import
  - Frontend: Downloadable CSV templates with example data
- **Acceptance:** Admin can upload courses.csv with 500 courses and import them in one operation. Errors are reported per-row. Failed imports roll back completely. Template CSVs are downloadable.

### ONBOARD-004: AI-Assisted Catalog Import from Documents
- **Status:** `DONE`
- **Priority:** MEDIUM — The sales demo differentiator
- **Depends on:** ONBOARD-003
- **Scope:**
  - Backend: Document upload endpoint — accepts PDF (academic calendar, course catalog) or plain text
  - Backend: AI extraction pipeline using Claude (via AI provider abstraction):
    - Parse course entries: code, title, credits, description, prerequisites (handle natural language: "Prerequisite: CS 101 with minimum C+ or permission of instructor")
    - Parse degree requirements: program name, requirement groups, course lists, credit thresholds
    - Handle ambiguity: flag low-confidence extractions for human review
  - Backend: Extraction review queue — store extracted data as draft, admin reviews/edits in UI, then confirms import
  - Backend: `importCatalogFromDocument(file)` → returns `{ extractedCourses: [...], extractedPrograms: [...], confidence: number, flaggedItems: [...] }`
  - Frontend: "Import from Document" wizard:
    1. Upload PDF or paste text
    2. AI processes (show progress — "Extracting courses... Found 247 courses so far")
    3. Review extracted data in editable table (flagged items highlighted in yellow)
    4. Fix errors, resolve flags
    5. Confirm import
  - Cost tracking: Log AI tokens used for extraction via UsageTrackingService
- **Acceptance:** Admin uploads a 50-page academic calendar PDF → AI extracts 200+ courses with prerequisites and 10+ degree programs → admin reviews in <30 minutes → catalog is live. Extraction accuracy > 90% on well-structured documents.

---

## Sprint: Student Enrollment & Course Discovery

> **Goal:** Build the complete enrollment flow — from course discovery to AI-assisted enrollment to institutional-scale management. This is the first AI-native enrollment system in any LMS.
>
> **Innovation thesis:** Every LMS treats enrollment as admin plumbing (CSV imports, manual assignment). NexusEd makes enrollment a student-facing, AI-powered experience. A student can say "I need a 3-credit elective" and the AI finds, recommends, and enrolls them.

### ENROLL-001: Course Catalog (Browse & Search)
- **Status:** `DONE`
- **Completed:** 2026-02-18
- **Priority:** HIGH — Students need to discover courses before they can enroll
- **Depends on:** Existing Course, CourseSection, AcademicTerm entities
- **Scope:**
  - Backend: `CatalogService` with tenant-scoped course listing, search (title, code, instructor name), filters (term, department, credits, schedule, availability)
  - Backend: `CatalogResolver` with `courseCatalog(filters)` query — public within tenant (any authenticated user)
  - Frontend: `/courses/catalog` page with search bar, filter sidebar (or mobile-friendly filter sheet), course cards showing: title, code, instructor, schedule, seats available/total, prerequisite summary
  - Frontend: Course detail modal or page with full description, syllabus link, instructor bio, enrollment button
- **Entities:** No new entities — uses existing Course, CourseSection, Enrollment (for seat counts), AcademicTerm (for term filter)
- **Key decisions:**
  - Catalog shows sections for the current (or selected) academic term only
  - Seat count = `section.maxEnrollment - activeEnrollmentCount` (add `maxEnrollment` column to CourseSection if missing)
  - Search uses PostgreSQL `ILIKE` for now (full-text search is a future optimization)
- **Acceptance:** Student can browse available courses, search by name/code, filter by term/department, see seat availability, and view course details. All data is tenant-scoped.

### ENROLL-002: Self-Enrollment + Invite Codes
- **Status:** `DONE`
- **Completed:** 2026-02-18
- **Priority:** HIGH — Core enrollment mechanism
- **Depends on:** ENROLL-001
- **Scope:**
  - Backend: Add `enrollmentMode` column to CourseSection entity: `'open' | 'invite_only'` (default: `'open'`)
  - Backend: Add `inviteCode` column to CourseSection entity: nullable 6-char alphanumeric, auto-generated when mode is `invite_only`
  - Backend: `EnrollmentService.enrollStudent(userId, sectionId, inviteCode?)`:
    - Validates enrollment mode (open → no code needed, invite_only → code must match)
    - Checks seat availability
    - Checks if student is already enrolled
    - Creates Enrollment record with status `pending` or `active` (configurable per section: `autoApprove` boolean)
    - Emits `ENROLLMENT_CREATED` event (already wired to Study Coach welcome in FEAT-002)
  - Backend: `EnrollmentService.generateInviteCode(sectionId, instructorId)` — instructor generates/regenerates invite codes
  - Backend: Mutations: `enrollInSection(sectionId, inviteCode?)`, `generateInviteCode(sectionId)`, `approveEnrollment(enrollmentId)`, `rejectEnrollment(enrollmentId)`
  - Frontend: "Enroll" button on catalog course cards → confirms enrollment or prompts for invite code
  - Frontend: Instructor section settings → enrollment mode toggle + invite code display/copy/regenerate
  - Frontend: Instructor pending enrollments list → approve/reject buttons
- **Acceptance:** Student can self-enroll in open sections. Student can enter invite code for invite-only sections. Instructor can generate/share invite codes. Instructor can approve/reject pending enrollments.

### ENROLL-003: Enrollment Lifecycle (Status Machine)
- **Status:** `DONE`
- **Priority:** HIGH — Required for drop/withdraw functionality
- **Depends on:** ENROLL-002
- **Scope:**
  - Backend: Formalize `EnrollmentStatus` transitions: `pending → active → completed | dropped | withdrawn`
    - `pending → active`: Approved by instructor or auto-approved
    - `pending → rejected`: Instructor rejects
    - `active → dropped`: Student drops before drop deadline (reversible — student can re-enroll)
    - `active → withdrawn`: Student withdraws after drop deadline (permanent, may appear on transcript)
    - `active → completed`: Term ends, student has completed the course
    - Admin can force any transition (with audit log)
  - Backend: Add `dropDeadline` and `withdrawDeadline` to AcademicTerm entity
  - Backend: `EnrollmentService.dropCourse(enrollmentId, userId)` — validates deadline, changes status
  - Backend: `EnrollmentService.withdrawCourse(enrollmentId, userId)` — validates deadline, changes status
  - Backend: Emit events for status changes (new event types: `ENROLLMENT_DROPPED`, `ENROLLMENT_WITHDRAWN`)
  - Frontend: "Drop Course" button on enrolled course page (shows deadline warning)
  - Frontend: Enrollment status badge on course cards (pending, active, dropped, withdrawn, completed)
  - Frontend: Admin enrollment management — override status for any student
- **Acceptance:** Students can drop/withdraw courses within deadline constraints. Status transitions are validated and audited. Admin can override. Events fire for AI integration.

### ENROLL-004: Enrollment Notifications & Onboarding
- **Status:** `DONE`
- **Completed:** 2026-02-18
- **Priority:** MEDIUM — Quality-of-life, but leverages existing infrastructure
- **Depends on:** ENROLL-003
- **Scope:**
  - Backend: On `ENROLLMENT_CREATED` with status `active`:
    - Create feed item: "You're enrolled in {courseCode}: {courseTitle}!"
    - Study Coach welcome message already handled by FEAT-002 event listener
  - Backend: On enrollment status changes:
    - `pending → active`: Feed item + Study Coach welcome
    - `active → dropped`: Feed item "You've dropped {courseCode}"
    - `pending → rejected`: Feed item "Your enrollment in {courseCode} was not approved"
  - Frontend: Onboarding checklist widget on first visit to a new course:
    - [ ] Review syllabus
    - [ ] Check upcoming assignments
    - [ ] Say hi in the Study Coach
    - Checklist dismissable, stored in user preferences JSONB
  - Frontend: Course appears in sidebar immediately after enrollment activation
- **Acceptance:** Students receive feed notifications for all enrollment status changes. New course enrollment triggers onboarding checklist. Course appears in navigation immediately.

### ENROLL-005: Enroll-from-AI (Course Planner Integration)
- **Status:** `DONE`
- **Completed:** 2026-02-18
- **Priority:** MEDIUM — The AI-native differentiator
- **Depends on:** ENROLL-002, FEAT-015 (Course Planner — already DONE)
- **Scope:**
  - Backend: New AI tool `enroll_in_course`:
    - Input: `{ sectionId: string }` or `{ courseCode: string, termId?: string }`
    - Resolves section from course code if needed
    - Checks prerequisites via `PlannerService.checkPrerequisites()`
    - Checks seat availability
    - Checks enrollment mode (if invite-only, AI tells student they need a code)
    - Creates enrollment via `EnrollmentService.enrollStudent()`
    - Returns confirmation or error message to the conversation
    - **Governance default:** `suggest` (AI recommends, shows confirmation, student says "yes" to proceed)
  - Backend: New AI tool `check_enrollment_status`:
    - Input: `{ courseCode?: string }` (optional — if omitted, returns all enrollments)
    - Returns current enrollment status for the student
  - Backend: Register tools in Course Planner agent definition
  - Frontend: No changes needed — tool results display in AI chat like any other tool
- **Acceptance:** Student can ask Course Planner "Enroll me in CS 201" and the AI checks prerequisites, availability, and creates the enrollment. Governance controls whether this is auto or requires student confirmation.

### ENROLL-006: Proactive Prerequisite Alerts
- **Status:** `DONE`
- **Completed:** 2026-02-18
- **Priority:** MEDIUM
- **Depends on:** ENROLL-005
- **Scope:**
  - Backend: When `enroll_in_course` tool detects unmet prerequisites:
    - Return structured response: which prereqs are missing, which are in-progress, which are completed
    - AI suggests: "You need CS 101 first. You could take it next semester, or ask your advisor for a prerequisite override."
  - Backend: When student enrolls via UI (ENROLL-002) with unmet prerequisites:
    - Show warning modal: "This course requires CS 101 (not completed). Enroll anyway?" (if institution allows override)
    - If institution enforces strict prerequisites: block enrollment, show which are missing
  - Backend: `PlannerService.checkPrerequisites()` already exists — extend to return detailed status per prerequisite
  - Frontend: Prerequisite warning modal in catalog enrollment flow
  - Frontend: Badge on catalog cards: "Prerequisites met" (green) or "Missing prerequisites" (amber)
- **Acceptance:** Students are warned about missing prerequisites before enrolling. AI provides alternative paths. Institutions can configure strict vs warning-only prerequisite enforcement.

### ENROLL-007: Smart Course Discovery (AI-Powered Search)
- **Status:** `DONE`
- **Completed:** 2026-02-24
- **Priority:** LOW — Enhancement over catalog search
- **Depends on:** ENROLL-001, ENROLL-005
- **Scope:**
  - Backend: New AI tool `discover_courses`:
    - Input: `{ query: string }` — natural language query
    - Searches catalog by: credits, category/department, schedule, instructor, seat availability
    - Cross-references with degree requirements (via PlannerService) to highlight which results count toward the student's degree
    - Returns top 5-10 results with relevance explanation
  - Backend: Register in Course Planner agent
  - Examples:
    - "I need a 3-credit lab science" → filters by credits and category
    - "What counts toward my CS electives?" → cross-refs degree program requirements
    - "Morning classes on MWF" → schedule-based filter
    - "Courses with Dr. Smith" → instructor search
- **Acceptance:** Student can describe what they need in natural language and get relevant course recommendations that account for their degree progress.

### ENROLL-008: Bulk Enrollment (Admin)
- **Status:** `DONE`
- **Completed:** 2026-02-24
- **Priority:** LOW — Institutional scale feature
- **Depends on:** ENROLL-002
- **Scope:**
  - Backend: `EnrollmentService.bulkEnroll(csvData, sectionId, adminId)`:
    - Parse CSV (columns: email, optional role)
    - Validate all emails exist in tenant
    - Create enrollment records in a transaction
    - Return success/failure report (which enrolled, which failed and why)
  - Backend: `EnrollmentService.bulkDrop(enrollmentIds, adminId)` — with audit log
  - Backend: `EnrollmentService.bulkMoveSection(enrollmentIds, targetSectionId, adminId)` — drop from old + enroll in new, transactional
  - Backend: Mutations: `bulkEnrollFromCsv(sectionId, csvData)`, `bulkDropEnrollments(enrollmentIds)`, `bulkMoveEnrollments(enrollmentIds, targetSectionId)`
  - Frontend: Admin section management → "Bulk Enroll" button → CSV upload with preview
  - Frontend: Admin section management → multi-select students → "Move to Section" / "Drop Selected"
- **Acceptance:** Admin can upload CSV to bulk-enroll students. Admin can bulk-move/drop students across sections. All operations are transactional with error reporting.

### ENROLL-009: Enrollment Policy Engine
- **Status:** `TODO`
- **Priority:** LOW — Enterprise tier
- **Depends on:** ENROLL-003
- **Scope:**
  - Backend: Add enrollment policy fields to Tenant settings (JSONB):
    - `maxEnrollmentPerSection`: default section capacity
    - `enrollmentWindowStart` / `enrollmentWindowEnd`: per-term enrollment dates
    - `prerequisiteEnforcement`: `'strict' | 'warn' | 'off'`
    - `creditHourLimitPerTerm`: max credits a student can take
    - `crossListingEnabled`: boolean
  - Backend: Policy checks run on every enrollment attempt (UI or AI)
  - Backend: Admin UI for managing policies (extend existing admin panel)
  - Frontend: Admin settings page → enrollment policies section
- **Acceptance:** Tenant admin can configure enrollment policies. All enrollment paths (UI, AI, bulk) respect the configured policies.

### ENROLL-010: Waitlist Intelligence
- **Status:** `TODO`
- **Priority:** LOW — Nice-to-have for large institutions
- **Depends on:** ENROLL-009
- **Scope:**
  - Backend: New `Waitlist` entity or extend Enrollment with `waitlistPosition` column
  - Backend: When section is full → student placed on waitlist (new status: `waitlisted`)
  - Backend: `WaitlistService`:
    - On drop/withdraw → check waitlist → promote top student
    - Configurable: auto-enroll or send 24h confirmation window
    - Notification: "A spot opened in CS 101! Confirm by {deadline}"
    - If no confirmation → promote next student
  - Backend: Scheduled job for confirmation deadline expiration
  - Frontend: Waitlist position display: "You are #3 on the waitlist for CS 101"
  - Frontend: Confirmation prompt when promoted from waitlist
- **Acceptance:** Students are placed on waitlist when section is full. Auto-promotion on drops. Confirmation window is configurable. Position is visible to students.

### ENROLL-011: SIS Event-Driven Sync
- **Status:** `TODO`
- **Priority:** LOW — Enterprise integration
- **Depends on:** ENROLL-003
- **Scope:**
  - Backend: Webhook receiver endpoint: `POST /api/sis/webhook`
  - Backend: Support for common SIS event types: `enrollment.created`, `enrollment.updated`, `enrollment.deleted`
  - Backend: Student matching by email or external ID
  - Backend: Section matching by external code or LTI context (FEAT-011)
  - Backend: Conflict resolution: SIS is source of truth
  - Backend: Audit log for all SIS-originated changes
  - Backend: Webhook signature verification for security
  - Frontend: Admin integrations page → SIS configuration section
- **Acceptance:** External SIS can send enrollment events via webhook. NexusEd creates/updates/drops enrollments based on SIS data. All changes are audited.

---

## Sprint: AI Graduation Planner

> **Goal:** Every student gets a personalized, semester-by-semester graduation roadmap that adapts to their timeline, finances, and life circumstances. This is the DegreeWorks killer — 10x better UX, 10x cheaper, and AI-native.
>
> **Product thesis:** This may be a stronger product than the LMS itself. Many universities already have Canvas/Moodle but hate their degree audit tool or don't have one. NexusEd can be "the AI-native graduation planner that also has an LMS built in."
>
> **How it differs from FEAT-015:** The existing Course Planner tracks progress and checks prerequisites. This sprint generates a **complete semester-by-semester plan** that accounts for time, money, course availability, and life changes.

### GRAD-001: Constraint-Based Plan Generator
- **Status:** `DONE`
- **Completed:** 2026-02-18
- **Priority:** HIGH — Core planning algorithm
- **Depends on:** ONBOARD-001 (needs course availability data), FEAT-015 (existing planner infrastructure)
- **Scope:**
  - Backend: `GraduationPlannerService` that models planning as constraint satisfaction:
    - **Inputs:** StudentDegreeProfile (completed courses), target DegreeProgram, `maxCreditsPerSemester` (default 15), `targetGraduationDate` (or null = ASAP), `availableSemesters` (array of term types: Fall/Spring/Summer, plus specific terms to exclude like "Summer 2027"), `startTerm` (next available)
    - **Constraints:**
      - Prerequisites must be satisfied before a course can be scheduled
      - Corequisites must be in the same semester
      - Course availability — respect `offeredSemesters` from Course entity
      - Max credits per semester
      - Don't schedule completed or in-progress courses
    - **Algorithm:** Topological sort of prerequisite DAG → priority-based assignment (required courses first, then courses that unblock the most prerequisites, then electives) → greedy bin-packing into semesters respecting constraints → backtrack if a semester is infeasible
    - **Output:** `GraduationPlan` — ordered array of `PlannedSemester` (term, year, courses with credits, total credits, cumulative credits, cumulative progress %)
  - Backend: New entity `GraduationPlan` — stores generated plans per student (JSONB semesters, constraints used, generated timestamp, status: draft/active/archived)
  - Backend: Resolver: `generateGraduationPlan(input)` → GraduationPlan, `myGraduationPlans` → [GraduationPlan], `activateGraduationPlan(planId)`
  - Frontend: `/planner/roadmap` page — semester-by-semester view (columns or rows), courses shown as cards with code/title/credits, progress bar per semester, overall completion progress
- **Acceptance:** Student with 45 completed credits in a 120-credit CS program gets a semester-by-semester plan that respects prerequisites and course availability. Changing max credits from 15 to 9 stretches the plan from 5 semesters to ~9 semesters.

### GRAD-002: Dynamic Replanning
- **Status:** `DONE`
- **Completed:** 2026-02-19
- **Priority:** HIGH — Plans must adapt to reality
- **Depends on:** GRAD-001
- **Scope:**
  - Backend: `GraduationPlannerService.replan(planId, changes)` — regenerates from current state forward:
    - **Failed course:** Re-insert into next available semester, cascade downstream prerequisites
    - **Dropped course:** Rebalance remaining semesters
    - **Changed major:** Call `PlannerService.simulateMajorChange()` for credit transfer, generate new plan with remaining requirements
    - **Changed max credits/semester:** Stretch or compress timeline
    - **Semester off:** Shift everything forward, maintain prerequisite ordering
    - **Added/removed summer terms:** Rebalance accordingly
  - Backend: Plan diff — show what changed between old and new plan (courses moved, semesters added/removed, graduation date change)
  - Frontend: "What if..." controls on the roadmap page:
    - Toggle summer terms on/off
    - Slider for max credits per semester (9-18)
    - Graduation date picker (or "ASAP" toggle)
    - "Skip a semester" checkbox per future term
    - Plan regenerates on any change (debounced, ~500ms)
  - Frontend: Diff view — highlight changes from previous plan (courses that moved, new courses, removed courses)
  - AI integration: New tool `regenerate_graduation_plan` for Course Planner agent — student says "What if I take next summer off?" → AI replans
- **Acceptance:** Student toggles off Summer 2027 → plan regenerates instantly with courses redistributed. Student changes max credits from 15 to 12 → graduation date extends by N semesters. Diff shows exactly what changed.

### GRAD-003: Financial Projections
- **Status:** `DONE`
- **Completed:** 2026-02-19
- **Priority:** MEDIUM — Financial transparency is a differentiator
- **Depends on:** GRAD-001
- **Scope:**
  - Backend: Add tuition configuration to Tenant settings (JSONB):
    - `perCreditCost` (decimal), `flatRateRange` (min/max credits for flat rate, e.g., 12-18), `flatRateCost` (decimal), `summerPerCreditCost` (decimal, if different), `fees` (JSONB array of { name, amount, perSemester/perCredit })
  - Backend: `FinancialProjectionService`:
    - `calculateSemesterCost(credits, isSummer, tenantTuitionConfig)` — applies flat-rate logic, fees
    - `calculatePlanCost(graduationPlan, tenantTuitionConfig)` — total cost, per-semester breakdown
    - `comparePlans(planA, planB, config)` — "Plan A costs $48,000 over 8 semesters, Plan B costs $54,000 over 11 semesters"
  - Backend: Financial data included in GraduationPlan response — `estimatedCostPerSemester`, `estimatedTotalCost`
  - Frontend: Financial overlay on roadmap:
    - Cost shown per semester (below credit total)
    - Running total column
    - Comparison callout: "Taking 15 credits instead of 12 this Fall saves ~$6,000 total (graduate 1 semester earlier)"
  - AI integration: Course Planner can answer "How much will it cost if I go part-time next year?" — calls plan generator with modified constraints, returns cost comparison
- **Acceptance:** Student sees estimated cost per semester on their graduation plan. Changing max credits/semester shows updated cost projection. Admin configures tuition rates per tenant.

### GRAD-004: Financial Aid Awareness
- **Status:** `DONE`
- **Completed:** 2026-02-19
- **Priority:** MEDIUM — Critical for students on aid
- **Depends on:** GRAD-003
- **Scope:**
  - Backend: Financial aid rules per tenant (JSONB in Tenant settings):
    - `fullTimeThreshold` (int, typically 12 credits)
    - `halfTimeThreshold` (int, typically 6 credits)
    - `maxTimeframePercent` (int, typically 150 — SAP rule: can't exceed 150% of program length)
  - Backend: Aid status check per planned semester — flag semesters where credits drop below full-time
  - Frontend: Warning badges on roadmap:
    - Yellow: "Below full-time (12 credits) — may affect financial aid"
    - Red: "At 145% of program length — contact financial aid office about SAP"
  - AI integration: Proactive alerts — when student modifies plan in AI chat and it would affect aid, Course Planner warns them before confirming
- **Acceptance:** Student with a plan that drops to 9 credits in Spring 2027 sees a warning about aid eligibility on that semester. AI warns student before confirming a plan change that would affect aid status.

### GRAD-005: Course Availability Modeling
- **Status:** `DONE`
- **Completed:** 2026-02-26
- **Priority:** LOW — Enhancement for planning accuracy
- **Depends on:** GRAD-001, ONBOARD-001
- **Files Modified:**
  - `graduation-plan.entity.ts` — `availabilityWarning?: string` added to `PlannedCourseData` interface
  - `graduation-planner.types.ts` — `availabilityWarning?: string | null` added to `PlannedCourse` GQL type
  - `planner.module.ts` — added `CourseSection` + `Enrollment` to TypeORM feature list
  - `graduation-planner.service.ts` — `computeFillRates()` (2-query batch: section capacity + enrollment GROUP BY); `getAvailabilityWarning()` (term-constraint vs fill-rate); annotations applied in bin-packing step; `toResult()` passes warning through JSONB → GQL
  - `graduation-planner.ts` (frontend queries) — added `availabilityWarning` to courses fragment
  - `roadmap/page.tsx` — `AvailabilityBadge` component; renders "Fall only", "Spring only", "Summer only", "Fills fast" badges on each course chip
- **Warning types:**
  - `only_offered_fall/spring/summer` — course constrained to one term (student cannot reschedule)
  - `fills_quickly` — fill rate > 80% historically (enroll early)
- **Admin UI:** `offeredSemesters` already editable via ONBOARD-002 catalog admin
- **Acceptance:** ✓ Plan generation annotates courses with availability warnings. ✓ Roadmap page shows color-coded badges. ✓ Type-checks pass on both sides.
- **Acceptance:** Plan generator correctly avoids scheduling a Fall-only course in Spring. Courses that fill quickly are flagged on the roadmap. Admin can override availability per year.

### GRAD-006: Career-to-Curriculum Mapping
- **Status:** `TODO`
- **Priority:** LOW — Future differentiator ("what do I want to be when I grow up?")
- **Depends on:** GRAD-001
- **Scope:**
  - Backend: `CareerProfile` entity — job title, description, median salary range, required skills (JSONB), recommended degree programs (relation to DegreeProgram), recommended courses (relation to Course — for students in any program who want to build this skill set)
  - Backend: `CareerService` — CRUD, career-to-program matching, skill gap analysis (compare student's completed courses against career's recommended courses)
  - Backend: AI tool `explore_careers` — student describes interests → AI returns matching careers with program recommendations
  - Backend: AI tool `career_skill_gap` — given a career target, returns what courses the student still needs
  - Frontend: `/planner/careers` career explorer page:
    - Browse careers by category (tech, healthcare, business, education, etc.)
    - Career detail: description, salary range, required skills, recommended programs, recommended courses
    - "How do I get there?" button → shows skill gap → generates graduation plan optimized for that career
  - Admin UI: Career profile management (or seed with common careers per department)
- **Acceptance:** Student says "I want to be a data scientist" → AI shows relevant programs (CS, Stats, Data Science), identifies skill gap (needs STAT 301, CS 340), suggests courses. Student can generate a graduation plan optimized for that career path.

---

## Sprint: Mobile Readiness

> **Prerequisites:** All P0/P1 items DONE, core features stable. This sprint makes the web app fully usable on phones before considering a native app.
>
> **Goal:** Students can use NexusEd on their phones via a responsive web app. No native app needed yet.

### MOB-001: Responsive audit and fixes for all dashboard layouts
- **Status:** `DONE`
- **Completed:** 2026-02-24
- **Priority:** HIGH
- **Scope:** Sidebar navigation, top nav, all dashboard pages
- **Problem:** Dashboard layouts (sidebar, data tables, stat cards, course grids) haven't been tested or optimized for 375px-428px screens. Sidebar likely overlaps or is unusable on mobile.
- **Fix:**
  - Audit every `(dashboard)` page at 375px, 390px, and 428px breakpoints
  - Convert sidebar to a slide-out drawer on `md:` breakpoint (if not already)
  - Ensure top nav collapses gracefully (hamburger menu)
  - Fix any horizontal overflow on cards, tables, or grids
- **Acceptance:** Every dashboard page renders correctly on iPhone SE (375px) through iPhone 15 Pro Max (430px). No horizontal scroll. No overlapping elements. All interactive elements have minimum 44px touch targets.

### MOB-002: Responsive audit for course and assignment pages
- **Status:** `DONE`
- **Completed:** 2026-02-24
- **Priority:** HIGH
- **Scope:** Course list, course detail, timeline, assignment detail, submission form, grade view
- **Problem:** Course pages likely use fixed-width layouts or multi-column grids that break on small screens.
- **Fix:**
  - Course list: Stack cards vertically on mobile
  - Course detail/timeline: Single column, full-width cards
  - Submission form: Full-width textarea and file inputs
  - Grade view: Stack score/feedback vertically
- **Acceptance:** Student can browse courses, view timeline, submit assignments, and see grades — all on a phone without zooming or horizontal scrolling.

### MOB-003: Responsive audit for AI chat and messaging
- **Status:** `DONE`
- **Completed:** 2026-02-24
- **Priority:** HIGH
- **Scope:** AI chat (conversation list + thread), messaging (conversation list + thread)
- **Problem:** Two-panel chat layouts (list + thread side by side) don't work on small screens.
- **Fix:**
  - Mobile: Show conversation list OR thread (not both). Use back button to toggle.
  - Verify the existing `?conversation=` URL param pattern works for this
  - Ensure message input is sticky at the bottom and doesn't get hidden by mobile keyboard
  - Agent selector cards should stack or scroll horizontally
- **Acceptance:** Student can have a full AI conversation or send messages entirely on mobile. Keyboard doesn't obscure the input. Navigation between list and thread is intuitive.

### MOB-004: Responsive audit for admin pages
- **Status:** `DONE`
- **Completed:** 2026-02-24
- **Priority:** MEDIUM
- **Scope:** Analytics dashboard, AI governance, integrations, agent builder
- **Problem:** Admin pages use data-dense layouts (tables, charts, stat grids) that are hardest to make responsive.
- **Fix:**
  - Stat card grids: 2-col on mobile instead of 4-col
  - Data tables: Horizontal scroll with sticky first column, or switch to card-based layout
  - Charts: Full-width, reduce label density on small screens
  - Tabbed sections (governance): Horizontal scrollable tabs
- **Acceptance:** Admin can view analytics and manage governance settings on a tablet (768px). Phone (375px) is functional but tables may require horizontal scroll.

### MOB-005: Touch interaction polish
- **Status:** `DONE`
- **Completed:** 2026-02-24
- **Priority:** MEDIUM
- **Problem:** Web apps on mobile often have usability issues: tiny tap targets, no swipe gestures, hover-dependent interactions.
- **Fix:**
  - Ensure all buttons and interactive elements have minimum 44x44px touch targets (WCAG 2.5.8)
  - Remove hover-only interactions (tooltip content must be accessible via tap)
  - Add pull-to-refresh on feed page (if PWA supports it)
  - Test and fix any `title` attributes that rely on hover for information
- **Acceptance:** Lighthouse mobile accessibility score >= 95. No tap targets smaller than 44px. No information accessible only via hover.

### MOB-006: PWA enhancement — offline feed caching
- **Status:** `TODO`
- **Priority:** LOW
- **Depends on:** FEAT-009 (PWA already done)
- **Problem:** FEAT-009 added PWA shell but service worker uses network-first for pages. Students on spotty campus WiFi lose access entirely when offline.
- **Fix:**
  - Cache the last-fetched feed data in IndexedDB (via service worker or in-app)
  - Show stale feed with "Last updated X minutes ago" banner when offline
  - Cache course detail pages the student has visited recently
  - Queue assignment submissions for retry when back online (stretch goal)
- **Acceptance:** Student can open the app offline and see their last-loaded feed and recently visited course pages. Submissions queue when offline and submit when reconnected.

---

## Sprint: Phase A — Complete Web Platform

> **Goal:** Fill remaining gaps so the backend API is complete and stable for the mobile app. Add a public-facing presence so people can discover the product.
>
> **Sequence:** A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8 (roughly, some can run in parallel)

### A1: Merge Graduation Planner Branch
- **Status:** `DONE`
- **Completed:** 2026-02-23 — GRAD-001–004 commits already on main branch
- **Acceptance:** ✓ GRAD-001–004 code is on main. Build passes.

### INFRA-001: File Upload Service (Cloudflare R2)
- **Status:** `DONE`
- **Completed:** 2026-02-23
- **Files Created:**
  - Backend: `src/config/storage.config.ts`, `src/modules/uploads/uploads.module.ts`, `src/modules/uploads/uploads.service.ts`, `src/modules/uploads/uploads.resolver.ts`, `src/modules/uploads/entities/file-upload.entity.ts`, `src/modules/uploads/dto/uploads.types.ts`
  - Frontend: `src/lib/graphql/mutations/uploads.ts`, `src/lib/graphql/queries/uploads.ts`, `src/components/uploads/file-upload.tsx`, `src/components/uploads/file-attachment-list.tsx`
- **Files Modified:** `app.module.ts`, `database/entities/index.ts`, `.env.example`, `submission-form.tsx`
- **Key decisions:**
  - Two-phase upload: `requestUpload` → client PUT to R2 → `confirmUpload`. Backend never handles file bytes.
  - `confirmed` flag prevents orphan records from failed uploads appearing in queries
  - R2 key structure: `{tenantId}/{context}/{userId}/{uuid}.{ext}` — tenant isolation at storage level
  - Per-context constraints: 4 contexts (assignment_submission/profile_picture/course_content/import_document) each with size limits and allowed mime types
  - `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` — R2/S3 interchangeable via endpoint config
- **Acceptance:** ✓ Backend builds clean. ✓ Frontend builds clean. Student can attach files to assignment submissions with drag-and-drop and progress tracking. Presigned download URLs generated on demand.
- **Priority:** HIGH — Both web and mobile depend on this
- **Scope:**
  - Backend: New `uploads` module with:
    - `UploadMetadata` entity: filename, originalName, mimeType, sizeBytes, storageKey, tenantId, uploadedById, context (enum: assignment_submission, profile_picture, content_attachment, course_image), createdAt
    - `UploadsService`: generatePresignedUploadUrl(context, mimeType, sizeBytes), generatePresignedDownloadUrl(key), validateUpload(context, mimeType, sizeBytes), deleteFile(key)
    - `UploadsResolver`: GraphQL mutations — requestUpload(input) → { uploadUrl, key, expiresAt }, confirmUpload(key) → UploadMetadata; Query — uploads(context, entityId) → [UploadMetadata]
    - Size limits per context: assignments 50MB, profiles 5MB, content 25MB
    - Type restrictions: assignments (pdf, doc, docx, png, jpg, txt), profiles (png, jpg, webp), content (pdf, png, jpg, gif, svg)
  - Frontend: Reusable `FileUpload` component — drag-and-drop zone, progress bar, file type/size validation on client
  - Frontend: Integrate into assignment submission form (attach files alongside text)
  - Frontend: Profile picture upload in user settings
  - Frontend: Image/file insertion in Tiptap content editor
  - Infrastructure: Cloudflare R2 bucket with S3-compatible API, `@aws-sdk/client-s3` for presigned URLs
- **Acceptance:** Student can attach a PDF to an assignment submission. Instructor can upload images into course content. Profile pictures work. All uploads are tenant-scoped and presigned (NestJS never handles file bytes).

### INFRA-002: Email Notification Service
- **Status:** `DONE`
- **Completed:** 2026-02-23
- **Priority:** HIGH — Universities expect email notifications
- **Scope:**
  - Backend: New `notifications` module with:
    - Resend SDK integration (or SendGrid — Resend is simpler, better DX)
    - Email template system with NexusEd branding (from address, logo, colors)
    - Event-driven triggers via EventEmitter2:
      - `SUBMISSION_GRADED` → email student: "Your submission for {assignment} was graded: {score}/{points}"
      - `ASSIGNMENT_CREATED` → email section: "New assignment in {courseCode}: {title}, due {dueDate}"
      - `ENROLLMENT_CREATED` (active) → email student: "You're enrolled in {courseCode}"
      - Due date reminders (cron job): 24h before and 2h before unsubmitted assignments
    - User notification preferences: `notificationPreferences` JSONB on User entity (emailOnGrade, emailOnAssignment, emailOnDueReminder, emailOnMessage — all default true)
  - Frontend: Notification preferences page in user settings
  - Infrastructure: Resend API key in env vars, domain verification
- **Acceptance:** Student gets an email when graded. Instructor's section gets email when assignment created. Due date reminders fire. Users can disable specific email types.

### INFRA-003: Push Notification Infrastructure
- **Status:** `DONE`
- **Completed:** 2026-02-23
- **Priority:** HIGH — Foundation for mobile push (Phase B) and web push
- **Scope:**
  - Backend:
    - `Notification` entity: userId, tenantId, type (enum), title, body, data (JSONB for deep linking), read (boolean), createdAt
    - `DeviceToken` entity: userId, tenantId, platform (web/ios/android), token, createdAt, lastUsedAt
    - `NotificationsService`: create, markAsRead, markAllAsRead, getUnread, getAll (paginated)
    - `PushService`: provider abstraction interface, WebPushProvider (VAPID), FCMProvider (added in Phase B)
    - `NotificationsResolver`: GraphQL queries (myNotifications, unreadNotificationCount) and mutations (markNotificationRead, markAllNotificationsRead, registerDeviceToken)
    - Event-driven: same events as email, but push as well (user preference controls which channel)
  - Frontend: VAPID web push subscription in service worker
  - Frontend: Notification inbox (bell icon in top nav, dropdown with notification list, link to full page)
  - Frontend: Badge count on bell icon
- **Acceptance:** Student gets a web push notification when graded. Bell icon shows unread count. Clicking notification navigates to relevant page. Device token stored for future mobile push.

### FEAT-016: Discussion Threads
- **Status:** `DONE`
- **Completed:** 2026-02-23
- **Priority:** MEDIUM — Core LMS table stakes
- **Scope:**
  - Backend:
    - `Discussion` entity: tenantId, sectionId, authorId, title, body (rich text), isPinned, isLocked, isAnswered, replyCount, createdAt, updatedAt
    - `DiscussionReply` entity: tenantId, discussionId, authorId, parentReplyId (for threading), body (rich text), isInstructorAnswer, createdAt
    - `DiscussionsService`: CRUD, reply, pin/lock/markAnswered (instructor), tenant-scoped, paginated
    - `DiscussionsResolver`: queries (sectionDiscussions, discussion, discussionReplies) and mutations (createDiscussion, replyToDiscussion, pinDiscussion, lockDiscussion, markAsAnswered)
    - Integration: Discussions appear in course timeline as `DISCUSSION` type entries
    - @mention parsing: extract @username from body, create notification for mentioned user
  - Frontend:
    - Discussion list view in timeline (card with title, author, reply count, answered badge)
    - Discussion detail page: OP + threaded replies, reply form with Tiptap editor
    - Instructor controls: pin, lock, mark as answered
    - "New Discussion" button in timeline (all enrolled users)
- **Acceptance:** Students can create discussions in a course section. Replies are threaded. Instructors can pin/lock/mark answered. Discussions show in timeline. @mentions trigger notifications.

### FEAT-017: Quiz Engine
- **Status:** `DONE`
- **Completed:** 2026-02-23
- **Priority:** MEDIUM — Core LMS table stakes
- **Scope:**
  - Backend:
    - `QuizQuestion` entity: assignmentId, questionText, questionType (enum: multiple_choice, true_false, short_answer), options (JSONB: [{ text, isCorrect }]), points, order
    - Extend `Submission` entity: answers (JSONB: [{ questionId, selectedOption, textAnswer }]), autoScore (number, auto-calculated)
    - `QuizService`: createQuiz (assignment + questions), submitQuiz (auto-grade MCQ/TF, manual grade short-answer), getQuizWithQuestions (instructor), getQuizForStudent (no answers shown)
    - `QuizResolver`: mutations (addQuizQuestions, updateQuizQuestion, deleteQuizQuestion, submitQuiz), queries (quizQuestions — instructor only)
    - Auto-grading: sum points for correct MCQ/TF answers, skip short-answer (instructor grades manually)
    - Attempt tracking: configurable maxAttempts on Assignment entity, reject submission if exceeded
    - Optional time limit: startedAt on Submission, reject if submission time exceeds Assignment.timeLimitMinutes
  - Frontend:
    - Quiz builder UI for instructors: add/edit/reorder questions, set points, set correct answers
    - Quiz delivery UI for students: question-by-question or all-at-once (configurable), countdown timer, submit confirmation
    - Auto-score display after submission (MCQ/TF), "Pending manual review" for short-answer
    - Attempt counter: "Attempt 2 of 3"
- **Acceptance:** Instructor can create a quiz with 10 MCQ questions. Student takes the quiz and sees auto-graded score immediately. Short-answer questions require manual grading. Time limits and attempt limits work.

### MOB-001: Responsive Dashboard Layouts
- **Status:** `DONE`
- **Priority:** MEDIUM
- **Scope:** Audit and fix all `(dashboard)` pages at 375px, 390px, 428px. Sidebar → slide-out drawer. Top nav collapses. No horizontal overflow.
- **Acceptance:** Every dashboard page renders correctly on iPhone SE through iPhone 15 Pro Max.

### MOB-002: Responsive Course & Assignment Pages
- **Status:** `DONE`
- **Priority:** MEDIUM
- **Scope:** Course list, detail, timeline, assignment detail, submission form, gradebook — all single-column on mobile.
- **Acceptance:** Student can browse, submit, and view grades on phone without zooming.

### MOB-003: Responsive AI Chat & Messaging
- **Status:** `DONE`
- **Priority:** MEDIUM
- **Scope:** Two-panel → single-panel with back button on mobile. Keyboard doesn't obscure input. Agent selector stacks.
- **Acceptance:** Full AI conversation and messaging on mobile.

### MOB-004: Responsive Admin Pages
- **Status:** `DONE`
- **Priority:** LOW
- **Scope:** Stat grids → 2-col on mobile. Tables → horizontal scroll or card layout. Functional on tablet, usable on phone.
- **Acceptance:** Admin can view analytics on tablet. Phone is functional.

### MOB-005: Touch Interaction Polish
- **Status:** `DONE`
- **Priority:** LOW
- **Scope:** 44px tap targets, remove hover-only interactions, pull-to-refresh on feed.
- **Acceptance:** Lighthouse mobile accessibility >= 95.

### SITE-001: Landing Page
- **Status:** `DONE`
- **Priority:** HIGH — Product must be discoverable
- **Scope:**
  - New `(marketing)` route group in existing Next.js app — public, no auth required
  - Landing page at `/` replacing current redirect to `/login`:
    - Hero section: "The AI-native LMS that puts students first" + product screenshot or animated demo
    - Problem statement: The 4 problems from MISSION.md (filing cabinet UX, fragmented experience, no personalization, broken advising)
    - Feature showcase: 6-8 key features with screenshots (feed, graduation planner, AI chat, catalog import, course timeline, governance console)
    - Differentiator callouts: "Upload your PDF catalog → AI sets up your institution" and "I need a 3-credit elective → AI enrolls you"
    - Social proof section (placeholder for testimonials/university logos)
    - CTA: "Request a Demo" / "Try it Free"
    - Footer: links to Features, About, Login, Register
  - Shared layout with marketing nav (NexusEd logo, Features, About, Login, Get Started)
  - Responsive, accessible (same Tailwind + shadcn system)
- **Acceptance:** Visiting nexused.app (or localhost:3000) shows a professional landing page. Login/Register are accessible from nav. Page is responsive and accessible.

### SITE-002: Features Page
- **Status:** `DONE`
- **Priority:** MEDIUM
- **Scope:**
  - `/features` page with detailed breakdown of each feature category:
    - AI-Powered Learning (Study Coach, Feedback Copilot, Custom Agents)
    - Smart Enrollment (catalog, AI discovery, prerequisite alerts)
    - Graduation Planning (constraint-based plans, financial projections, aid awareness)
    - Institutional Management (AI governance, analytics, LTI, catalog import)
    - For Students / For Instructors / For Admins sections
  - Screenshots or mockup images for each feature
- **Acceptance:** A prospective user can understand what NexusEd does and how it differs from Canvas/Moodle/Brightspace.

### SITE-003: About Page
- **Status:** `DONE`
- **Priority:** MEDIUM
- **Scope:**
  - `/about` page with:
    - The story (adapted from MISSION.md — the UVic frustration, the advisor who liked it but couldn't act, building it yourself)
    - Vision statement
    - Contact form or email for institutional inquiries
  - Authentic, human — this story is NexusEd's strongest marketing asset
- **Acceptance:** A university decision-maker can read why NexusEd exists and reach out.

---

## Sprint: Phase B — React Native Mobile App

> **Goal:** Focused student mobile app in the monorepo. Shares backend GraphQL API. Student-only — instructors and admins use the web.
>
> **Prerequisites:** Phase A must be complete (file uploads, notifications, discussions, quizzes all available via API).
>
> See [ROADMAP.md](./ROADMAP.md) Phase B for the full breakdown of MOB-APP-001 through MOB-APP-010.

### MOB-APP-001: Expo Project Setup
- **Status:** `DONE`
- **Priority:** HIGH — Foundation for all mobile work
- **Scope:** Expo + Expo Router in `nexused-mobile/`, Apollo Client, shared types, expo-secure-store, biometric auth
- **Acceptance:** App scaffolded, builds for iOS simulator, can reach backend GraphQL endpoint.

### MOB-APP-002: Mobile Auth Flow
- **Status:** `DONE`
- **Scope:** Login, register, biometric unlock, persistent session

### MOB-APP-003: Mobile Feed / Home
- **Status:** `DONE`
- **Scope:** AI-prioritized feed, pull-to-refresh, navigation to items

### MOB-APP-004: Mobile Courses
- **Status:** `DONE`
- **Scope:** Course list, detail, timeline view

### MOB-APP-005: Mobile Assignments
- **Status:** `DONE`
- **Completed:** 2026-02-24
- **Scope:** Detail view, text + camera + file submission, submission history

### MOB-APP-006: Mobile Grades
- **Status:** `DONE`
- **Scope:** Grade summary, per-course breakdown

### MOB-APP-007: Mobile Messages
- **Status:** `DONE`
- **Scope:** Conversation list, thread with Socket.IO, compose

### MOB-APP-008: Mobile AI Chat
- **Status:** `DONE`
- **Scope:** Agent selection, conversation, tool indicators

### MOB-APP-009: Mobile Push Notifications
- **Status:** `DONE`
- **Completed:** 2026-02-24
- **Scope:** FCM integration, device token registration, notification inbox, deep linking

### MOB-APP-010: Mobile Profile & Settings
- **Status:** `DONE`
- **Completed:** 2026-02-24
- **Scope:** Profile edit, notification preferences, theme

---

## Sprint: Phase C — Go-to-Market (Deferred)

> **Deferred until product is complete and tested.** See [ROADMAP.md](./ROADMAP.md) Phase C for full details.
> Tasks: BIZ-001 (Stripe), BIZ-002 (Onboarding), BIZ-003 (SAML), BIZ-004 (LTI AGS), ENROLL-007–011, GRAD-005–006, Parent Role

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

### Built Differentiators (Moved from Planned)

| ID | Gem | Status | Key Files |
|----|-----|--------|-----------|
| GEM-011 | AI-assisted institutional onboarding | ✅ DONE | `catalog-extract.service.ts` |
| GEM-012 | AI-native enrollment | ✅ DONE | `enroll_in_course` tool, enrollment tools |
| GEM-013 | Constraint-based graduation planner | ✅ DONE (in branch) | `graduation-planner.service.ts` |
| GEM-014 | Financial-aware academic planning | ✅ DONE (in branch) | `financial-projection.service.ts` |

### Planned Differentiators (Not Yet Built)

| ID | Gem | Sprint | Why It Matters |
|----|-----|--------|----------------|
| GEM-015 | Career-to-curriculum mapping | GRAD-006 (Phase C) | "I want to be a data scientist" → AI builds a graduation plan toward that career. |
| GEM-016 | Native mobile app with push | Phase B | Students get due dates, grades, messages via native push. Camera submissions from phone. |

---

*Last updated: 2026-02-21 (Added Phase A/B/C sprints: INFRA-001–003, FEAT-016–017, MOB-001–005, SITE-001–003, MOB-APP-001–010)*
*This file is the primary task reference for all development sessions.*
