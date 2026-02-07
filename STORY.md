# The NexusEd Story

> *A narrative map of what we're building, why every piece exists, and how it all fits together.*

---

## The Analogy: Building a University That Runs Itself

Imagine you're not building software. You're building an **entire university campus from scratch** — but one where the buildings are smart, the hallways know where you need to go, and every door opens before you reach it.

Traditional LMS platforms (Canvas, Brightspace, Moodle) are like old university buildings: the registrar's office is in one building, your classroom is in another, the advisor's office has a three-week wait, and nobody put up signs. You wander. You get lost. You miss things. The building doesn't care.

NexusEd is the campus that **watches, learns, and acts**.

---

## The Five Buildings

Every feature in NexusEd maps to one of five "buildings" on this campus. Each building has a clear purpose, and together they form a complete institution.

### Building 1: The Main Hall (Feed & Navigation)
*"Walk in and immediately know what matters."*

This is the front door of the entire campus. In a traditional university, you'd check your email, then your LMS, then your calendar, then your advisor's door — four systems, four mental models, four chances to miss something.

NexusEd's Main Hall is a **single intelligent feed**. You walk in and a screen shows you:
- "Your assignment in PSYC 300 is due in 4 hours. You haven't started."
- "Professor Chen graded your midterm. You got 87%."
- "New announcement: office hours moved to Thursday."

Not 30 notifications. Three to five items, ranked by urgency. The building knows the unstarted assignment due tonight matters more than the announcement posted this morning.

**What's built:** Feed infrastructure (server-side aggregation, urgency scoring, role-based views for students, instructors, admins, parents), navigation shell with 3 items per role, mobile-responsive layout.

**What's next:** Replace rule-based ranking with ML-based personalization. The building learns which doors you use most.

---

### Building 2: The Classrooms (Course Experience)
*"Everything about a class, in one room."*

Traditional LMS classrooms have the syllabus taped to one wall, assignments in a filing cabinet, discussions in a separate room, and grades in a locked drawer. You reconstruct the course in your head every time.

NexusEd classrooms are a **single timeline**. Content, assignments, discussions, and announcements flow chronologically in one stream. You scroll through the semester like reading a story. The lesson connects to the assignment connects to the discussion about that assignment — because that's how learning actually works.

Instructors don't wrestle with 47 configuration screens. They build content with a rich text editor, create assignments with rubrics, grade inline with immediate feedback, and see their entire class in one view.

**What's built:** Course timeline view, assignment creation (5 types: assignment, quiz, exam, discussion, project), submission flow, inline grading with rubrics, gradebook with statistics and CSV export, rich text content builder with draft/publish workflow, course roster.

**What's next:** AI-generated course structures from syllabi. Upload a PDF, get a course skeleton. Quiz auto-generation from content. The classroom starts building itself.

---

### Building 3: The Communications Tower (Messaging)
*"Talk to the right people, instantly."*

In traditional universities, you email your professor and wait days. You don't know if your TA handles that question. Group project coordination happens across three different apps.

NexusEd's Communications Tower knows your relationships. Students see their instructors and classmates. Instructors see their students. The right contacts surface automatically based on your enrollments.

**What's built:** Direct messaging with conversation threads, enrollment-based contact resolution, unread badges in navigation, cursor-based message pagination, read tracking.

**What's next:** Real-time delivery via Socket.IO (currently polling). Group channels per course section. AI-suggested quick replies for instructors handling repetitive questions.

---

### Building 4: The Brain (AI Intelligence Layer)
*"The campus that thinks."*

This is what makes NexusEd fundamentally different from every other LMS. It's not a chatbot bolted onto a file cabinet. It's the **nervous system of the entire campus**.

The Brain has three layers:

**Layer 1 — The Invisible Mind (Priority Engine)**
You never interact with this directly. It's why your feed knows the right order. It's why the unstarted assignment surfaces above the week-old announcement. It watches deadlines, grades, engagement patterns, and calculates what matters to *you* right now.

**Layer 2 — The Agents (Visible AI)**
These are the AI assistants you can talk to:
- **Study Coach**: A Socratic tutor that asks questions instead of giving answers. Scoped to your enrolled courses only. It can't help you cheat because it's architecturally designed not to.
- **Feedback Copilot**: Helps instructors write rubric-based feedback. Suggests comments, doesn't auto-grade. The instructor stays in control.

**Layer 3 — The Governance Layer**
Every AI action goes through a three-tier permission system:
- **Auto**: Safe actions execute immediately (looking up a grade, explaining a concept)
- **Suggest**: Sensitive actions are proposed but wait for human approval (drafting feedback, sending messages)
- **Blocked**: Dangerous actions are architecturally impossible (changing grades, accessing other students' data)

This isn't a feature. It's a **trust architecture**. Institutions won't adopt AI they can't control. NexusEd gives them control at the infrastructure level, not through policy documents.

**What's built:** Full agentic loop (AgentExecutor with multi-turn tool calls), governance engine with action types + rate limiting + daily token budgets, per-tenant cost tracking, event-driven architecture (10 typed events), tool registry (16 tools), agent registry (Study Coach + Feedback Copilot definitions), context snapshot system (freezes academic state to prevent hallucination).

**What's next:** AI Chat UI (the frontend for all this backend power), wire the event listeners (so AI proactively reaches out when a student submits or a grade drops), feed personalization (ML replaces rule-based ranking), AI Course Planner (the feature that started this entire project — "What should I take next semester?").

---

### Building 5: The Administration Wing (Multi-Tenant Platform)
*"One campus blueprint, infinite institutions."*

NexusEd isn't one university. It's the **blueprint that any institution can use** to stand up their own campus. Each institution (tenant) gets their own isolated data, their own AI budgets, their own billing, their own rules — running on shared infrastructure.

This is the SaaS layer. It's why NexusEd is a business, not just a project:
- **Tenant isolation**: PostgreSQL Row-Level Security ensures Institution A never sees Institution B's data.
- **Subscription tiers**: FREE → BASIC → PROFESSIONAL → ENTERPRISE, already modeled in the tenant entity.
- **AI cost control**: Per-tenant token budgets and rate limits. Enterprise tier unlocks higher limits and custom governance rules.
- **Institutional identity**: Custom domains, subdomain routing, branded experiences.

**What's built:** Tenant entity with subscription plans and billing status, multi-tenant scoping on most entities, user management with roles, academic term management, course catalog.

**What's next:** Tenant onboarding flow, SAML 2.0 SSO for institutions, LTI 1.3 for tool interoperability, Stripe integration for billing, admin analytics dashboards.

---

## The 10 Hidden Gems

These are things already built that most people would never notice — but they're what separate NexusEd from every competitor. These are not incremental improvements. Each one represents an architectural decision that would take competitors months to replicate.

| # | Gem | Why It Matters |
|---|-----|----------------|
| 1 | **Production-grade Agentic Loop** | Not a chatbot wrapper. A real send→tool_use→execute→result loop with max-turn safety, per-turn logging, and graceful degradation. This is what makes AI actually useful. |
| 2 | **Three-tier AI Governance** | auto/suggest/blocked action types checked before every tool execution. Institutions can trust the AI because they control it. No competitor has this. |
| 3 | **Per-tenant AI Cost Tracking** | Every AI interaction logs tenantId, agentType, input/output tokens, estimated USD. Ready for usage-based billing from day one. |
| 4 | **Event-driven Proactive AI** | 10 typed events (enrollment, submission, grade change, etc.) trigger AI automatically. The AI doesn't wait to be asked — it notices when something matters. |
| 5 | **Declarative Agent Definitions** | Agents are TypeScript objects, not classes. Adding a new agent is 30 lines of config, not 300 lines of code. This is how you scale from 2 agents to 20. |
| 6 | **Pedagogically Defensible Study Coach** | Socratic method enforced architecturally. Scoped to enrolled courses. Rate-limited. Escalation flags. This is how you sell to institutions that are terrified of AI cheating. |
| 7 | **Feed-first Architecture** | Server-side aggregation with urgency scoring. Not a notification center bolted on. The feed IS the product. Every competitor has dashboards; nobody has this. |
| 8 | **Context Snapshot** | JSONB column freezes a student's academic state when a conversation starts. The AI can't hallucinate about courses you're not in because it works from a snapshot, not live queries. |
| 9 | **Tenant Entity with SaaS Billing** | SubscriptionPlan enum, BillingStatus, settings JSONB. The business model is in the data model. Most edtech startups bolt billing on after funding; it's built in here. |
| 10 | **Unified Course Timeline** | Content + assignments + discussions in one chronological stream. Every other LMS separates these into tabs. This is a fundamental UX decision that can't be retrofitted. |

---

## The Security Reality Check

An honest assessment of what needs fixing before institutions would trust this:

### Critical (Fix Before Any New Features)
1. **No tenant scoping on findById methods** — Any authenticated user could theoretically access another tenant's data by guessing UUIDs. Every `findById(id)` must become `findById(id, tenantId)`.
2. **No authorization on submission queries** — The `assignmentSubmissions` query returns ALL submissions for ANY assignment to ANY authenticated user. Students could see other students' work.
3. **JWT stored in localStorage** — Vulnerable to XSS attacks. Must migrate to httpOnly cookies.
4. **Zero database indexes** — No `@Index` decorators on any entity. Every query is a full table scan. This doesn't matter at 10 users; it's catastrophic at 10,000.

### Important (Fix Before Demo)
5. **Missing tenantId on 4 entities** — Enrollment, Assignment, Submission, and Announcement don't have direct tenantId columns. Queries must traverse relationships to scope by tenant, which is slow and error-prone.
6. **Email unique constraint is global** — `john@university.edu` can only exist in one tenant. Must be a composite unique on `[email, tenantId]`.
7. **No database transactions** — Multi-step operations (grading, enrollment) don't use transactions. A crash mid-operation could leave data in an inconsistent state.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    NEXUSED PLATFORM                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐     │
│  │                          FRONTEND (Next.js 16)                              │     │
│  │                                                                             │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │     │
│  │  │  Auth    │  │   Home   │  │ Courses  │  │ Messages │  │  Admin   │     │     │
│  │  │  Pages   │  │   Feed   │  │ Timeline │  │   Chat   │  │  Panel   │     │     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘     │     │
│  │       │              │             │             │             │            │     │
│  │  ┌────┴──────────────┴─────────────┴─────────────┴─────────────┴────┐      │     │
│  │  │                    Shared Layer                                   │      │     │
│  │  │  Apollo Client │ Zustand Store │ shadcn/ui │ Auth Guard          │      │     │
│  │  └──────────────────────────┬────────────────────────────────────────┘      │     │
│  └─────────────────────────────┼───────────────────────────────────────────────┘     │
│                                │                                                     │
│                    ┌───────────┴───────────┐                                         │
│                    │  GraphQL (Primary)    │  REST (Auth only)                        │
│                    │  Apollo Federation    │  /api/auth/*                             │
│                    └───────────┬───────────┘                                         │
│                                │                                                     │
│  ┌─────────────────────────────┼───────────────────────────────────────────────┐     │
│  │                    BACKEND (NestJS)                                          │     │
│  │                                                                             │     │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │     │
│  │  │                     Feature Modules                                 │    │     │
│  │  │                                                                     │    │     │
│  │  │  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐ │    │     │
│  │  │  │  Auth  │ │ Users  │ │ Courses  │ │ Assignments  │ │  Feed    │ │    │     │
│  │  │  │ JWT+   │ │ Roles  │ │ Sections │ │ Submissions  │ │ Ranking  │ │    │     │
│  │  │  │ OAuth  │ │ CRUD   │ │ Enroll   │ │ Grading      │ │ Urgency  │ │    │     │
│  │  │  └────────┘ └────────┘ └──────────┘ └──────────────┘ └──────────┘ │    │     │
│  │  │                                                                     │    │     │
│  │  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐               │    │     │
│  │  │  │ Announcements│ │   Tenant     │ │  Messaging   │               │    │     │
│  │  │  │ Priority     │ │  Multi-tenant│ │  DMs/Threads │               │    │     │
│  │  │  │ Pinning      │ │  Isolation   │ │  Contacts    │               │    │     │
│  │  │  └──────────────┘ └──────────────┘ └──────────────┘               │    │     │
│  │  └─────────────────────────────────────────────────────────────────────┘    │     │
│  │                                                                             │     │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │     │
│  │  │                     AI Module                                       │    │     │
│  │  │                                                                     │    │     │
│  │  │  ┌────────────────┐  ┌─────────────────┐  ┌────────────────────┐  │    │     │
│  │  │  │ AgentExecutor  │  │   Governance     │  │   Tool Registry    │  │    │     │
│  │  │  │ ─────────────  │  │   ───────────    │  │   ──────────────   │  │    │     │
│  │  │  │ Multi-turn     │  │   Auto/Suggest/  │  │   16 tools         │  │    │     │
│  │  │  │ agentic loop   │  │   Blocked tiers  │  │   (course, grade,  │  │    │     │
│  │  │  │ with tool use  │  │   Rate limiting  │  │    enrollment,     │  │    │     │
│  │  │  │                │  │   Token budgets  │  │    analytics)      │  │    │     │
│  │  │  └────────────────┘  └─────────────────┘  └────────────────────┘  │    │     │
│  │  │                                                                     │    │     │
│  │  │  ┌────────────────┐  ┌─────────────────┐  ┌────────────────────┐  │    │     │
│  │  │  │ Agent Registry │  │  Event Listener  │  │  Usage Tracking    │  │    │     │
│  │  │  │ ─────────────  │  │  ──────────────  │  │  ───────────────   │  │    │     │
│  │  │  │ StudyCoach     │  │  10 typed events │  │  Per-tenant cost   │  │    │     │
│  │  │  │ FeedbackCopilot│  │  Proactive AI    │  │  Token counting    │  │    │     │
│  │  │  │ (declarative)  │  │  triggers        │  │  USD estimation    │  │    │     │
│  │  │  └────────────────┘  └─────────────────┘  └────────────────────┘  │    │     │
│  │  │                                                                     │    │     │
│  │  │  ┌────────────────────────────────────────────────────────────────┐ │    │     │
│  │  │  │ Context Service — Snapshot student state → JSONB              │ │    │     │
│  │  │  │ Prevents hallucination by grounding AI in frozen reality      │ │    │     │
│  │  │  └────────────────────────────────────────────────────────────────┘ │    │     │
│  │  └─────────────────────────────────────────────────────────────────────┘    │     │
│  │                                                                             │     │
│  │  ┌─────────────────────────────────────────────────────────────────────┐    │     │
│  │  │                 Infrastructure Layer                                │    │     │
│  │  │                                                                     │    │     │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │    │     │
│  │  │  │ Guards   │  │ Config   │  │ Decorators│  │ Event Emitter    │  │    │     │
│  │  │  │ JWT Auth │  │ DB/Auth/ │  │ @Roles   │  │ EventEmitter2    │  │    │     │
│  │  │  │ Roles    │  │ AI/App   │  │ @Current │  │ Typed events     │  │    │     │
│  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │    │     │
│  │  └─────────────────────────────────────────────────────────────────────┘    │     │
│  └─────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │                          DATA LAYER                                          │    │
│  │                                                                              │    │
│  │  ┌─────────────────────────┐  ┌──────────────┐  ┌────────────────────────┐  │    │
│  │  │      PostgreSQL 16      │  │    Redis      │  │     Anthropic API     │  │    │
│  │  │  ───────────────────    │  │  ──────────   │  │  ─────────────────    │  │    │
│  │  │  9 core entities        │  │  BullMQ jobs  │  │  Claude 3.5 Sonnet   │  │    │
│  │  │  3 AI entities          │  │  Rate limit   │  │  Tool-use capable    │  │    │
│  │  │  3 messaging entities   │  │  cache store  │  │  Agentic execution   │  │    │
│  │  │  Row-Level Security     │  │               │  │                      │  │    │
│  │  │  TypeORM                │  │               │  │                      │  │    │
│  │  └─────────────────────────┘  └──────────────┘  └────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │                      TENANT ISOLATION                                        │    │
│  │                                                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │    │
│  │  │  Tenant A    │  │  Tenant B    │  │  Tenant C    │  │  Tenant N    │    │    │
│  │  │  UVic        │  │  UBC         │  │  SFU         │  │  ...         │    │    │
│  │  │              │  │              │  │              │  │              │    │    │
│  │  │  Own data    │  │  Own data    │  │  Own data    │  │  Own data    │    │    │
│  │  │  Own AI cap  │  │  Own AI cap  │  │  Own AI cap  │  │  Own AI cap  │    │    │
│  │  │  Own billing │  │  Own billing │  │  Own billing │  │  Own billing │    │    │
│  │  │  Own rules   │  │  Own rules   │  │  Own rules   │  │  Own rules   │    │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: How a Student's Day Works

```
Student opens NexusEd
       │
       ▼
┌─────────────────────────────────┐
│  Apollo Client sends            │
│  studentFeed query              │
│  with JWT + tenantId            │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  FeedService aggregates:        │
│  • Assignments due in 48hrs     │
│  • Recent grades (24hrs)        │
│  • Announcements (7 days)       │
│  Ranks by urgency score         │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Student sees 3-5 items:        │
│  1. "PSYC 300 essay due 4hrs"  │
│  2. "MATH 200 midterm: 87%"    │
│  3. "CS 115 office hrs moved"  │
└──────────────┬──────────────────┘
               │
       Student clicks essay ───────────────────────┐
               │                                    │
               ▼                                    ▼
┌──────────────────────────┐     ┌──────────────────────────┐
│  Assignment detail page  │     │  (Future) Study Coach    │
│  • Instructions          │     │  "What's your thesis?"   │
│  • Rubric                │     │  "Have you reviewed the  │
│  • Submit button         │     │   Week 5 readings?"      │
│  • Past submissions      │     │  Socratic, never answers │
└──────────┬───────────────┘     └──────────────────────────┘
           │
   Student submits
           │
           ▼
┌──────────────────────────────────────────────┐
│  EventEmitter fires SUBMISSION_CREATED       │
│       │                                      │
│       ├──→ Feed updates (next refresh)       │
│       ├──→ (Future) AI FeedbackCopilot       │
│       │    drafts rubric-based feedback       │
│       └──→ (Future) Instructor notification  │
└──────────────────────────────────────────────┘
```

---

## The Competitive Landscape

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│   TRADITIONAL LMS                        NEXUSED                           │
│   (Canvas, Brightspace, Moodle)          (What we're building)             │
│                                                                            │
│   ┌───────────────────────┐              ┌───────────────────────┐         │
│   │ Dashboard of links    │              │ Intelligent feed      │         │
│   │ 13 nav items          │              │ 3 nav items           │         │
│   │ Folder-based content  │              │ Timeline-based        │         │
│   │ Tab-separated views   │              │ Unified stream        │         │
│   │ AI = chatbot sidebar  │              │ AI = infrastructure   │         │
│   │ One-size-fits-all     │              │ Role-adaptive         │         │
│   │ No advising           │              │ AI Course Planner     │         │
│   │ Desktop-first         │              │ Mobile-first          │         │
│   │ Single-tenant         │              │ Multi-tenant SaaS     │         │
│   │ No governance         │              │ 3-tier AI governance  │         │
│   └───────────────────────┘              └───────────────────────┘         │
│                                                                            │
│   EDTECH AI (Khanmigo, Chegg)            NEXUSED AI                        │
│                                                                            │
│   ┌───────────────────────┐              ┌───────────────────────┐         │
│   │ Chatbot bolted on     │              │ Agentic loop          │         │
│   │ Math error-prone      │              │ Tool-use capable      │         │
│   │ No institutional ctrl │              │ Governance engine     │         │
│   │ Generic, not scoped   │              │ Course-scoped         │         │
│   │ No cost tracking      │              │ Per-tenant budgets    │         │
│   │ Reactive only         │              │ Event-driven/proactive│         │
│   └───────────────────────┘              └───────────────────────┘         │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## The Road Ahead (Simplified)

```
Phase 2.5: Harden ──→ Phase 3: Complete ──→ Phase 4: AI Power ──→ Phase 5: Market
(1-2 weeks)           (3-4 weeks)            (3-4 weeks)           (4-6 weeks)

Fix 4 security        AI Chat UI             Wire event listeners  Database migrations
issues                Messaging system        Feed ML ranking       PWA mobile app
Fix 7 data            Content builder         AI Course Planner     WCAG accessibility
integrity issues      Real-time (Socket.IO)   Study Coach UI        LTI 1.3
Add indexes           Dashboard widgets       Instructor AI tools   Analytics dashboards
Add transactions      Test foundation         Governance console    Agent Builder
```

Each phase builds on the previous. You can't demo AI (Phase 4) without fixing security (Phase 2.5). You can't sell to institutions (Phase 5) without AI that works (Phase 4). The order matters.

---

## Why This Wins

The traditional edtech market is a **$400B industry built on mediocrity**. Canvas has 30% market share not because it's great, but because switching costs are enormous. Brightspace wins contracts through analytics dashboards that administrators like, not learning experiences that students love.

NexusEd attacks from a direction none of them can follow:

1. **AI-native, not AI-added.** You can't retrofit a feed-first, agentic architecture onto a 15-year-old codebase. They'd have to rebuild from scratch — and they won't, because their existing customers are paying.

2. **Student-first, not admin-first.** Every incumbent optimized for the buyer (administrators), not the user (students). NexusEd optimizes for the user and makes the buyer happy as a side effect (through analytics, governance, cost control).

3. **Governance as a feature.** The #1 objection to AI in education is "we can't control it." NexusEd's three-tier governance isn't a restriction — it's the selling point. "Your institution controls exactly what the AI can do, at the infrastructure level."

4. **The advisor that scales.** The AI Course Planner solves a problem that every university has and none can fix with humans alone: every student needs personalized academic advising, and there aren't enough advisors. This isn't a feature — it's the reason institutions will switch.

---

*This document is a narrative companion to [ROADMAP.md](./ROADMAP.md), [BACKLOG.md](./BACKLOG.md), and [MISSION.md](./MISSION.md). It tells the same story in human terms.*
