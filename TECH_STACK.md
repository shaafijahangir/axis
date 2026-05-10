# Axis Technology Stack Decisions

> Every technology choice here answers one question: **Is this the right tool for the problem, at this stage, for this team?**
>
> "Best" doesn't mean most popular or most modern. It means: proven for the use case, maintainable by a small team, and won't need replacing within 2 years.

---

## Decision Framework

Each technology is evaluated on:
- **Problem fit**: Does it solve our specific problem well?
- **Team fit**: Can a 1-2 person team maintain it?
- **Ecosystem**: Are there enough libraries, docs, and community support?
- **Migration cost**: If we need to change later, how painful is it?
- **Scale ceiling**: At what point does this become the bottleneck?

---

## Current Stack (What We Have)

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| Frontend Framework | Next.js | 16 | ✅ Keep |
| UI Library | React | 19 | ✅ Keep |
| Styling | Tailwind CSS | 4 | ✅ Keep |
| Component Library | shadcn/ui (Radix) | latest | ✅ Keep |
| Frontend State | Zustand | 5 | ✅ Keep |
| GraphQL Client | Apollo Client | 4 | ✅ Keep (configure properly) |
| Backend Framework | NestJS | 11 | ✅ Keep (swap adapter) |
| API Protocol | GraphQL (Apollo Server) | 5 | ✅ Keep |
| Database | PostgreSQL | 16 | ✅ Keep |
| ORM | TypeORM | 0.3.28 | ⚠️ Keep now, migrate later |
| Auth | Passport.js + JWT | — | ✅ Keep (fix token storage) |
| Job Queue | BullMQ | 5.66 | ✅ Keep |
| Cache/Queue Backend | Redis | — | ✅ Keep |
| AI SDK | Anthropic SDK | 0.71.2 | ⚠️ Replace with abstraction |
| Real-time | Socket.IO | 4.8.1 | ✅ Keep (add SSE for AI) |
| Monorepo | npm scripts + concurrently | — | ⚠️ Replace with Turborepo |

---

## Decisions In Detail

### 1. Backend Framework: NestJS — KEEP

**Verdict:** NestJS is the right choice. Don't change it.

**Why it's right for Axis:**
- Module system maps perfectly to our feature boundaries (auth, courses, assignments, AI, feed)
- First-class GraphQL support with decorators (@Resolver, @Query, @Mutation)
- Built-in dependency injection makes testing and mocking straightforward
- Guards, interceptors, and pipes give us clean cross-cutting concerns (auth, tenant scoping, validation)
- EventEmitter2 integration powers our event-driven AI architecture

**One change: Switch to Fastify adapter**

NestJS defaults to Express under the hood. Fastify handles 3x more requests per second with lower memory usage. The switch is a ~10-line change in `main.ts`:

```typescript
// Before (Express — implicit)
const app = await NestFactory.create(AppModule);

// After (Fastify — explicit)
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
);
```

**When to do it:** Phase 2.5 (infrastructure hardening). It's low-risk and high-reward.

**Scale ceiling:** NestJS + Fastify handles 50,000+ concurrent connections comfortably. If we outgrow this, we're at the scale where microservices make sense, and NestJS modules map cleanly to service boundaries.

---

### 2. ORM: TypeORM → Drizzle ORM (Migration Path)

**Verdict:** Keep TypeORM now. Plan migration to Drizzle ORM for Phase 4+.

**Why TypeORM works for now:**
- Already integrated with 15 entities, all working
- Decorator-based syntax matches NestJS patterns
- Supports the JSONB columns, enum types, and relation patterns we use

**Why we'll eventually migrate to Drizzle:**
- TypeORM has known issues with complex queries, inconsistent behavior, and slow release cycles
- Drizzle is type-safe at the SQL level — your TypeScript types ARE your schema
- Drizzle generates SQL migrations natively (we need this — currently using `synchronize: true`)
- Drizzle's query builder is closer to SQL, which means fewer surprises
- ~5x faster query execution for complex joins

**Migration strategy:**
1. Phase 2.5: Disable `synchronize: true`, generate initial TypeORM migration as baseline
2. Phase 4: Introduce Drizzle for NEW modules only (analytics, agent builder)
3. Phase 5: Migrate existing entities one module at a time
4. Keep both ORMs running during transition (dual-ORM is fine in NestJS via separate providers)

**What NOT to do:** Don't migrate now. It would touch every entity, service, and resolver in the codebase. The ROI isn't there until we need proper migrations and complex analytical queries.

---

### 3. GraphQL Client: Apollo Client 4 — KEEP (Fix Configuration)

**Verdict:** Keep Apollo Client. Fix the configuration issues.

**What's wrong right now:**
```typescript
// Current — no type policies, no error handling
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});
```

**What it should be:**
```typescript
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        studentFeed: { merge: false },       // Always replace feed, don't merge
        sectionTimeline: { merge: false },
      },
    },
    User: { keyFields: ['id'] },
    Assignment: { keyFields: ['id'] },
    Submission: { keyFields: ['id'] },
    Conversation: { keyFields: ['id'] },
  },
});

// Add error link for 401 → auto-logout
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (networkError && 'statusCode' in networkError && networkError.statusCode === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
  }
});

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
```

**Why not switch to urql or Relay:**
- Apollo Client 4 has the largest ecosystem for React + GraphQL
- DevTools are the best in class
- Our existing queries/mutations all use Apollo hooks
- Relay requires a compiler step and schema conventions we don't follow
- urql is lighter but we'd lose normalized caching quality

**Also: Remove @tanstack/react-query**

It's installed in `package.json` but never imported anywhere. We use Apollo for all data fetching. Remove it to reduce bundle size and avoid confusion.

---

### 4. API Protocol: GraphQL — KEEP

**Verdict:** GraphQL is correct for Axis. Don't add REST or tRPC.

**Why GraphQL is right:**
- Our data is deeply relational (users → enrollments → sections → courses → assignments → submissions). GraphQL's nested queries prevent N+1 API calls.
- Role-based views need different data shapes. Students see their submissions; instructors see all submissions. Same entity, different projections — GraphQL handles this natively.
- The AI module generates dynamic queries through tools. GraphQL's type system means AI tools can introspect the schema.

**Important: Add DataLoader**

GraphQL's biggest performance trap is N+1 queries in nested resolvers. When you query 20 assignments and each resolves its section, that's 21 database calls instead of 2.

```typescript
// Without DataLoader — 21 queries
@ResolveField('section')
async section(@Parent() assignment: Assignment) {
  return this.sectionsService.findById(assignment.sectionId); // Called 20 times
}

// With DataLoader — 2 queries
@ResolveField('section')
async section(@Parent() assignment: Assignment, @Context() ctx) {
  return ctx.sectionLoader.load(assignment.sectionId); // Batched into 1 query
}
```

**When to add:** Phase 2.5. Create DataLoaders as `@Injectable({ scope: Scope.REQUEST })` providers.

---

### 5. Authentication: JWT + Passport.js — KEEP (Fix Token Storage)

**Verdict:** Keep the auth system. Fix the critical token storage vulnerability.

**Current state:** JWT is stored in localStorage and attached via Apollo Link. This is vulnerable to XSS — any injected script can steal the token.

**Fix: httpOnly cookies**

```typescript
// Backend: Set cookie on login instead of returning token in body
@Post('login')
async login(@Body() dto, @Res({ passthrough: true }) res: Response) {
  const { token, user } = await this.authService.login(dto);
  res.cookie('access_token', token, {
    httpOnly: true,    // JavaScript can't read it
    secure: true,      // HTTPS only
    sameSite: 'lax',   // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
  return { user }; // Don't return token in body
}

// Frontend: Remove localStorage token management
// Apollo Client sends cookies automatically with `credentials: 'include'`
const httpLink = createHttpLink({
  uri: 'http://localhost:3001/api/graphql',
  credentials: 'include',
});
```

**Why not switch to NextAuth/Auth.js:**
- We already have working JWT + Google OAuth
- NextAuth adds complexity for multi-tenant scenarios (tenant detection at auth time)
- Our auth is simple enough that a custom solution is maintainable
- NextAuth's session strategy doesn't map well to our GraphQL-first architecture

**When to fix:** Phase 2.5 (SEC-003 in BACKLOG.md). This is a P0 security issue.

---

### 6. Real-time: Socket.IO + SSE — KEEP + ADD

**Verdict:** Keep Socket.IO for bidirectional messaging. Add Server-Sent Events (SSE) for AI streaming.

**Why two protocols:**
- **Socket.IO** is right for messaging: bidirectional, room-based, presence detection, reconnection handling. When a student sends a message, both participants need instant updates.
- **SSE** is right for AI streaming: unidirectional (server → client), native browser support, works through proxies/CDNs, lighter than WebSockets. When the Study Coach is "thinking," you want tokens to stream in real-time.

**Pattern:**
```
Messaging, notifications, presence  →  Socket.IO  (bidirectional)
AI response streaming               →  SSE        (server → client)
Feed updates                        →  SSE        (server → client)
```

**Why not just Socket.IO for everything:**
- SSE is simpler for one-way streaming and doesn't require a persistent connection
- AI responses are naturally one-directional — the model streams, the client displays
- SSE works natively with HTTP/2 multiplexing

**When to implement:**
- Socket.IO for messaging: Phase 3 (FEAT-005)
- SSE for AI streaming: Phase 4 (with AI Chat UI)

---

### 7. AI SDK: Anthropic SDK → Provider Abstraction

**Verdict:** Wrap the Anthropic SDK behind an abstraction layer. Consider Vercel AI SDK as the wrapper.

**Current problem:**
```typescript
// Direct vendor dependency scattered through AI module
import Anthropic from '@anthropic-ai/sdk';
```

If Anthropic changes their API, raises prices, or we need to add OpenAI/Google as fallbacks, we'd need to modify every file that imports the SDK.

**Solution: AI Provider Interface**

```typescript
// Abstract interface
interface AiProvider {
  chat(messages: Message[], tools?: Tool[]): Promise<AiResponse>;
  stream(messages: Message[], tools?: Tool[]): AsyncIterable<AiChunk>;
}

// Anthropic implementation
class AnthropicProvider implements AiProvider { ... }

// Future: OpenAI, Google, local model implementations
class OpenAIProvider implements AiProvider { ... }
```

**Vercel AI SDK option:**

The Vercel AI SDK already provides this abstraction with support for Anthropic, OpenAI, Google, Mistral, and local models through a unified interface. It also includes:
- Built-in streaming with React hooks (`useChat`, `useCompletion`)
- Tool-use support matching our existing pattern
- Token counting and cost estimation
- Edge runtime support

**Decision:** Evaluate Vercel AI SDK for Phase 4. If it fits our agentic loop pattern (multi-turn tool use), adopt it. If not, build a thin abstraction ourselves. Either way, the direct `@anthropic-ai/sdk` import must be wrapped.

**When:** Phase 3 (ARCH-005 in BACKLOG.md) for the abstraction layer. Phase 4 for potential Vercel AI SDK adoption.

---

### 8. Monorepo Tooling: npm scripts → Turborepo + pnpm

**Verdict:** Add Turborepo for build orchestration. Switch to pnpm for package management.

**Current problem:**
```json
// root package.json — sequential builds, no caching
"build": "npm run build --prefix axis-backend && npm run build --prefix axis-frontend"
```

Backend and frontend builds are independent but run sequentially. Every build starts from scratch. CI runs are slow.

**Turborepo gives us:**
- **Parallel execution**: Backend and frontend build simultaneously
- **Build caching**: Unchanged packages skip rebuild (local + remote cache)
- **Task dependencies**: `test` depends on `build`, declared once, enforced everywhere
- **~60% faster CI** on incremental builds

**pnpm gives us:**
- **Strict dependency resolution**: No phantom dependencies (a package can't import something it didn't declare)
- **Disk space savings**: Hard-linked node_modules, shared across projects
- **Faster installs**: ~2x faster than npm for monorepos
- **Workspace protocol**: `"axis-shared": "workspace:*"` for internal packages

**Migration steps:**
1. Install pnpm globally: `npm install -g pnpm`
2. Add `pnpm-workspace.yaml` at root
3. Run `pnpm import` to convert `package-lock.json` → `pnpm-lock.yaml`
4. Add `turbo.json` with pipeline definitions
5. Update CI workflows to use `pnpm` and `turbo`

**When to do it:** Phase 2.5 (ARCH-006 in BACKLOG.md). Do it before feature development ramps up so all future work benefits.

---

### 9. Testing Strategy

**Verdict:** Three-tier testing with specific tools per tier.

| Tier | Tool | What It Tests | When to Add |
|------|------|---------------|-------------|
| Unit | Jest | Services, utilities, pure functions | Phase 2.5 (TEST-001) |
| Integration | Jest + Testcontainers | Resolvers → Service → DB round-trip | Phase 3 (TEST-003) |
| E2E | Playwright | Full user flows through the browser | Phase 3 (TEST-004) |

**Why Jest (not Vitest) for backend:**
- NestJS has first-class Jest integration (`@nestjs/testing` module)
- Jest's module mocking maps to NestJS's DI container
- Switching to Vitest would require rewriting NestJS's testing utilities

**Why Playwright (not Cypress) for E2E:**
- Playwright supports all browsers (Chromium, Firefox, WebKit)
- Built-in auto-waiting eliminates flaky `cy.wait()` calls
- Component testing mode for isolated frontend tests
- Microsoft-backed with regular releases

**Why Testcontainers for integration:**
- Spins up a real PostgreSQL container per test suite
- Tests run against actual database behavior, not mocked SQL
- Container lifecycle managed automatically (create → test → destroy)
- Eliminates "works in test, fails in prod" database issues

**Priority test targets:**
1. `GovernanceService` — The AI guardrail must be tested. If it's wrong, AI does things it shouldn't.
2. `FeedService` — Feed ranking is the product. If it's wrong, students miss deadlines.
3. `AssignmentsService` — Grading flow. If it's wrong, grades are corrupted.
4. Auth flow E2E — Login → see feed → navigate to course → submit assignment

---

### 10. Deployment Infrastructure

**Verdict:** Start with managed services. Don't over-engineer infrastructure at this stage.

**Recommended stack for early stage (0-1000 users):**

| Component | Service | Why |
|-----------|---------|-----|
| Backend | Railway | One-click NestJS deploy, autoscale, built-in monitoring |
| Database | Neon | Serverless PostgreSQL, branching for preview environments, generous free tier |
| Redis | Upstash | Serverless Redis, pay-per-request, no idle costs |
| Frontend | Vercel | Native Next.js support, edge functions, preview deploys per PR |
| File Storage | AWS S3 / Cloudflare R2 | Assignment submissions, course content files |
| AI | Anthropic API direct | No need for a proxy at this scale |

**Why NOT AWS/GCP/Azure directly:**
- Infrastructure management is a full-time job. At 1-2 people, every hour on DevOps is an hour not building features.
- Railway/Neon/Upstash abstract away 90% of ops work
- When we outgrow them (10,000+ users), we can migrate to managed Kubernetes — but that's a Series A problem, not a today problem.

**Cost estimate (early stage):**
- Railway: ~$5-20/month (hobby → pro)
- Neon: Free tier → $19/month (pro)
- Upstash: Free tier → $10/month
- Vercel: Free tier → $20/month (pro)
- Anthropic API: ~$50-200/month (depends on usage)
- **Total: ~$85-270/month**

---

### 11. Database Decisions

**PostgreSQL 16 — KEEP. No changes.**

PostgreSQL is the correct database for Axis. The reasons are structural:

1. **Row-Level Security** — Our multi-tenant isolation depends on it. No other database offers RLS with this level of maturity.
2. **JSONB** — Course settings, user preferences, rubrics, AI context snapshots — all stored as typed JSON with indexing. We use JSONB extensively.
3. **Enum types** — User roles, assignment types, submission statuses, subscription plans. PostgreSQL enums are type-safe at the database level.
4. **Full-text search** — We'll need this for course content search. PostgreSQL's `tsvector` is good enough to avoid adding Elasticsearch.

**What we need to add:**
- Indexes on every entity (`@Index` decorators) — SEC-004
- Database migrations (disable `synchronize: true`) — FEAT-007
- Connection pooling (PgBouncer or built-in pool tuning) — Phase 5

---

### 12. Frontend Decisions

**Next.js 16 + React 19 — KEEP.**

**Tailwind CSS 4 — KEEP.** No discussion needed. It's the industry standard for utility-first CSS.

**shadcn/ui — KEEP.** Copy-paste components we own. No vendor lock-in. Accessible by default (Radix primitives).

**Zustand — KEEP.** Minimal API, no boilerplate, perfect for auth state. We don't need Redux's complexity or Context API's re-render issues.

**React Hook Form + Zod — KEEP.** Every form in the app uses this pattern. It's validated, it's fast, it's type-safe. Don't change it.

---

## Technologies We Evaluated and Rejected

| Technology | Why Rejected |
|-----------|-------------|
| **Prisma** | Generates a client that conflicts with NestJS DI. TypeORM/Drizzle fit NestJS's module pattern better. |
| **tRPC** | Designed for same-language full-stack apps. We already have GraphQL, and adding tRPC alongside it would create two API paradigms. |
| **Redux** | Overkill for our state complexity. Zustand does the same job in 1/10th the code. |
| **Styled Components / CSS Modules** | Tailwind is faster to write, easier to maintain, and better for a small team. |
| **MongoDB** | Relational data needs a relational database. Courses have sections have assignments have submissions — this is SQL. |
| **Firebase** | Vendor lock-in, limited query capabilities, no RLS, can't run locally. |
| **Supabase** | Good product, but we need NestJS's module system for our backend complexity. Supabase is better for simpler backends. |
| **Remix** | Strong framework, but Next.js has a larger ecosystem and better Vercel integration. We'd gain little by switching. |
| **Cypress** | Playwright is faster, supports more browsers, and has better auto-waiting. |

---

## Stack Evolution Timeline

```
NOW (Phase 2.5)                    PHASE 3-4                         PHASE 5+
─────────────────                  ──────────                        ────────
NestJS + Express                   NestJS + Fastify                  NestJS + Fastify
TypeORM (sync: true)               TypeORM (migrations)              Drizzle ORM
Anthropic SDK direct               AI provider abstraction           Vercel AI SDK (maybe)
npm + concurrently                 pnpm + Turborepo                  pnpm + Turborepo
No tests                           Jest + Testcontainers             + Playwright E2E
JWT in localStorage                httpOnly cookies                  httpOnly cookies
No indexes                         Indexes on all entities           + read replicas
Polling (messaging)                Socket.IO + SSE                   Socket.IO + SSE
No caching                         Apollo type policies              + Redis query cache
```

---

## Decision Records

When a technology decision is made, it should be recorded here with:
- **Date**
- **Decision**
- **Context** (why was this evaluated?)
- **Alternatives considered**
- **Consequences** (what does this enable/prevent?)

### DR-001: Keep TypeORM, Plan Drizzle Migration
- **Date:** 2026-02-06
- **Decision:** Continue with TypeORM for existing entities. Introduce Drizzle for new modules in Phase 4+.
- **Context:** TypeORM has known DX issues, but migrating 15 entities mid-development is too risky.
- **Alternatives:** Migrate now (too disruptive), switch to Prisma (NestJS DI conflicts), stay on TypeORM forever (accumulates tech debt).
- **Consequences:** Dual-ORM period during transition. New team members need to learn both.

### DR-002: Fastify Adapter Swap
- **Date:** 2026-02-06
- **Decision:** Switch NestJS from Express to Fastify adapter in Phase 2.5.
- **Context:** 3x throughput improvement for a ~10-line change. No dependency on Express-specific middleware.
- **Alternatives:** Stay on Express (leave performance on the table).
- **Consequences:** Any Express-specific middleware would need Fastify equivalents. Our current middleware is framework-agnostic.

### DR-003: AI Provider Abstraction
- **Date:** 2026-02-06
- **Decision:** Wrap Anthropic SDK behind an interface. Evaluate Vercel AI SDK in Phase 4.
- **Context:** Direct `@anthropic-ai/sdk` imports create vendor lock-in. We may need OpenAI fallback or local models for data-residency requirements.
- **Alternatives:** Keep direct imports (works but locks us in), switch to Vercel AI SDK now (untested with our agentic loop pattern).
- **Consequences:** Small overhead for the abstraction. Enables multi-provider support.

### DR-004: pnpm + Turborepo
- **Date:** 2026-02-06
- **Decision:** Migrate from npm scripts + concurrently to pnpm + Turborepo.
- **Context:** Sequential builds waste CI time. No caching means rebuilding unchanged packages every run.
- **Alternatives:** Nx (heavier, more opinionated), Lerna (deprecated patterns), keep current setup (slow but works).
- **Consequences:** ~60% faster CI. Stricter dependency resolution may surface phantom dependency issues (good — these are bugs).

---

*This document is a living reference. Update it when technology decisions are made or reconsidered.*
*Companion to: [ROADMAP.md](./ROADMAP.md), [BACKLOG.md](./BACKLOG.md), [CLAUDE.md](./CLAUDE.md)*
