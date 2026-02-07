# NexusEd

**An AI-native learning platform that tells you what matters right now.**

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

---

## What Is NexusEd?

NexusEd is a next-generation Learning Management System built from scratch with AI as infrastructure, not an add-on. It replaces the fragmented edtech stack (SIS + LMS + advising + messaging) with a single, intelligent platform.

Traditional LMS platforms are file cabinets with a gradebook. NexusEd is a **feed-first, AI-prioritized** experience where every role — student, instructor, admin, parent — sees exactly what needs their attention, right now.

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
nexused/
├── nexused-frontend/             # Next.js 16 frontend
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
├── nexused-backend/              # NestJS GraphQL API
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
├── MISSION.md                    # Why NexusEd exists (origin story)
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
Each institution gets its own PostgreSQL schema. Row-Level Security provides defense-in-depth. Shared infrastructure for operational efficiency.

---

## Getting Started

### Prerequisites
- Node.js 18+ (recommended: 22+)
- npm 10+
- PostgreSQL 16+
- Redis (optional, for caching and queues)

### Installation

```bash
# Clone
git clone <repository-url>
cd nexused

# Frontend
cd nexused-frontend && npm install

# Backend
cd ../nexused-backend && npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and API keys
```

### Running

```bash
# Terminal 1 — Backend (http://localhost:3001/api)
cd nexused-backend && npm run start:dev

# Terminal 2 — Frontend (http://localhost:3000)
cd nexused-frontend && npm run dev
```

GraphQL Playground: http://localhost:3001/api/graphql

---

## Current Status

### Complete
- [x] Project scaffolding (frontend + backend)
- [x] Authentication system (JWT + Google OAuth)
- [x] Multi-tenant foundation with RLS
- [x] Core database schema (12 entities: 9 core + 3 AI)
- [x] Base UI components (shadcn/ui)
- [x] GraphQL API with tenant CRUD
- [x] Login and registration pages
- [x] Role-based navigation shell (3 nav items per role)
- [x] Mobile-responsive layout (bottom bar + sidebar)
- [x] AI-prioritized home feed (student, instructor, admin, parent views)
- [x] Unified course timeline (assignments + announcements in one stream)
- [x] Assignment creation, submission, and inline grading
- [x] Gradebook with statistics and CSV export
- [x] Course roster view
- [x] AI agentic loop, governance engine, tool registry (backend only)

### In Progress — Phase 2.5: Infrastructure Hardening
- [ ] Fix 4 P0 security issues (tenant scoping, auth, JWT storage, indexes)
- [ ] Fix 7 P1 data integrity issues (tenantId, transactions, Apollo config)
- [ ] Architecture improvements (base entities, Turborepo, cleanup)

### Not Yet Built
- [ ] AI Chat UI (backend exists, no frontend)
- [ ] Messaging system (documented but code not on main)
- [ ] Content builder (documented but code not on main)
- [ ] Real-time features (Socket.IO configured but unused)

> See [ROADMAP.md](./ROADMAP.md) for the full development plan.
> See [BACKLOG.md](./BACKLOG.md) for the prioritized task list.

---

## Security & Compliance Targets

- **FERPA** — Student data protection
- **WCAG 2.1 AA** — Accessibility
- **SOC 2 Type II** — Target certification
- **Encryption** — AES-256 at rest, TLS 1.3 in transit
- **RLS** — PostgreSQL Row-Level Security for tenant isolation

---

**Built with purpose by someone who lived the problem.**
