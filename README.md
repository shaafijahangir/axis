# Axis

**An AI-native learning platform that tells you what matters right now.**

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## What Is Axis?

Axis is a next-generation Learning Management System built from scratch with AI as infrastructure, not an add-on. It replaces the fragmented edtech stack (SIS + LMS + advising + messaging) with a single, intelligent platform.

Traditional LMS platforms are file cabinets with a gradebook. Axis is a **feed-first, AI-prioritized** experience where every role — student, instructor, admin, parent — sees exactly what needs their attention, right now.

> See [MISSION.md](./MISSION.md) for the full origin story and design philosophy.
> See [ROADMAP.md](./ROADMAP.md) for where this project is heading.
> See [BACKLOG.md](./BACKLOG.md) for the prioritized task list.
> See [STORY.md](./STORY.md) for the project narrative and architecture diagram.
> See [TECH_STACK.md](./TECH_STACK.md) for technology decisions and rationale.
> See [CLAUDE.md](./CLAUDE.md) for development workflow and AI collaboration rules.

---

## Design Principles

These are non-negotiable and inform every decision:

1. **"What should I do right now?"** — The student's primary question. Everything flows from answering it intelligently.
2. **AI is infrastructure** — Not a chatbot in the corner. It's why the platform knows what to surface and when.
3. **Feed-first, not folder-first** — No navigating through Modules > Week 3 > Readings. The home feed is the product.
4. **Role-based views, not role-based apps** — Each role sees a fundamentally different product through the same platform.
5. **Mobile-first** — Students live on their phones. Every feature works there first.
6. **3 nav items max** — If the navbar is growing, the architecture is wrong.

---

## Navigation Architecture

### Student (Primary User)

| Nav Item | Purpose |
|---|---|
| **Home** | AI-prioritized feed: upcoming deadlines, unread feedback, next lessons, announcements. Replaces dashboards, notifications, and announcements as separate concepts. |
| **Courses** | Grid of enrolled courses. Each opens a unified timeline (content + assignments + discussions together, not separate tabs). |
| **Messages** | Conversations with instructors, TAs, classmates. |
| *Profile (avatar)* | Settings, grades overview, account. |

### Instructor

| Nav Item | Purpose |
|---|---|
| **Home** | What needs attention: submissions to grade, flagged students, upcoming deadlines. |
| **Courses** | Your courses. Inside each: content builder, roster, gradebook, analytics. |
| **Messages** | Same messaging system. |
| *Profile (avatar)* | Settings, account. |

### Admin

| Nav Item | Purpose |
|---|---|
| **Home** | Institution-wide metrics, alerts, system health. |
| **People** | Users, roles, enrollment management. |
| **Academics** | Terms, course catalog, sections. |
| *Settings (gear)* | Tenant config, integrations, billing. |

### Parent

| Nav Item | Purpose |
|---|---|
| **Home** | Children's status: grades, attendance, flags. |
| **Messages** | Communication with instructors/admin. |
| *Profile (avatar)* | Settings. |

**Note:** TA is not a separate role — it's an instructor with scoped permissions on specific sections.

---

## Tech Stack

### Frontend
- **Next.js 16** with App Router
- **React 19** with server components
- **TypeScript**
- **Tailwind CSS 4**
- **shadcn/ui** for accessible components
- **Apollo Client** for GraphQL
- **Zustand** for state management
- **Socket.IO Client** for real-time updates

### Backend
- **NestJS** (modular Node.js framework)
- **GraphQL** via Apollo Server
- **PostgreSQL 16** with Row-Level Security
- **TypeORM** for database operations
- **BullMQ + Redis** for job queues and caching
- **Passport.js** for authentication (JWT, Google OAuth)

### AI Layer
- **Claude API (Anthropic)** — primary LLM
- **OpenAI API** — fallback

---

## Project Structure

```
axis/
├── axis-frontend/             # Next.js 16 frontend
│   └── src/
│       ├── app/
│       │   ├── (auth)/           # Login, registration
│       │   └── (dashboard)/      # Role-based views
│       │       ├── home/         # Unified feed (role-adaptive)
│       │       ├── courses/      # Course timeline, assignments, grading
│       │       ├── messages/     # Messaging (placeholder — needs FEAT-003)
│       │       ├── people/       # Admin user management
│       │       └── academics/    # Admin term/catalog management
│       ├── components/
│       │   ├── ui/               # shadcn/ui base components
│       │   ├── feed/             # Home feed (student, instructor, admin, parent)
│       │   ├── courses/          # Course timeline, roster, content
│       │   ├── assignments/      # Assignment detail, submission, grading
│       │   ├── auth/             # Auth guard, login/register forms
│       │   └── layout/           # Sidebar, top-nav, mobile-nav, user-menu
│       ├── lib/
│       │   ├── graphql/          # Apollo queries & mutations
│       │   ├── navigation.ts     # Centralized nav config
│       │   └── utils/            # Utilities (relative-time, etc.)
│       └── stores/               # Zustand state (auth)
│
├── axis-backend/              # NestJS GraphQL API
│   └── src/
│       ├── modules/
│       │   ├── auth/             # Authentication (JWT + Google OAuth)
│       │   ├── users/            # User management
│       │   ├── courses/          # Courses, sections, enrollments
│       │   ├── assignments/      # Assignments, submissions, grading
│       │   ├── announcements/    # Priority announcements
│       │   ├── feed/             # Server-side feed aggregation & ranking
│       │   └── ai/               # AI infrastructure
│       │       ├── agents/       # Agent definitions (Study Coach, Feedback Copilot)
│       │       ├── tools/        # 16 AI-callable tools
│       │       ├── events/       # Event listener + typed events
│       │       └── entities/     # AI conversations, messages, usage logs
│       ├── database/entities/    # 9 core TypeORM entities
│       ├── tenant/               # Multi-tenant operations
│       ├── config/               # App, DB, auth, AI configuration
│       ├── guards/               # JWT auth + roles guards
│       └── decorators/           # @CurrentUser, @Roles
│
├── MISSION.md                    # Why Axis exists (origin story)
├── ROADMAP.md                    # Development trajectory (Phases 2.5→5)
├── BACKLOG.md                    # Prioritized task list (P0→P3 + features)
├── STORY.md                      # Project narrative with architecture diagram
├── TECH_STACK.md                 # Technology decisions and rationale
├── CLAUDE.md                     # AI collaboration rules and standards
└── README.md                     # This file
```

---

## Database Schema

### Core Entities (9)
- **Tenants** — Multi-tenant institutions with subscription plans and billing
- **Users** — All roles: student, instructor, admin, parent, TA
- **Academic Terms** — Semesters and periods
- **Courses** — Course catalog with prerequisites
- **Course Sections** — Specific instances per term with schedule and capacity
- **Enrollments** — Student-to-section relationships with role and status
- **Assignments** — 5 types: assignment, quiz, exam, discussion, project
- **Submissions** — Student work, grades, and feedback
- **Announcements** — Priority-ranked (normal/urgent) with pinning

### AI Entities (3)
- **AI Conversations** — Context-scoped with academic state snapshot
- **AI Messages** — Conversation history with role tracking
- **AI Usage Logs** — Per-tenant cost tracking (tokens, estimated USD)

### Multi-Tenancy
Each institution is scoped by a `tenantId` foreign key on all major entities. Row-Level Security provides defense-in-depth. Shared infrastructure for operational efficiency.

---

## Getting Started

### Prerequisites

- **Node.js 22+** and **pnpm 9+** (this is a pnpm + Turborepo monorepo)
- **Docker** (runs Postgres, Redis, MinIO locally)

That's it — no need to install Postgres / Redis / MinIO natively.

### One-Time Setup

```bash
git clone <repository-url>
cd axis
cp axis-backend/.env.example axis-backend/.env  # then edit (see below)
pnpm setup   # installs deps, starts infra in docker, seeds demo data
```

The `pnpm setup` script:
1. `pnpm install` — workspace deps
2. `pnpm infra:up` — Postgres (`:5433`) + Redis (`:6379`) + MinIO (`:9000`)
3. `pnpm --filter axis-backend seed` — populates the demo tenant

### Daily Dev

```bash
pnpm dev:web      # backend + frontend (most common)
pnpm dev:phone    # backend + Expo mobile
pnpm dev          # all three
```

URLs:
- **Frontend** http://localhost:3001
- **Backend** http://localhost:3002/api
- **GraphQL Playground** http://localhost:3002/api/graphql
- **MinIO Console** http://localhost:9001 (login: `axisdev` / `axisdev123`)

### Demo Credentials (from the seed)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@Axis.demo` | `password123` |
| Instructor | `prof.chen@Axis.demo` | `password123` |
| Student | `student@Axis.demo` | `password123` |
| TA | `ta.jordan@Axis.demo` | `password123` |

### Infrastructure Management

```bash
pnpm infra:up      # start docker services (postgres + redis + minio)
pnpm infra:down    # stop (volumes persist, data survives)
pnpm infra:logs    # tail logs
pnpm infra:reset   # nuke volumes — clean slate
```

### Quality Gates

```bash
pnpm test          # 272 backend unit/integration tests
pnpm test:e2e      # Playwright E2E (requires dev:web running)
pnpm lint
pnpm typecheck
pnpm build
```

### Environment Variables

Critical entries in `axis-backend/.env`:

| Var | Required? | Notes |
|---|---|---|
| `DATABASE_*` | yes | Defaults to the docker-compose Postgres on `:5433` |
| `JWT_SECRET` | yes | 32+ chars; production refuses to boot with the example value |
| `ANTHROPIC_API_KEY` | for AI features | Study Coach / Feedback Copilot need this |
| `RESEND_API_KEY` | for emails | Password reset, grade notifications |
| `EMAIL_FROM` | for emails | Use `Axis <onboarding@resend.dev>` until your domain is verified |
| `R2_*` | for file uploads | Defaults point at local MinIO. Swap to Cloudflare R2 in prod. |

---

## Security & Compliance Targets

- **FERPA** — Student data protection
- **WCAG 2.1 AA** — Accessibility
- **Encryption** — AES-256 at rest, TLS 1.3 in transit
- **RLS** — PostgreSQL Row-Level Security for tenant isolation

---

**Built with purpose by someone who lived the problem.**
