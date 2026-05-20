# Axis — Test Coverage Audit

> **Status as of 2026-05-13**
>
> Industry-standard coverage target: **≥80% line coverage** on backend, **critical path E2E** on frontend.
> Current state: ~22% of services tested, 100% of resolver guard wiring, 0% frontend.

---

## Summary Scorecard

| Layer | Files Exist | Tests Exist | Coverage |
|-------|------------|-------------|----------|
| Backend — Services | 32 | 7 | ~22% |
| Backend — Resolvers | 27 | 27 (guard wiring) | 100% guard wiring |
| Backend — Guards | 4 | 1 | 25% |
| Backend — Controllers | 4 | 1 | 25% |
| Backend — E2E | — | 1 (courses integration) | partial |
| Frontend — Components | 148+ tsx | 0 | 0% |
| Frontend — E2E (Playwright) | — | 0 | 0% |

**Overall: improving but still below industry standard.** The security-critical surface (auth service, guard wiring, resolver roles) is now covered. Business logic and E2E flows remain the gap.

---

## What Exists (Green)

| File | Type | Notes |
|------|------|-------|
| `src/app.controller.spec.ts` | Unit | Scaffold default — trivially passes |
| `src/modules/auth/auth.service.spec.ts` | Unit | ✅ Added — login, register, password hashing, JWT (TEST-001) |
| `src/modules/users/users.service.spec.ts` | Unit | ✅ Added — tenant-scoped queries, FERPA (TEST-002) |
| `src/modules/ai/governance.service.spec.ts` | Unit | Good coverage of permission tiers |
| `src/modules/assignments/assignments.service.spec.ts` | Unit | Has factory helpers, mock repo pattern |
| `src/modules/courses/courses.service.spec.ts` | Unit | Reasonable coverage |
| `src/modules/feed/feed.service.spec.ts` | Unit | Covers personalization logic |
| `src/modules/feed/feed-personalization.service.spec.ts` | Unit | Covers scoring logic |
| `src/guards/roles.guard.spec.ts` | Unit | ✅ Added — all role boundary cases (TEST-004 partial) |
| `src/test/resolver-guards.spec.ts` | Unit | ✅ Added — all 27 resolvers, guard + role metadata (TEST-010) |
| `test/courses.e2e-spec.ts` | Integration | ✅ Added — unauthenticated/wrong-role/cross-tenant checks on CoursesResolver |
| `src/test/mocks/repository.mock.ts` | Helper | Mock TypeORM repo — good, reuse everywhere |
| `src/test/factories.ts` | Helper | Entity factories — good, extend for all entities |

---

## What's Missing (Red)

### Backend — Services (24 untested)

| Service | Priority | Why It Matters |
|---------|----------|----------------|
| `auth.service.ts` | ✅ Done | — |
| `users.service.ts` | ✅ Done | — |
| `tenant.service.ts` | **P0** | Multi-tenant isolation boundary |
| `assignments.service.ts` | P0 | Grading logic, submission deadlines |
| `enrollment-policy.service.ts` | P1 | Business rules for enrollment caps, prerequisites |
| `waitlist.service.ts` | P1 | Waitlist promotion logic — complex state machine |
| `quiz.service.ts` | P1 | Auto-grading, score calculation |
| `ai.service.ts` | P1 | Orchestrates all AI calls — expensive to debug |
| `agent-executor.service.ts` | P1 | Multi-turn loop — many edge cases |
| `governance.service.ts` | ✅ Done | — |
| `context.service.ts` | P1 | Snapshot correctness affects AI hallucination |
| `usage-tracking.service.ts` | P1 | Billing-adjacent — must not over/under count |
| `messaging.service.ts` | P1 | Direct messages, thread isolation |
| `announcements.service.ts` | P2 | CRUD + tenant scope |
| `courses.service.ts` | ✅ Done | — |
| `csv-import.service.ts` | P1 | Parses untrusted user input — edge cases everywhere |
| `academic-terms.service.ts` | P2 | Relatively simple CRUD |
| `analytics.service.ts` | P2 | Aggregation queries |
| `content.service.ts` | P2 | File metadata + tenant scope |
| `catalog-extract.service.ts` | P2 | External AI call + parsing |
| `discussions.service.ts` | P2 | Threaded replies |
| `lti.service.ts` | P2 | External protocol — high failure surface |
| `email.service.ts` | P2 | Side effects — must mock Nodemailer/SES |
| `in-app-notification.service.ts` | P2 | Event-driven delivery |
| `graduation-planner.service.ts` | P2 | Degree requirement logic |
| `planner.service.ts` | P2 | Complex scheduling |
| `career.service.ts` | P3 | External API wrapper |
| `financial-projection.service.ts` | P3 | Math-heavy — table-driven tests ideal |
| `web-push.service.ts` | P3 | Third-party wrapper |
| `due-date-reminder.service.ts` | P3 | Cron job logic |
| `uploads.service.ts` | P3 | S3 mock — mostly integration |
| `agent-registry.service.ts` | P3 | Registry lookup |
| `custom-agent.service.ts` | P3 | Config parsing |
| `lti-cleanup.service.ts` | P3 | Scheduled cleanup |
| `email-templates.service.ts` | P3 | Template rendering |

---

### Backend — Resolvers ✅ Guard wiring complete (TEST-010)

All 27 resolvers are covered by `src/test/resolver-guards.spec.ts`. The tests use `Reflect.getMetadata` to verify `@UseGuards()` and `@Roles()` decorator presence — zero DI overhead, catches silent decorator removal.

**Remaining gap:** Resolver *behavior* tests (service call wiring, input validation, `@CurrentUser()` injection) are not yet written. Guard wiring ≠ full resolver coverage.

| Resolver | Guard Wiring | Behavior Tests |
|----------|-------------|----------------|
| `users.resolver.ts` | ✅ | ❌ |
| `admin-users.resolver.ts` | ✅ | ❌ |
| `courses.resolver.ts` | ✅ | ❌ |
| `admin-courses.resolver.ts` | ✅ | ❌ |
| `student-catalog.resolver.ts` | ✅ | ❌ |
| `assignments.resolver.ts` | ✅ | ❌ |
| `ai.resolver.ts` | ✅ | ❌ |
| `governance.resolver.ts` | ✅ | ❌ |
| `announcements.resolver.ts` | ✅ | ❌ |
| `feed.resolver.ts` | ✅ | ❌ |
| `messaging.resolver.ts` | ✅ | ❌ |
| `discussions.resolver.ts` | ✅ | ❌ |
| `notifications.resolver.ts` | ✅ | ❌ |
| `quiz.resolver.ts` | ✅ | ❌ |
| `uploads.resolver.ts` | ✅ | ❌ |
| `content.resolver.ts` | ✅ | ❌ |
| `planner.resolver.ts` | ✅ | ❌ |
| `analytics.resolver.ts` | ✅ | ❌ |
| All others (9) | ✅ | ❌ |

---

### Backend — Guards (3 untested, P1)

| Guard | Status | What to Test |
|-------|--------|-------------|
| `roles.guard.ts` | ✅ Done | — |
| `jwt-auth.guard.ts` | ❌ Missing | Rejects missing token, accepts valid JWT, reads cookie first then header |
| `local-auth.guard.ts` | ❌ Missing | Delegates to LocalStrategy correctly |
| `gql-throttler.guard.ts` | ❌ Missing | Throttle fires after N requests, skips excluded resolvers |

---

### Backend — E2E (partial — P1)

E2E tests spin up the real NestJS app + real database (use a test DB). They're the only way to catch:
- TypeORM query bugs that mocks hide
- Guard + strategy interaction bugs
- Cookie/auth flow bugs

| File | Status | What It Covers |
|------|--------|----------------|
| `test/courses.e2e-spec.ts` | ✅ Exists | Unauthenticated rejection, wrong-role rejection, cross-tenant isolation on CoursesResolver |
| `test/app.e2e-spec.ts` | ⚠️ Scaffold | NestJS default — trivially passes |

**Still missing:**

```
test/
  auth.e2e-spec.ts             — register → login → cookie → logout
  tenant-isolation.e2e-spec.ts — tenantA user cannot read tenantB data (general)
  assignment-flow.e2e-spec.ts  — create section → create assignment → submit → grade
  ai-governance.e2e-spec.ts    — blocked action returns 403
  rate-limiting.e2e-spec.ts    — hit throttle limit, get 429
```

---

### Frontend — Components (148 files, 0 tests)

Zero frontend tests is acceptable during early development but not before a demo or production. Industry standard for a Next.js app:

| Test Type | Tool | Coverage Target |
|-----------|------|----------------|
| Component unit tests | Vitest + React Testing Library | Critical interactive components |
| Hook tests | Vitest + renderHook | Custom hooks in `src/hooks/` |
| E2E flows | Playwright | All critical user paths |

**Critical paths that MUST have Playwright E2E tests before production:**

```
e2e/
  auth.spec.ts             — login, logout, redirect to dashboard
  enrollment.spec.ts       — student browses catalog, enrolls in course
  assignment.spec.ts       — student submits assignment
  grading.spec.ts          — instructor views submissions, grades one
  ai-chat.spec.ts          — student opens AI chat, sends message, receives response
  admin-tenant.spec.ts     — admin creates tenant, verifies isolation
```

**Component unit tests (priority order):**

| Component | Why |
|-----------|-----|
| `AuthGuard` | Redirect logic is security-relevant |
| `auth/login-form.tsx` | Validation, error states |
| `auth/register-form.tsx` | Validation, error states |
| `ai/chat-interface.tsx` | Complex state — optimistic updates, tool call display |
| `courses/enrollment-button.tsx` | Waitlist vs direct enroll states |
| `assignments/submission-form.tsx` | File upload + text, deadline handling |

---

## Industry-Standard Checklist

These are the things a real production LMS needs checked before each release. Use this as your PR review gate.

### Security Tests (MUST PASS — block merge if failing)

- [x] **Tenant isolation**: `courses.e2e-spec.ts` covers cross-tenant rejection on CoursesResolver
- [ ] **Tenant isolation (full)**: General E2E — tenantA user cannot access tenantB grades, messages, submissions
- [ ] **JWT guard**: Unit test confirms unauthorized requests are rejected with 401
- [x] **Role guard**: `roles.guard.spec.ts` covers all role boundary cases (STUDENT blocked from ADMIN mutations)
- [x] **Resolver guard wiring**: All 27 resolvers verified to have correct `@UseGuards` + `@Roles` metadata
- [ ] **Rate limiting**: Test that brute-force login is throttled (429 after N attempts)
- [ ] **FERPA**: Student records not exposed to other students via `assignmentSubmissions`
- [ ] **Cookie security**: httpOnly cookie set on login, cleared on logout, not readable by JS

### Data Integrity Tests (MUST PASS)

- [ ] **Transaction rollback**: Failing mid-flight enrollment leaves no orphaned rows
- [ ] **Unique constraints**: Duplicate enrollment (same student + section) returns error, not duplicate row
- [ ] **Soft delete consistency**: Deleted courses don't appear in student catalog
- [ ] **Grade calculation**: Final grade formula produces correct output for edge cases (zero submissions, late penalty, extra credit)

### AI Module Tests (MUST PASS)

- [ ] **Governance blocks**: `blocked` action type returns 403, not 500
- [ ] **Token budget**: Usage over daily limit is rejected before calling Claude API
- [ ] **Tool execution**: Each of the 16 tools executes without throwing on valid input
- [ ] **Context snapshot**: `ContextService` returns correct student state (not another student's)

### Regression Tests (Check on Every PR)

- [ ] Login → dashboard flow works end-to-end
- [ ] Course enrollment updates waitlist correctly
- [ ] File upload returns accessible URL
- [ ] AI chat sends + receives a message

---

## Coverage Targets

| Layer | Current | Minimum (pre-demo) | Target (pre-production) |
|-------|---------|-------------------|------------------------|
| Backend unit (line) | ~22% | 60% | 80% |
| Backend E2E | partial (courses) | auth + tenant isolation | all critical flows |
| Frontend component | 0% | 0% (acceptable) | 40% on interactive components |
| Frontend E2E | 0% | 3 flows | all 6 critical paths |

Run coverage report:
```bash
# Backend
cd axis-backend && npm run test:cov

# Frontend (once Vitest is configured)
cd axis-frontend && npm run test:cov
```

---

## How to Add Tests — Quick Patterns

### Unit test (service with repo mock)
```typescript
// Copy the pattern from assignments.service.spec.ts
// Use createMockRepository() from src/test/mocks/repository.mock.ts
// Use entity factories from src/test/factories.ts
```

### Resolver test (guard wiring)
```typescript
describe('CoursesResolver', () => {
  it('should require JwtAuthGuard', () => {
    const guards = Reflect.getMetadata('__guards__', CoursesResolver);
    expect(guards).toContain(JwtAuthGuard);
  });
});
```

### E2E test (supertest)
```typescript
// test/e2e/auth.e2e-spec.ts
// Use @nestjs/testing createNestApplication
// Use a separate test database (DATABASE_NAME=axis_test in .env.test)
// Seed with factories, teardown after each test
```

### Frontend E2E (Playwright)
```typescript
// e2e/auth.spec.ts
test('login redirects to dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'student@test.edu');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/home');
});
```

---

## Backlog Reference

| Backlog ID | Task | Priority | Status |
|-----------|------|----------|--------|
| TEST-001 | Auth service unit tests | P0 | ✅ Done |
| TEST-002 | Users service unit tests | P0 | ✅ Done |
| TEST-003 | Tenant isolation E2E | P0 | ⚠️ Partial (courses only) |
| TEST-004 | JWT + Roles guard unit tests | P1 | ⚠️ Partial (roles only) |
| TEST-005 | Assignment flow E2E | P1 | ❌ TODO |
| TEST-006 | AI governance E2E | P1 | ❌ TODO |
| TEST-007 | Enrollment/waitlist service unit tests | P1 | ❌ TODO |
| TEST-008 | Rate limiting E2E | P1 | ❌ TODO |
| TEST-009 | Remaining service unit tests (batch) | P2 | ❌ TODO |
| TEST-010 | All resolver guard wiring tests | P2 | ✅ Done |
| TEST-011 | Frontend Playwright setup + 3 flows | P2 | ❌ TODO |
| TEST-012 | Frontend component tests (auth forms + AI chat) | P3 | ❌ TODO |
| TEST-013 | Full Playwright suite (6 flows) | P3 | ❌ TODO |
