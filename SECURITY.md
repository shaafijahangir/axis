# NexusEd Security

> Security posture, authentication model, data isolation strategy, and compliance considerations. This document is required reading before touching auth, tenancy, or user data.

---

## Authentication

### Model

NexusEd uses **JWT tokens stored in httpOnly cookies**, authenticated via Passport.js.

```
Login Flow:
1. POST /api/auth/login { email, password }
2. Backend validates credentials (bcrypt hash comparison)
3. Backend sets httpOnly cookie: access_token (JWT, 7-day expiry)
4. Frontend receives { user } (no token in response body)
5. All subsequent requests include cookie automatically

Google OAuth Flow:
1. GET /api/auth/google → redirect to Google consent
2. Google callback → backend creates/finds user
3. Backend sets httpOnly cookie
4. Redirect to frontend /home
```

### Token Security

| Property | Value | Rationale |
|----------|-------|-----------|
| Storage | httpOnly cookie | Prevents XSS token theft — JavaScript cannot read the cookie |
| Secure flag | `true` (HTTPS only) | Prevents transmission over unencrypted connections |
| SameSite | `lax` | Prevents CSRF on cross-origin POST requests |
| Max age | 7 days | Balance between UX (not logging in daily) and security |
| Signing | HS256 with `JWT_SECRET` env var | Symmetric signing — sufficient for single-service architecture |

### JWT Payload

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "roles": ["student"],
  "tenantId": "tenant-uuid",
  "iat": 1700000000,
  "exp": 1700604800
}
```

### Auth Guards

Every protected endpoint uses a two-layer guard chain:

```
Request → JwtAuthGuard → RolesGuard → Resolver/Controller
           │                │
           │                └─ Checks @Roles() decorator
           │                   Rejects if user lacks required role
           └─ Extracts JWT from cookie (fallback: Authorization header)
              Validates signature and expiry
              Attaches user to request context
```

**Auto-logout:** Apollo Client's error link detects 401/UNAUTHENTICATED responses and redirects to `/login`.

### Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/login` | POST | Public | Email/password login |
| `/api/auth/register` | POST | Public | New user registration |
| `/api/auth/logout` | POST | Authenticated | Clears cookie |
| `/api/auth/me` | GET | Authenticated | Current user info |
| `/api/auth/google` | GET | Public | Google OAuth initiation |
| `/api/auth/google/callback` | GET | Public | Google OAuth callback |
| `/api/graphql` | POST | Authenticated* | All GraphQL operations |

*GraphQL endpoint requires auth on all resolvers via guards. There are no public queries.

---

## Multi-Tenant Data Isolation

### Architecture

NexusEd is a **shared-database, shared-schema** multi-tenant system. All tenants share the same PostgreSQL database and tables. Isolation is enforced through application-level filtering.

```
                  ┌──────────────────────┐
                  │     PostgreSQL       │
                  │  (shared database)   │
                  │                      │
  Tenant A ──────│──  WHERE tenantId = A │
                  │                      │
  Tenant B ──────│──  WHERE tenantId = B │
                  │                      │
  Tenant C ──────│──  WHERE tenantId = C │
                  └──────────────────────┘
```

### Isolation Layers

| Layer | Mechanism | Enforcement |
|-------|-----------|-------------|
| **Entity design** | `TenantScopedEntity` base class with `tenantId` column | Compile-time (TypeORM) |
| **Service methods** | Every `find*` includes `WHERE tenantId = :tenantId` | Code review + conventions |
| **Global interceptor** | `TenantInterceptor` extracts tenantId from JWT into `AsyncLocalStorage` | Runtime (every request) |
| **Database indexes** | `@Index(['tenantId'])` on every tenant-scoped entity | Query performance |
| **Composite constraints** | `@Index(['email', 'tenantId'], { unique: true })` | Database-level uniqueness per tenant |

### What Gets Scoped

Every entity except `Tenant` itself is tenant-scoped, either directly (via `TenantScopedEntity`) or indirectly (via parent entity):

**Direct tenantId:** User, Course, AcademicTerm, DegreeProgram, Enrollment, Assignment, Submission, Announcement, AiConversation, Conversation, TenantAiConfig, CustomAgent, FeedEngagement, LtiPlatform

**Indirect (through parent):** CourseSection (→ Course), AiMessage (→ AiConversation), AiUsageLog (has tenantId but not via TenantScopedEntity), DirectMessage (→ Conversation), ConversationParticipant (→ Conversation)

### Anti-Patterns (What NOT to Do)

```typescript
// WRONG — Cross-tenant data leak
async findById(id: string): Promise<User> {
  return this.repo.findOneOrFail({ where: { id } });
}

// RIGHT — Tenant-scoped
async findById(id: string, tenantId: string): Promise<User> {
  return this.repo.findOneOrFail({ where: { id, tenantId } });
}
```

```typescript
// WRONG — Globally unique email blocks other tenants
@Column({ unique: true })
email: string;

// RIGHT — Unique per tenant
@Index(['email', 'tenantId'], { unique: true })
```

---

## Authorization

### Role-Based Access Control (RBAC)

| Role | Capabilities |
|------|-------------|
| **STUDENT** | View enrolled courses, submit assignments, view own grades, use Study Coach, plan courses |
| **TA** | Student capabilities + view section submissions, use Feedback Copilot |
| **INSTRUCTOR** | Create assignments, grade submissions, manage course content, create announcements, build custom agents |
| **ADMIN** | Full platform management — users, terms, courses, AI governance, analytics, LTI config |
| **PARENT** | View linked student's grades and progress, messaging |

### Resource-Level Authorization

Role guards verify the user's role. But they don't verify access to the *specific resource*. Both checks are required:

```typescript
// Role check: Is this user an instructor?
@Roles(UserRole.INSTRUCTOR)

// Resource check: Does this instructor teach this section?
async assignmentSubmissions(@CurrentUser() user: User, @Args('assignmentId') id: string) {
  const assignment = await this.findById(id, user.tenantId);
  await this.verifyInstructorAccess(user.id, assignment.sectionId);
  return this.findSubmissions(id);
}
```

### AI Governance Authorization

AI tool execution has its own three-tier permission system:

| Level | Behavior | Decision Point |
|-------|----------|---------------|
| **auto** | Execute immediately | GovernanceService (read-only tools) |
| **suggest** | Show user, require approval | GovernanceService (write tools) |
| **blocked** | Refuse, explain why | GovernanceService (destructive/unauthorized) |

Admins can override tool action types per-tenant via the AI Governance Console.

---

## Data Protection

### Sensitive Data Handling

| Data | Storage | Protection |
|------|---------|------------|
| Passwords | `passwordHash` column | bcrypt with salt rounds |
| JWT tokens | httpOnly cookie | Not accessible to JavaScript |
| Google OAuth ID | `googleId` column | No OAuth tokens stored server-side |
| Student grades | Database | Tenant-scoped, role-restricted |
| AI conversations | Database | Tenant-scoped, user-scoped |
| LTI private keys | Database column | Encrypted at rest (recommended) |

### What We Don't Store

- OAuth access/refresh tokens (stateless JWT flow)
- Credit card numbers (Stripe handles PCI)
- Social security numbers or government IDs
- Biometric data

### JSONB Fields

JSONB columns store flexible data (profiles, preferences, rubrics, AI context). Rules:

1. Never store sensitive data (passwords, tokens, PII beyond profile) in JSONB
2. Validate JSONB input at the service layer
3. Document the expected schema in DATA-MODEL.md
4. JSONB fields are nullable — always null-check before accessing

---

## FERPA Compliance Considerations

NexusEd handles **student education records** as defined by FERPA (Family Educational Rights and Privacy Act). The following applies to US institutional deployments:

### What FERPA Requires

| Requirement | NexusEd Status |
|-------------|---------------|
| Student records accessible only to authorized personnel | Enforced via RBAC + tenant isolation |
| Parents can access minor student records | Parent role exists, linking mechanism TBD |
| Students can review their own records | Students see own grades, submissions, enrollment |
| Consent before disclosing records to third parties | AI processing is first-party (our servers), no external disclosure |
| Annual notification of privacy practices | Requires institution-specific privacy notice |
| Audit trail of access to records | Event system logs AI tool invocations; full audit trail needed |

### What We Need to Add for Full Compliance

1. **Audit logging** — Log every access to student records (grades, submissions, enrollment) with timestamp, accessor, and action
2. **Data retention policy** — Configurable per-tenant retention periods with automated purging
3. **Data export** — Allow students to download all their data (FERPA right of access)
4. **Data deletion** — Support account deletion with cascading removal of records
5. **Consent management** — Record consent for AI-powered features (some institutions may require opt-in)
6. **De-identification** — AI training data (if ever used) must strip student identifiers

### AI-Specific FERPA Considerations

- AI conversations contain student academic context (grades, enrollment, submissions)
- AI-generated feedback on submissions is an education record
- Usage logs track student interaction patterns
- All AI data is tenant-scoped and user-scoped, preventing cross-student leakage
- The Context Snapshot system captures student state at conversation start — this snapshot is an education record

---

## Infrastructure Security

### Environment Variables

Required secrets (never committed to git):

| Variable | Purpose | Sensitivity |
|----------|---------|-------------|
| `DATABASE_PASSWORD` | PostgreSQL auth | Critical |
| `JWT_SECRET` | Token signing key | Critical |
| `ANTHROPIC_API_KEY` | AI API access | High |
| `GOOGLE_CLIENT_SECRET` | OAuth | High |
| `LTI_PRIVATE_KEY` | LTI 1.3 signing | High |

### Headers and CORS

- CORS: Restricted to `FRONTEND_URL` (default `http://localhost:3000`)
- Cookie: `SameSite: lax`, `Secure: true`, `httpOnly: true`
- No custom security headers yet (Helmet.js recommended for production)

### Dependencies

- Regular `npm audit` checks
- No known critical vulnerabilities in current dependencies
- Dependabot or Renovate recommended for automated updates

---

## Security Checklist for New Features

When building any new feature, verify:

- [ ] All queries include `tenantId` in WHERE clause
- [ ] Resolver has `@UseGuards(JwtAuthGuard, RolesGuard)`
- [ ] Appropriate `@Roles()` decorator is set
- [ ] Resource-level authorization is verified (not just role)
- [ ] Input is validated via class-validator DTOs
- [ ] No sensitive data exposed in GraphQL response
- [ ] No `as any` casts that bypass type checking
- [ ] Error messages don't leak internal details to users
- [ ] JSONB input is validated before storage
- [ ] Multi-step writes use transactions

---

## Known Security Debt

All P0 security issues have been resolved:

| Issue | Status | Resolution |
|-------|--------|------------|
| SEC-001: Missing tenant scoping on findById | DONE | All findById methods require tenantId |
| SEC-002: No auth on assignmentSubmissions | DONE | Added role guard + tenant scoping |
| SEC-003: JWT in localStorage | DONE | Migrated to httpOnly cookies |
| SEC-004: No database indexes | DONE | Indexes on all entities |

### Remaining Security Work

| Item | Priority | Phase |
|------|----------|-------|
| Full audit logging for FERPA | High | Phase 5 |
| Helmet.js security headers | Medium | Phase 5 |
| Rate limiting on auth endpoints | Medium | Phase 5 |
| SAML 2.0 / institutional SSO | Medium | Phase 5 |
| Data retention and purging | Medium | Phase 5 |
| Penetration testing | High | Pre-launch |

---

*Last updated: 2026-02-17*
*Companion docs: [ARCHITECTURE.md](./ARCHITECTURE.md) | [DATA-MODEL.md](./DATA-MODEL.md) | [CONVENTIONS.md](./CONVENTIONS.md)*
