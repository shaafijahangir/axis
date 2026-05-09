# Axis Architecture

> This document describes how Axis is built, how data flows through the system, and how modules connect. Read this to understand the system before making changes.

---

## System Overview

Axis is a **multi-tenant, AI-native Learning Management System** built as a monorepo with two applications:

```
axis/
├── axis-backend/     NestJS 11 — GraphQL API, business logic, AI engine
├── axis-frontend/    Next.js 16 — React 19 UI with App Router
├── CLAUDE.md            Agent instructions and coding standards
├── ARCHITECTURE.md      This file — system design reference
├── CONVENTIONS.md       Code patterns and naming rules
├── DATA-MODEL.md        Entity relationships and schema contracts
├── DESIGN-SYSTEM.md     UI design principles and component patterns
├── SECURITY.md          Auth, tenancy, compliance posture
├── BACKLOG.md           Prioritized task list
├── ROADMAP.md           Phase structure and timeline
├── TECH_STACK.md        Technology decisions with rationale
└── STORY.md             Architectural differentiators narrative
```

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
│  Browser (Next.js)  ·  Mobile (PWA)  ·  LTI Consumer/Provider   │
└────────┬──────────────────┬──────────────────┬──────────────────┘
         │ GraphQL          │ REST (auth only)  │ Socket.IO
         ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NestJS API LAYER                             │
│  Apollo Server 5 (/api/graphql)  ·  Auth REST (/api/auth/*)     │
│  Socket.IO Gateway (messaging)   ·  LTI endpoints               │
├─────────────────────────────────────────────────────────────────┤
│  CROSS-CUTTING: JwtAuthGuard · RolesGuard · TenantInterceptor   │
└────────┬──────────────────┬──────────────────┬──────────────────┘
         │                  │                   │
         ▼                  ▼                   ▼
┌──────────────┐  ┌──────────────────┐  ┌─────────────────┐
│   MODULES    │  │    AI ENGINE     │  │   EVENT BUS     │
│ 14 feature   │  │ AgentExecutor    │  │ EventEmitter2   │
│ modules with │  │ GovernanceService│  │ 10 typed events │
│ resolvers,   │  │ ToolRegistry(16) │  │ AiEventListener │
│ services,    │  │ AgentRegistry    │  │ Cross-module    │
│ DTOs         │  │ ContextService   │  │ communication   │
└──────┬───────┘  └────────┬─────────┘  └────────┬────────┘
       │                   │                      │
       ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                    │
│  PostgreSQL 16 (TypeORM) · Redis (BullMQ queues, Socket.IO)     │
│  JSONB for flexible data · UUID primary keys · Enum types        │
│  Row-Level Security ready · Every entity has tenantId + indexes  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Module Map

Every feature is a NestJS module under `src/modules/`. Modules are self-contained with their own resolvers, services, DTOs, and entities.

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **auth** | JWT + Google OAuth, login/register/logout | controller, service, jwt.strategy, google.strategy |
| **users** | User CRUD, admin user management | resolver, admin-users.resolver, service |
| **courses** | Course + Section CRUD, enrollment | resolver, admin-courses.resolver, service |
| **assignments** | Assignment CRUD, submission, grading | resolver, service |
| **announcements** | Section announcements | resolver, service |
| **content** | Rich text course content (Tiptap) | resolver, service, course-content.entity |
| **feed** | AI-ranked home feed per role | resolver, service, feed-personalization.service |
| **messaging** | DMs, conversations, unread tracking | resolver, service, gateway (Socket.IO) |
| **ai** | Agentic AI engine (see AI section below) | 20+ files across agents/, tools/, providers/, events/ |
| **planner** | AI course planner, degree profiles | resolver, service |
| **analytics** | Platform analytics for admin | resolver, service |
| **academic-terms** | Term management | resolver, service |
| **lti** | LTI 1.3 integration | controller, resolver, service, 5 entities |
| **tenant** (at `src/tenant/`) | Multi-tenant management | resolver, service, interceptor, context |

### Module Dependencies

```
auth ──────────────► users
courses ───────────► users, academic-terms
assignments ───────► courses
announcements ─────► courses
content ───────────► courses
feed ──────────────► courses, assignments, announcements, content, enrollments
messaging ─────────► users, courses (enrollment-based contacts)
ai ────────────────► courses, assignments, users, feed (via tools)
planner ───────────► courses, users (degree profiles)
analytics ─────────► courses, users, assignments, ai
lti ───────────────► courses, users, tenant
```

All modules depend on **tenant** (via TenantInterceptor) and **auth** (via JwtAuthGuard).

---

## AI Engine Architecture

The AI module is the core differentiator. It implements a production-grade agentic loop, not a chatbot wrapper.

```
User message
    │
    ▼
┌──────────────────────────────────────┐
│          AgentExecutor               │
│  1. Load agent definition            │
│  2. Assemble context (ContextService)│
│  3. Send to Claude API               │
│  4. If tool_use → execute tool       │
│     └─ GovernanceService checks      │
│        (auto/suggest/blocked)        │
│  5. Feed tool result back to Claude  │
│  6. Repeat until text response       │
│  7. Log usage (UsageTrackingService) │
└──────────────────────────────────────┘

Key components:
├── AgentExecutor       Multi-turn loop with tool-use
├── GovernanceService   Three-tier permission (auto/suggest/blocked) + rate limits
├── UsageTrackingService Per-tenant cost tracking
├── ContextService      Snapshot student academic state (anti-hallucination)
├── ToolRegistry        16 tools in 6 domains
├── AgentRegistry       Declarative agent definitions (config, not classes)
├── AiEventListener     10 event types for proactive AI
└── AiProvider          Abstraction layer (AnthropicProvider implementation)
```

### Registered Agents

| Agent | Target Roles | Tools | Behavior |
|-------|-------------|-------|----------|
| Study Coach | student, ta | 8 read-only tools | Socratic method — never gives direct answers |
| Feedback Copilot | instructor, ta, admin | 7 tools (incl. draft_feedback) | Drafts rubric-aligned feedback for review |
| Course Planner | student | planner tools | Degree planning and course recommendations |
| Custom Agents | configurable | configurable | Built via Agent Builder UI |

### AI Governance

Every tool execution passes through `GovernanceService.checkToolPermission()`:

| Action Type | Behavior | Example |
|-------------|----------|---------|
| **auto** | Execute immediately, no confirmation | list_courses, get_assignment |
| **suggest** | Show user what the tool wants to do, require approval | enroll_student, draft_feedback |
| **blocked** | Refuse execution, explain why | Any destructive or unauthorized action |

Rate limiting and daily token budgets are enforced per-tenant.

---

## Frontend Architecture

```
axis-frontend/src/
├── app/                    Next.js App Router
│   ├── (auth)/             Public routes (login, register)
│   ├── (dashboard)/        Protected routes (all features)
│   ├── globals.css         Theme tokens (CSS variables)
│   └── layout.tsx          Root layout (fonts, metadata)
├── components/
│   ├── ui/                 shadcn/ui primitives (19 components)
│   ├── layout/             Shell: Sidebar, TopNav, MobileNav, UserMenu
│   ├── feed/               Feed cards and role-specific feeds
│   ├── courses/            Course views, timeline, gradebook
│   ├── assignments/        Create, submit, grade flows
│   ├── ai/                 Chat thread, agent selector, tool indicators
│   ├── messaging/          Conversation list, message thread
│   ├── admin/              Admin tables, dialogs, bulk operations
│   ├── a11y/               Accessibility providers and utilities
│   └── pwa/                Install prompt, offline indicator
├── lib/
│   ├── graphql/            Apollo Client, queries (17), mutations (14)
│   ├── api/                REST auth API calls
│   ├── navigation.ts       Role-based nav configuration
│   └── socket.ts           Socket.IO client
├── stores/
│   └── auth.store.ts       Zustand auth state
├── hooks/                  6 custom hooks
└── types/                  Shared TypeScript types
```

### Data Flow

```
User action
    │
    ▼
React Component (useQuery / useMutation)
    │
    ▼
Apollo Client (credentials: 'include' for httpOnly cookie)
    │
    ▼
GraphQL request to /api/graphql
    │
    ▼
NestJS Guard chain: JwtAuthGuard → RolesGuard → TenantInterceptor
    │
    ▼
Resolver → Service → TypeORM Repository → PostgreSQL
    │
    ▼
Response flows back through Apollo cache (normalized by entity ID)
```

### Route Structure

| Route | Access | Purpose |
|-------|--------|---------|
| `/login`, `/register` | Public | Authentication |
| `/home` | All roles | Role-specific feed (student/instructor/admin/parent) |
| `/courses`, `/courses/[id]` | All roles | Course list and detail with timeline |
| `/grades` | Student | Student gradebook |
| `/planner` | Student | AI course planner |
| `/ai` | Student, Instructor | AI chat (Study Coach, Feedback Copilot) |
| `/ai/agents` | Instructor | Agent Builder |
| `/messages` | All roles | Messaging |
| `/people` | Admin | User directory |
| `/admin` | Admin | Admin panel (users, terms, courses, enrollments) |
| `/admin/ai-governance` | Admin | Per-tenant AI settings |
| `/admin/analytics` | Admin | Platform analytics |
| `/admin/integrations` | Admin | LTI and SSO configuration |

### Role-Based Navigation

| Role | Nav Items (max 3-4) |
|------|---------------------|
| Student / TA | Home, Courses, Grades, Planner, AI, Messages |
| Instructor | Home, Courses, AI, Agent Builder, Messages |
| Admin | Home, Analytics, AI Governance, People, Integrations |
| Parent | Home, Messages |

---

## Multi-Tenancy Model

Every piece of data belongs to a tenant (institution). Tenant isolation is enforced at multiple layers:

```
Layer 1: TenantInterceptor (global)
    Extracts tenantId from authenticated user → stores in AsyncLocalStorage

Layer 2: Service methods
    Every query includes WHERE tenantId = :tenantId

Layer 3: Entity design
    TenantScopedEntity base class enforces tenantId column + FK

Layer 4: Database indexes
    @Index(['tenantId']) on every tenant-scoped entity
    Composite unique constraints: @Index(['email', 'tenantId'], { unique: true })
```

### Tenant Entity

```
Tenant {
  id: UUID
  name: string (unique)
  domain: string (unique)
  subdomain: string (unique)
  settings: JSONB
  subscriptionPlan: FREE | BASIC | PROFESSIONAL | ENTERPRISE
  billingStatus: ACTIVE | PAST_DUE | SUSPENDED | CANCELLED
}
```

---

## Event System

Cross-module communication uses EventEmitter2 with typed events:

| Event | Trigger | Current Handler |
|-------|---------|-----------------|
| `COURSE_CREATED` | Course service | Logging |
| `COURSE_UPDATED` | Course service | Logging |
| `SECTION_CREATED` | Course service | Logging |
| `ENROLLMENT_CREATED` | Enrollment | Study Coach welcome (planned) |
| `ASSIGNMENT_CREATED` | Assignment service | Rubric suggestions (planned) |
| `SUBMISSION_CREATED` | Submission | Feedback Copilot draft (planned) |
| `SUBMISSION_GRADED` | Grading | Logging |
| `GRADE_UPDATED` | Grading | Threshold alerts (planned) |
| `AI_CONVERSATION_STARTED` | AI service | Logging |
| `AI_TOOL_INVOKED` | AgentExecutor | Audit logging |

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Feed-first UX** | The home feed IS the product. Not a dashboard, not a file browser. |
| **GraphQL only** (except auth) | Nested relational data (user → enrollment → section → course) maps naturally to GraphQL. |
| **AI as infrastructure** | AI powers the feed ranking engine. It's not a sidebar feature. |
| **Multi-tenant with RLS** | Schema-per-tenant + PostgreSQL Row-Level Security. Every entity has tenantId. |
| **httpOnly cookies** | JWT in cookies, not localStorage. Non-negotiable for security. |
| **Code-first GraphQL** | TypeScript decorators generate the schema. No separate SDL to maintain. |
| **Declarative agents** | New AI agent = ~30 lines of config. Not a class, not a new module. |
| **Event-driven AI** | Events flow through every module. AI reacts to academic events proactively. |

---

## Infrastructure

| Component | Current | Target |
|-----------|---------|--------|
| Backend runtime | NestJS + Express | NestJS + Fastify (3x throughput) |
| Database | PostgreSQL 16 (synchronize: true) | PostgreSQL 16 (migrations) |
| Cache / Queue | Redis + BullMQ | Same |
| Real-time | Socket.IO (messaging) | + SSE (AI streaming) |
| ORM | TypeORM 0.3.28 | Drizzle (Phase 4+, new modules first) |
| Monorepo | pnpm + Turborepo | Same |
| CI | GitHub Actions | Same |

---

*Last updated: 2026-02-17*
*Companion docs: [CONVENTIONS.md](./CONVENTIONS.md) | [DATA-MODEL.md](./DATA-MODEL.md) | [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) | [SECURITY.md](./SECURITY.md)*
