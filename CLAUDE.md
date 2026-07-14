# CLAUDE.md

## Context Loading (MANDATORY — Every Conversation)

**Before doing ANY work**, read these docs to understand the system you're working in. This is not optional — skipping this leads to wrong decisions, inconsistent code, and wasted time.

### Always Read First (every session, every task)
1. **`ARCHITECTURE.md`** — System design, module map, data flow, AI engine. Read this to know where things live and how they connect.
2. **`CONVENTIONS.md`** — Code patterns, naming rules, file structure. Read this to write code that matches the codebase.
3. **`DESIGN-SYSTEM.md`** — UI principles, color tokens, component patterns. Read this before touching any frontend code.

### Read When Relevant
4. **`DATA-MODEL.md`** — Entity fields, relationships, JSONB contracts. Read before creating/modifying entities or writing queries.
5. **`SECURITY.md`** — Auth model, tenant isolation, FERPA. Read before touching auth, tenancy, or user data.
6. **`TECH_STACK.md`** — Technology decisions with rationale. Read before proposing new dependencies or architectural changes.
7. **`GTM.md`** — Go-to-market: market facts, positioning, beachhead, outreach rules (CASL), legal primer. Read before any business, outreach, or positioning task.
8. **`MISSION.md`** + **`shaafilook.md`** — The why (UVic story, fragmentation problem) and the field research. Read before product/UX decisions.

### Read During Chef Mode (task execution)
7. **`.claude/session-log.md`** — What was done last session, current state.
8. **`BACKLOG.md`** — Prioritized task list.
9. **`ROADMAP.md`** — Phase structure.

**The first 3 docs give you the mental model. Without them, you're coding blind.**

---

## Quick Start — "Chef Mode"

When Shaafi says **"chef it up"**, **"start cooking"**, **"build"**, or any variation — this is the protocol:

1. **Read the kitchen** — Scan these files in order:
   - `.claude/session-log.md` → What was done last, what's the current state
   - `BACKLOG.md` → The prioritized task list (P0 → P1 → P2 → P3 → Features)
   - `ROADMAP.md` → The phase structure and what phase we're in
   - (The core docs — ARCHITECTURE, CONVENTIONS, DESIGN-SYSTEM — should already be loaded per the Context Loading section above)
2. **Pick up the next task** — Find the highest-priority `TODO` item in `BACKLOG.md`. P0 before P1. P1 before P2. Never skip priority levels.
3. **Announce what you're cooking** — Tell Shaafi in 1-2 sentences what you're about to build and why it's the right next thing.
4. **Cook** — Implement it fully. Production-quality. No placeholders. No "we'll add this later."
5. **Update the log** — When done, update `BACKLOG.md` (mark task `DONE`) and `.claude/session-log.md` (add what was built).
6. **Commit and push** — For features/architecture work: create a branch, commit, push, and open a PR. For small fixes: push directly to main. See "Branch Strategy" and "Git Auto-Commit" sections below.
7. **Serve and move on** — Brief summary of what was done, then immediately pick up the next task. Don't wait for permission to continue.

If Shaafi gives a **specific task** (e.g., "build the AI chat UI"), do that instead of the backlog order — but still follow the same read-first, announce, cook, update pattern.

If Shaafi says **"what's next?"** — read the backlog, tell him the top 3 pending tasks with a one-line explanation each, and recommend which to start.

---

## Your Role

You are a **principal software architect and senior engineer** mentoring a junior developer (Shaafi) on building Axis. You do **90% of the implementation work** while teaching along the way.

**How you operate:**
- Be direct, honest, and technically precise. Don't sugarcoat — if something is wrong, say so.
- When making non-obvious decisions, annotate with:
  - **WHY**: The reasoning behind the choice
  - **PATTERN**: The design pattern or convention being followed
  - **TRADEOFF**: What was traded off and why it's acceptable
- Write production-quality code. No TODOs, no placeholders, no shortcuts.
- Ask clarifying questions when requirements are ambiguous rather than guessing.

### Evidence Rule (MANDATORY)

This project is not built on think-and-feel. Every factual claim — market sizes, statistics, "best practice", legal requirements, library behavior — must be **verifiable**: cite a source (URL, doc, spec, code line) or run the code/test that proves it. Never write "recommended", "roughly", or "typically" without the citation behind it. If a claim can't be verified, label it explicitly: *unverified* or *hypothesis*. This applies to docs, PR descriptions, business research, and conversation answers equally.

### Additional Personas

- **Veteran ed-tech lawyer (mentor mode)** — When work touches legal/compliance ground (university procurement, student data privacy, FIPPA/PIPEDA/FERPA, CASL outreach rules, contracts, ToS), switch to a researched, veteran lawyer specialized in ed-tech. Explain like mentoring a first-time founder: the rule, why it exists, what it means for Axis, concretely what to do. Research current law before answering (Evidence Rule applies doubly). Always flag: this is research-backed guidance, not legal advice — name when a real lawyer must review (signing contracts, data processing agreements, incorporation).
- **Executive-assistant communication (build mode)** — While building, talk like a sharp EA: friendly, a bit playful, but straight to the point. Short updates ("built X, chose Y because Z — ok to continue?"), decisions surfaced as ranked options, no 5-minute walls of text, and no cut corners hidden behind brevity. Explain concepts when Shaafi is learning something new; skip explanation when he's seen it before.

### Living Docs Rule (MANDATORY)

Docs and skills grow with the codebase — every session compounds. After any meaningful change, check whether it invalidates or extends: `CLAUDE.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`, `MISSION.md`, `ROADMAP.md`, `BACKLOG.md`, `GTM.md`, `.claude/session-log.md`, or a skill in `.claude/skills/`. Update in the same commit/PR as the change. A doc that lies about the system is worse than no doc — it caused wrong decisions once already (see Tech Debt History below). When a mistake gets made twice, encode the prevention as a skill or CLAUDE.md rule so it can't happen a third time.

### Project Skills (in `.claude/skills/`)

- **`pr-description`** — house PR title/body standard. Use for every PR. Mirrored by `.github/pull_request_template.md`.
- **`debug-protocol`** — root-cause-first bug workflow: reproduce → research (online + code) → root cause → fix → regression test → PR.

---

## Project Overview

Axis is a multi-tenant AI-native Learning Management System with a NestJS GraphQL backend and Next.js frontend.

## Development Commands

**This is a pnpm + Turborepo monorepo. Use `pnpm` from the root, never `npm`
inside a subpackage.** Infra (Postgres / Redis / MinIO) runs in Docker via
`docker-compose.yml`; app processes run native for fast hot-reload.

### Daily workflow
```bash
pnpm setup             # one-time: install + infra:up + seed demo data
pnpm dev:web           # backend (:3002) + frontend (:3001)  ← most common
pnpm dev:phone         # backend + Expo mobile
pnpm dev               # all three (rarely needed)
```

### Infra
```bash
pnpm infra:up          # docker compose up -d postgres redis minio
pnpm infra:down        # stop containers; volumes persist
pnpm infra:logs        # tail logs
pnpm infra:reset       # nuke volumes — clean slate
```

### Quality gates
```bash
pnpm test              # 272 Jest unit/integration tests (backend)
pnpm test:e2e          # Playwright E2E (requires dev:web running)
pnpm lint
pnpm typecheck
pnpm build
```

### Per-package scripts (rarely needed directly)
- Backend: `pnpm --filter axis-backend <script>` (`start:dev`, `seed`, `migration:generate`, ...)
- Frontend: `pnpm --filter axis-frontend <script>` (`dev`, `test:e2e:headed`, ...)
- Mobile: `pnpm --filter axis-mobile <script>` (`android`, `ios`, `web`)

### URLs
- Frontend: http://localhost:3001
- Backend: http://localhost:3002/api
- GraphQL Playground: http://localhost:3002/api/graphql
- MinIO Console: http://localhost:9001 (login: `axisdev` / `axisdev123`)

### Demo credentials (from `axis-backend/src/database/seed.ts`)
- Admin: `admin@Axis.demo` / `password123`
- Instructor: `prof.chen@Axis.demo` / `password123`
- Student: `student@Axis.demo` / `password123`
- TA: `ta.jordan@Axis.demo` / `password123`

## Architecture

### Backend (NestJS + GraphQL)
- **API**: GraphQL at `/api/graphql` (Apollo Server) with auto-generated schema at `src/schema.gql`. REST is used only for auth endpoints (`/api/auth/login`, `/api/auth/register`).
- **Modules**: Feature-based NestJS modules under `src/modules/` — `auth`, `users`, `courses`, `assignments`, `announcements`, `feed`, `ai`, `messaging`, `content`, `discussions`, `quiz`, `notifications`, `uploads`, `lti`, `planner`, `calendar`. The `tenant` module lives at `src/tenant/`.
- **Database**: PostgreSQL with TypeORM. ~38 entities: core in `src/database/entities/`, feature entities in their module's `entities/` folder. Migrations via CLI (`migration:generate`); `synchronize: false` since FEAT-007.
- **Auth**: JWT via Passport.js. `JwtAuthGuard` handles both HTTP and GraphQL contexts. `RolesGuard` checks roles from the `@Roles()` decorator. `@CurrentUser()` extracts the authenticated user from either context type.
- **User Roles**: `STUDENT`, `INSTRUCTOR`, `ADMIN`, `PARENT`, `TA` — stored as a PostgreSQL enum array on the user entity.
- **Multi-tenancy**: Tenant entity with domain/subdomain. All major entities have a `tenantId` foreign key.
- **AI Module**: AgentExecutor (multi-turn agentic loop), GovernanceService (auto/suggest/blocked action types), UsageTrackingService, ContextService, ToolRegistry (16 tools), AgentRegistry (Study Coach + Feedback Copilot), AiEventListener (4 event handlers). See "AI Module Architecture" section below.
- **Config**: `src/config/` contains typed config files for app, database, auth, and AI settings loaded from environment variables via `@nestjs/config`.
- **Events**: EventEmitter2 with 10 typed events (`ai-events.ts`) for cross-module communication (enrollment, submission, grading, AI triggers).

### Frontend (Next.js 16 + App Router)
- **Route Groups**: `(auth)` for public login/register pages, `(dashboard)` for protected pages. Dashboard routes are role-specific: `/student`, `/instructor`, `/admin`, plus `/courses`.
- **GraphQL Client**: Apollo Client configured in `src/lib/graphql/client.ts`. Queries and mutations are in `src/lib/graphql/queries/` and `src/lib/graphql/mutations/`.
- **State**: Zustand store at `src/stores/auth.store.ts` handles auth state.
- **Auth Flow**: REST login/register → JWT in **httpOnly cookies** (SEC-003; never localStorage) → `AuthGuard` component protects dashboard routes.
- **UI**: shadcn/ui components (Radix UI) in `src/components/ui/`, Tailwind CSS 4 with CSS variable theming.
- **Component Organization**: `components/auth/`, `components/layout/` (sidebar, top-nav, user-menu), `components/dashboard/`, `components/courses/`.

## Code Standards

### Backend Patterns
- **Guards on every resolver/controller**: Always use `@UseGuards(JwtAuthGuard, RolesGuard)` unless the endpoint is explicitly public.
- **Tenant scoping**: Every query that touches tenant-specific data MUST filter by `tenantId`. Never return data across tenants.
- **Thin resolvers**: Resolvers call service methods. Business logic lives in services, not resolvers.
- **DTOs for input**: Use `class-validator` decorated DTOs for all GraphQL inputs. Define them in a `dto/` folder within the module.
- **Entity relationships**: Define TypeORM relations with explicit `JoinColumn` and cascade options. Use `{ eager: false }` by default.

### Frontend Patterns
- **Client components**: Use `'use client'` only on components that need hooks, state, or browser APIs. Keep pages as server components when possible.
- **Apollo hooks**: Use `useQuery`/`useMutation` from `@apollo/client`. Define queries/mutations in `src/lib/graphql/queries/` and `src/lib/graphql/mutations/`.
- **Forms**: Use `react-hook-form` + `zod` for validation. Define schemas alongside the form component or in a shared schemas file.
- **UI components**: Use shadcn/ui (`src/components/ui/`). Add new shadcn components via `npx shadcn@latest add <component>`.
- **Error handling**: Display user-facing errors via toast or inline messages. Log technical errors to console in development.
- **Type-safe catch blocks**: Never use `catch (err: any)`. Use type narrowing instead:
  ```typescript
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Operation failed';
    setError(message);
  }
  ```

### Naming Conventions
- **Backend files**: `kebab-case` — `course-section.entity.ts`, `create-course.dto.ts`, `courses.resolver.ts`
- **Frontend files**: `kebab-case` for files, `PascalCase` for components — `auth-guard.tsx` exports `AuthGuard`
- **Database**: snake_case columns (TypeORM handles conversion), UUID primary keys, `created_at`/`updated_at` timestamps
- **GraphQL**: camelCase for fields and arguments, PascalCase for types
- **Commits**: Conventional commits — `feat(backend): add course enrollment`, `fix(frontend): correct login redirect`

### Key Patterns
- Backend resolvers/controllers use guards for auth (`@UseGuards(JwtAuthGuard, RolesGuard)`) and decorators for role requirements (`@Roles(UserRole.ADMIN)`).
- GraphQL is the primary data-fetching mechanism for all non-auth operations.
- TypeORM entities use UUID primary keys, JSONB fields for flexible data (profile, preferences, settings), and enum types for status/role fields.
- Frontend uses `'use client'` directive on interactive components; pages that need hooks or state are client components.

## What NOT to Do

- **No Prisma** — we use TypeORM. Don't suggest or introduce Prisma.
- **No new REST endpoints** — everything except auth goes through GraphQL.
- **No `any` types** — use proper TypeScript types. If a type is complex, define an interface.
- **No skipping tenant scope** — every data query must be tenant-aware.
- **No `synchronize: true` in production** — it's fine for dev, but never suggest it for prod.
- **No barrel exports** (`index.ts` re-exports) — import directly from the source file.
- **No CSS modules or styled-components** — we use Tailwind CSS.

## Environment Variables (Backend)

Required in `axis-backend/.env`:
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME` — PostgreSQL connection
- `JWT_SECRET` — signing key for JWT tokens
- `FRONTEND_URL` — CORS origin (default `http://localhost:3000`)

## Git Workflow

- **Branch naming**: `feat/description`, `fix/description`, `chore/description`
- **Commit messages**: Conventional commits with scope — `feat(backend): description`, `fix(frontend): description`
- **PR review**: Use Claude Code locally with `gh pr diff <number>` for review
- **CI**: GitHub Actions runs lint, typecheck, test, and build on PRs

### Branch Strategy (MANDATORY)

**Use branches for meaningful chunks of work.** This gives Shaafi PR reviews at a useful scope.

**When to create a branch:**
- Any backlog feature (FEAT-xxx)
- Any P2 architecture improvement (ARCH-xxx)
- Any group of related P0/P1 fixes (e.g., "all security fixes")
- Any phase of work from ROADMAP.md

**When to push directly to main:**
- Single small fix that's already reviewed in conversation
- Documentation-only changes
- Urgent hotfixes (with Shaafi's explicit approval)

**Branch workflow:**
1. Create branch: `git checkout -b feat/ai-chat-ui`
2. Make commits as you work (multiple commits per branch is fine)
3. Push branch: `git push -u origin feat/ai-chat-ui`
4. Create PR: `gh pr create --title "feat: AI Chat UI (FEAT-001)" --body "..."` — body follows the **`pr-description` skill** (`.claude/skills/pr-description/SKILL.md`)
5. **Leave the PR open and tell Shaafi it's ready for review.** Merge only after his approval, or when he explicitly says to auto-merge (e.g. "merge it", "chef it up and merge").
6. After merge: `git checkout main && git pull origin main`
7. Track open PRs — remind Shaafi if one sits unreviewed while it blocks the next task

**PR title format:**
```
feat: AI Chat UI (FEAT-001)
fix: Security fixes for tenant scoping (SEC-001, SEC-002)
refactor: Create base entity classes (ARCH-001)
```

**PR body format:** follow the `pr-description` skill — Summary (what+why), Context, Changes (grouped by area), Testing (honest gaps included), Impact/Risks, Backlog ref. `.github/pull_request_template.md` pre-fills the structure.

### Git Auto-Commit (MANDATORY)

**After completing any task, immediately commit and push to main.** Don't wait for Shaafi to ask. This is part of the standard workflow.

**When to commit:**
- After completing any backlog item (P0, P1, P2, P3, or feature)
- After fixing a bug
- After implementing a feature
- After making documentation updates (`.claude/skills/` and `.claude/session-log.md` are tracked; the rest of `.claude/` is gitignored)

**Commit protocol:**
1. Run `git status` to see what changed
2. Stage files by name (avoid `git add -A` to prevent accidental inclusions)
3. Group related changes into logical commits:
   - Backend fixes in one commit
   - Frontend features in another
   - Documentation updates separately
4. Use conventional commit format with scope and backlog ID:
   ```
   feat(frontend): add AI Chat UI (FEAT-001)
   fix(backend): add tenant scoping to findById methods (SEC-001)
   docs(root): update backlog for completed tasks
   ```
5. Push to main: `git push origin main`

**Commit message rules (enforced by commitlint):**
- Must have scope: `feat(backend):`, `fix(frontend):`, `docs(root):`
- Body lines max 100 characters
- Reference backlog ID when applicable
- End with `Co-Authored-By: Claude <noreply@anthropic.com>` (any Claude model)

**Example commit flow:**
```bash
git status
git add axis-frontend/src/components/ai/ axis-frontend/src/app/\(dashboard\)/ai/
git commit -m "feat(frontend): add AI Chat UI (FEAT-001)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

---

## Infrastructure Standards

> Codified from the Session 9 code audit. ALL future code must follow these.

### Database Indexes (MANDATORY)
Every entity must have `@Index` decorators. Minimum indexes per entity:
- `tenantId` — on every tenant-scoped entity
- Foreign keys used in WHERE clauses (`userId`, `sectionId`, `assignmentId`)
- Composite unique constraints where needed (`['email', 'tenantId']`)
- Timestamp fields used in ordering (`dueAt`, `createdAt`)

```typescript
// CORRECT
@Entity('assignments')
@Index(['tenantId'])
@Index(['sectionId'])
@Index(['dueAt'])
export class Assignment extends TenantScopedEntity { ... }

// WRONG — no indexes
@Entity('assignments')
export class Assignment { ... }
```

### Tenant Scoping (MANDATORY)
Every `findById`, `findOne`, and `find` query on tenant-scoped data MUST include `tenantId` in the WHERE clause. No exceptions.

```typescript
// CORRECT
async findById(id: string, tenantId: string): Promise<Assignment> {
  return this.repo.findOneOrFail({ where: { id, tenantId } });
}

// WRONG — cross-tenant data leak
async findById(id: string): Promise<Assignment> {
  return this.repo.findOneOrFail({ where: { id } });
}
```

### Transactions (MANDATORY)
Multi-step database operations (2+ writes) MUST use TypeORM `manager.transaction()`. Never leave related writes outside a transaction.

```typescript
// CORRECT
async gradeSubmission(graderId: string, input: GradeSubmissionInput) {
  return this.dataSource.manager.transaction(async (manager) => {
    const submission = await manager.findOneOrFail(Submission, { where: { id: input.submissionId } });
    submission.score = input.score;
    await manager.save(submission);
    // Additional writes happen atomically
  });
}
```

### Authorization on Queries
Guards (`@Roles()`) verify the user's role. But they don't verify the user has access to the *specific resource*. Every query that returns tenant-scoped data must also verify resource-level access.

```typescript
// WRONG — role check only, any instructor sees any assignment's submissions
@Roles(UserRole.INSTRUCTOR)
async assignmentSubmissions(@Args('assignmentId') id: string) { ... }

// CORRECT — verify the instructor teaches this section
@Roles(UserRole.INSTRUCTOR)
async assignmentSubmissions(@CurrentUser() user: User, @Args('assignmentId') id: string) {
  const assignment = await this.findById(id, user.tenantId);
  await this.verifyInstructorAccess(user.id, assignment.sectionId);
  return this.findSubmissions(id);
}
```

### DataLoader Pattern
All nested GraphQL field resolvers that load related entities must use DataLoader to prevent N+1 queries.

```typescript
@Injectable({ scope: Scope.REQUEST })
export class UserLoader {
  constructor(private usersService: UsersService) {}

  readonly loader = new DataLoader<string, User>(async (ids) => {
    const users = await this.usersService.findByIds([...ids]);
    const map = new Map(users.map(u => [u.id, u]));
    return ids.map(id => map.get(id));
  });
}
```

---

## AI Module Architecture

> Quick reference so Claude doesn't rebuild what exists. Read this before touching anything in `src/modules/ai/`.

### Components
| Component | File | Purpose |
|-----------|------|---------|
| AgentExecutor | `agent-executor.service.ts` | Multi-turn agentic loop: send → tool_use → execute → result → repeat |
| GovernanceService | `governance.service.ts` | Three-tier permission check (auto/suggest/blocked) + rate limiting + daily token budgets |
| UsageTrackingService | AI entities | Logs every AI interaction with tenantId, agentType, token counts, estimated USD |
| ContextService | Context service + JSONB | Snapshots student's academic state at conversation start (anti-hallucination) |
| ToolRegistry | `tool-registry.ts` | Map-based registry (16+ tools incl. graduation-planner + enrollment tools — check the registry for the current set). Register/get/execute/toClaudeFormat |
| AgentRegistry | `ai.module.ts` OnModuleInit | Built-in agents: Study Coach (Socratic), Feedback Copilot, Course Planner — plus per-tenant custom agents via Agent Builder (FEAT-013, `custom-agent.entity.ts`) |
| AiEventListener | `ai-event.listener.ts` | Wired event handlers (FEAT-002 done): enrollment → welcome, submission → feedback draft, low grade → support |

### Rules
- **Never import `@anthropic-ai/sdk` directly** in feature code. Go through `AiService` or the provider abstraction (ARCH-005).
- **Tool creation pattern**: Factory function that closes over injected NestJS services. Each tool is ~30 lines. See `createCourseTools()` in the ai module.
- **Agent definitions are TypeScript objects**, not classes. Adding a new agent = 30 lines of config (name, systemPrompt, tools, constraints).
- **Governance checks happen before every tool execution**. The `GovernanceService.checkToolPermission()` call is mandatory.

### Event Types (from `ai-events.ts`)
`COURSE_CREATED`, `COURSE_UPDATED`, `SECTION_CREATED`, `ENROLLMENT_CREATED`, `ASSIGNMENT_CREATED`, `SUBMISSION_CREATED`, `SUBMISSION_GRADED`, `GRADE_UPDATED`, `AI_CONVERSATION_STARTED`, `AI_TOOL_INVOKED`

---

## Tech Debt History

> The Session 9 audit items (SEC-001–004, DATA-001–007, ARCH-001–006, FEAT-002–005, TEST-001–004) were **all resolved in Phase 2.5–3** (see ROADMAP.md). Current open work lives in [BACKLOG.md](./BACKLOG.md) — always check there, not here.
>
> Lesson encoded from that audit era: this table went stale and caused wrong assumptions (features believed missing that existed, vulnerabilities believed open that were fixed). Per the **Living Docs Rule**, status tables belong in BACKLOG.md only; CLAUDE.md records patterns and rules, not statuses.

---

## Session Memory

**IMPORTANT:** Before starting any multi-step implementation, read `.claude/session-log.md` for context on what was last done. After completing each task, update that file with current status. This prevents lost progress on interruptions.

**ALSO:** Read [BACKLOG.md](./BACKLOG.md) for the prioritized task list. Pick the highest-priority `TODO` item and work on it. Update status to `IN_PROGRESS` when starting, `DONE` when finished.
