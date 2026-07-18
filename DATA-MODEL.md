# Axis Data Model

> Complete reference for every entity, its fields, relationships, and JSONB schema contracts. Read this before writing any query, creating an entity, or modifying a relationship.

---

## Entity Inheritance

All entities extend one of two abstract base classes:

```
BaseEntity (abstract)
├── id: UUID (auto-generated)
├── createdAt: timestamp (auto)
└── updatedAt: timestamp (auto)

TenantScopedEntity extends BaseEntity (abstract)
├── tenantId: string (FK → tenants.id)
└── tenant: Tenant (ManyToOne)
```

**Rule:** If an entity belongs to a tenant directly, extend `TenantScopedEntity`. If it gets tenant scope through a parent (e.g., CourseSection via Course), extend `BaseEntity`.

---

## Entity Relationship Diagram

```
Tenant (1)
├──< User (*)                    tenantId
├──< Course (*)                  tenantId
├──< AcademicTerm (*)            tenantId
├──< DegreeProgram (*)           tenantId
├──< AiConversation (*)          tenantId
├──< Conversation (*)            tenantId
├──< Enrollment (*)              tenantId
├──< Assignment (*)              tenantId
├──< Submission (*)              tenantId
├──< Announcement (*)            tenantId
├──< TenantAiConfig (1)          tenantId
├──< LtiPlatform (*)             tenantId
└──< FeedEngagement (*)          tenantId

Course (1)
└──< CourseSection (*)           courseId

CourseSection (1)
├──< Enrollment (*)              sectionId
├──< Assignment (*)              sectionId
├──< Announcement (*)            sectionId
├──< CourseContent (*)           sectionId
└──  User (1) instructor         instructorId

Assignment (1)
└──< Submission (*)              assignmentId

User (1)
├──< Enrollment (*)              userId
├──< Submission (*)              userId
├──< AiConversation (*)          userId
├──< StudentDegreeProfile (*)    userId
├──< FeedEngagement (*)          userId
├──< LtiUser (*)                 userId
└──< ConversationParticipant (*) userId

AiConversation (1)
└──< AiMessage (*)               conversationId

Conversation (1)
├──< ConversationParticipant (*) conversationId
└──< DirectMessage (*)           conversationId
```

---

## Core Entities

### Tenant
**Table:** `tenants` | **Extends:** `BaseEntity`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK, auto | |
| name | varchar | unique | Institution name |
| domain | varchar | unique | e.g., `university.edu` |
| subdomain | varchar | unique | e.g., `university` |
| settings | JSONB | nullable | Tenant-wide configuration |
| subscriptionPlan | enum | default: FREE | FREE, BASIC, PROFESSIONAL, ENTERPRISE |
| billingStatus | enum | default: ACTIVE | ACTIVE, PAST_DUE, SUSPENDED, CANCELLED |

### User
**Table:** `users` | **Extends:** `TenantScopedEntity`
**Indexes:** `[tenantId]`, `[email, tenantId]` (unique composite)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| email | varchar | unique per tenant | |
| passwordHash | varchar | nullable | null for OAuth-only users |
| firstName | varchar | required | |
| lastName | varchar | required | |
| roles | enum[] | default: [STUDENT] | STUDENT, INSTRUCTOR, ADMIN, PARENT, TA |
| profile | JSONB | nullable | See JSONB contract below |
| preferences | JSONB | nullable | See JSONB contract below |
| status | enum | default: ACTIVE | ACTIVE, INACTIVE, SUSPENDED, PENDING |
| lastLoginAt | timestamp | nullable | |
| googleId | varchar | nullable | Google OAuth ID |

**User.profile JSONB contract:**
```json
{
  "avatar": "https://...",
  "bio": "string",
  "phone": "string",
  "department": "string",
  "studentId": "string"
}
```

**User.preferences JSONB contract:**
```json
{
  "theme": "light" | "dark" | "system",
  "emailNotifications": true,
  "feedWidgets": {
    "deadlines": { "visible": true, "collapsed": false },
    "grades": { "visible": true, "collapsed": false },
    "announcements": { "visible": true, "collapsed": false }
  }
}
```

### Course
**Table:** `courses` | **Extends:** `TenantScopedEntity`
**Indexes:** `[tenantId]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| code | varchar | required | e.g., `CS101` |
| title | varchar | required | |
| description | text | nullable | |
| credits | decimal(4,2) | nullable | |
| departmentId | varchar | nullable | |
| prerequisites | JSONB | nullable | See contract below |
| settings | JSONB | nullable | Course-level settings |

**Course.prerequisites JSONB contract:**
```json
{
  "required": ["course-uuid-1", "course-uuid-2"],
  "recommended": ["course-uuid-3"],
  "minGrade": "C"
}
```

### CourseSection
**Table:** `course_sections` | **Extends:** `BaseEntity` (gets tenant via Course)
**Indexes:** `[courseId]`, `[instructorId]`, `[termId]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| courseId | UUID | FK → courses | |
| termId | UUID | FK → academic_terms | |
| instructorId | UUID | FK → users | |
| schedule | JSONB | nullable | See contract below |
| location | varchar | nullable | |
| capacity | int | nullable | |
| status | enum | default: DRAFT | DRAFT, ACTIVE, COMPLETED, CANCELLED |

**CourseSection.schedule JSONB contract:**
```json
{
  "days": ["MON", "WED", "FRI"],
  "startTime": "09:00",
  "endTime": "10:15",
  "timezone": "America/New_York"
}
```

### Enrollment
**Table:** `enrollments` | **Extends:** `TenantScopedEntity`
**Indexes:** `[tenantId]`, `[userId]`, `[sectionId]`, `[userId, sectionId]` (unique), `[status]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| userId | UUID | FK → users | |
| sectionId | UUID | FK → course_sections | |
| role | enum | default: STUDENT | STUDENT, TA, OBSERVER |
| status | enum | default: ACTIVE | ACTIVE, COMPLETED, DROPPED, WITHDRAWN |
| enrolledAt | timestamp | required | |
| completedAt | timestamp | nullable | |
| finalGrade | varchar(2) | nullable | Letter grade (A, B+, etc.) |

### Assignment
**Table:** `assignments` | **Extends:** `TenantScopedEntity`
**Indexes:** `[tenantId]`, `[sectionId]`, `[dueAt]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| sectionId | UUID | FK → course_sections | |
| moduleId | varchar | nullable | Grouping identifier |
| title | varchar | required | |
| description | text | nullable | |
| type | enum | default: ASSIGNMENT | ASSIGNMENT, QUIZ, EXAM, DISCUSSION, PROJECT |
| pointsPossible | decimal(10,2) | required | |
| dueAt | timestamp | nullable | |
| unlockAt | timestamp | nullable | When assignment becomes visible |
| lockAt | timestamp | nullable | When submissions close |
| rubric | JSONB | nullable | See contract below |
| settings | JSONB | nullable | |

**Assignment.rubric JSONB contract:**
```json
{
  "criteria": [
    {
      "name": "Correctness",
      "points": 40,
      "description": "Solution produces correct output"
    },
    {
      "name": "Code Quality",
      "points": 30,
      "description": "Clean, readable, well-structured code"
    }
  ]
}
```

### Submission
**Table:** `submissions` | **Extends:** `TenantScopedEntity`
**Indexes:** `[tenantId]`, `[assignmentId]`, `[userId]`, `[assignmentId, userId]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| assignmentId | UUID | FK → assignments | |
| userId | UUID | FK → users | |
| attempt | int | default: 1 | |
| content | JSONB | nullable | Submission body (exposed as string via getter) |
| submittedAt | timestamp | nullable | |
| score | decimal(10,2) | nullable | |
| gradedAt | timestamp | nullable | |
| gradedBy | varchar | nullable | Grader user ID |
| feedback | text | nullable | |

### Announcement
**Table:** `announcements` | **Extends:** `TenantScopedEntity`
**Indexes:** `[tenantId]`, `[sectionId]`, `[createdAt]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| sectionId | UUID | FK → course_sections | |
| authorId | UUID | FK → users | |
| title | varchar | required | |
| body | text | required | |

### AcademicTerm
**Table:** `academic_terms` | **Extends:** `TenantScopedEntity`
**Indexes:** `[tenantId]`, `[tenantId, isCurrent]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| name | varchar | required | e.g., "Fall 2026" |
| startDate | date | required | |
| endDate | date | required | |
| isCurrent | boolean | default: false | Only one per tenant |

---

## AI Entities

### AiConversation
**Table:** `ai_conversations` | **Extends:** `TenantScopedEntity`
**Indexes:** `[tenantId]`, `[userId]`, `[status]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| userId | UUID | FK → users | |
| agentType | varchar | required | e.g., "study-coach" |
| title | varchar | nullable | Auto-generated from first message |
| status | varchar | default: "active" | active, closed |
| context | JSONB | nullable | Snapshot of student state at conversation start |

### AiMessage
**Table:** `ai_messages` | **Extends:** `BaseEntity`
**Indexes:** `[conversationId]`, `[createdAt]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| conversationId | UUID | FK → ai_conversations | |
| role | varchar | required | "user", "assistant", "tool_use", "tool_result" |
| content | text | required | |
| toolCalls | JSONB | nullable | Tool use details |
| tokenCount | int | nullable | |

### AiUsageLog
**Table:** `ai_usage_logs`
**Indexes:** `[tenantId]`, `[userId]`, `[createdAt]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| tenantId | UUID | required | |
| userId | UUID | required | |
| agentType | varchar | required | |
| inputTokens | int | required | |
| outputTokens | int | required | |
| estimatedCostUsd | decimal | required | |
| conversationId | UUID | nullable | |

### CustomAgent
**Table:** `custom_agents` | **Extends:** `TenantScopedEntity`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| name | varchar | required | |
| description | text | nullable | |
| systemPrompt | text | required | |
| tools | JSONB | required | Array of tool names |
| constraints | JSONB | nullable | Rate limits, role restrictions |
| createdBy | UUID | FK → users | |
| isActive | boolean | default: true | |

### TenantAiConfig
**Table:** `tenant_ai_configs` | **Extends:** `TenantScopedEntity`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| aiEnabled | boolean | default: true | Kill switch |
| dailyTokenBudget | int | nullable | Per-tenant daily limit |
| allowedModels | JSONB | nullable | Model whitelist |
| toolOverrides | JSONB | nullable | Per-tool action type overrides |
| rateLimits | JSONB | nullable | Custom rate limit config |

---

## Messaging Entities

### Conversation
**Table:** `conversations` | **Extends:** `TenantScopedEntity`
**Indexes:** `[tenantId]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| type | varchar | default: "direct" | direct, group |
| title | varchar | nullable | For group conversations |
| lastMessageAt | timestamp | nullable | For sort ordering |

### ConversationParticipant
**Table:** `conversation_participants`
**Indexes:** `[userId]`, `[conversationId]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| conversationId | UUID | FK → conversations | |
| userId | UUID | FK → users | |
| lastReadAt | timestamp | nullable | For unread badge calculation |

### DirectMessage
**Table:** `direct_messages`
**Indexes:** `[conversationId]`, `[createdAt]`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| conversationId | UUID | FK → conversations | |
| senderId | UUID | FK → users | |
| content | text | required | |

---

## LTI Entities

### LtiPlatform
**Table:** `lti_platforms` | **Extends:** `TenantScopedEntity`

| Column | Type | Notes |
|--------|------|-------|
| name | varchar | Platform display name |
| issuer | varchar | unique — LTI issuer URL |
| clientId | varchar | OAuth client ID |
| authEndpoint | varchar | Authorization URL |
| tokenEndpoint | varchar | Token URL |
| jwksEndpoint | varchar | JWKS URL |
| publicKey | text | Platform public key |
| privateKey | text | Axis private key |
| isActive | boolean | default: true |

### LtiDeployment, LtiContext, LtiState, LtiUser
Supporting entities for LTI 1.3 launch flow, context mapping, OIDC state management, and user identity linking.

---

## Planner Entities

### DegreeProgram
**Table:** `degree_programs` | **Extends:** `TenantScopedEntity`

| Column | Type | Notes |
|--------|------|-------|
| name | varchar | e.g., "B.S. Computer Science" |
| department | varchar | |
| totalCredits | int | Required credits for graduation |
| requirements | JSONB | Structured degree requirements |

### StudentDegreeProfile
**Table:** `student_degree_profiles` | **Extends:** `BaseEntity`

| Column | Type | Notes |
|--------|------|-------|
| userId | UUID | FK → users |
| degreeProgramId | UUID | FK → degree_programs |
| completedCourses | JSONB | Array of completed course IDs with grades |
| creditsEarned | decimal | |
| expectedGraduation | varchar | e.g., "Spring 2028" |

---

## Feed Entity

### FeedEngagement
**Table:** `feed_engagements` | **Extends:** `TenantScopedEntity`

| Column | Type | Notes |
|--------|------|-------|
| userId | UUID | FK → users |
| feedItemType | varchar | deadline, grade_posted, announcement, course_update |
| feedItemId | varchar | ID of the source entity |
| action | varchar | click, dismiss, expand |
| dwellTimeMs | int | nullable — time spent viewing |

---

## Office Hours Entities (FEAT-018/019)

### OfficeHourBlock
**Table:** `office_hour_blocks` | **Extends:** `TenantScopedEntity`

Recurring weekly availability defined by an instructor; students book slots inside it.

| Column | Type | Notes |
|--------|------|-------|
| instructorId | UUID | FK → users |
| dayOfWeek | enum | mon–fri (`office_hour_blocks_dayofweek_enum`) |
| startTime / endTime | time | "HH:MM" 24h window |
| slotMinutes | int | bookable slot length, default 15 |
| locationType | enum | in_person, zoom |
| location | varchar(128) | nullable — room for in_person (e.g. "ECS 618") |
| meetingUrl | varchar(512) | nullable — URL for zoom |
| active | boolean | soft on/off; paused blocks stop offering slots |

Create/update is **conflict-checked** (FEAT-019): overlaps with the instructor's own lecture times (section `meetingDays`/`startTime`/`endTime`) or their other active blocks are rejected with 409.

### Booking
**Table:** `bookings` | **Extends:** `TenantScopedEntity`

A dated appointment against a block. `instructorId` is denormalized from the block (hot read path). Uniqueness of the active slot is enforced by a pessimistic lock + re-check in `bookSlot()`, not a DB constraint (cancelled slots must be re-bookable).

| Column | Type | Notes |
|--------|------|-------|
| blockId | UUID | FK → office_hour_blocks |
| studentId / instructorId | UUID | FK → users |
| date | date | "YYYY-MM-DD" |
| startTime / endTime | time | slot boundaries |
| status | enum | booked, cancelled, completed, no_show |
| note | varchar(500) | nullable — student's topic |

### BusyBlock (FEAT-019)
**Table:** `busy_blocks` | **Extends:** `TenantScopedEntity`

Recurring weekly unavailability (research time, meetings). Suppresses any overlapping bookable slot in `computeAvailableSlots()` without editing the office-hour blocks themselves. Deliberately NOT conflict-checked — overlapping is its purpose. `dayOfWeek` reuses `office_hour_blocks_dayofweek_enum` (pinned via `enumName`).

| Column | Type | Notes |
|--------|------|-------|
| instructorId | UUID | FK → users |
| dayOfWeek | enum | mon–fri |
| startTime / endTime | time | unavailable window |
| label | varchar(128) | nullable — e.g. "Research", "Dept meeting" |

---

## Index Strategy

Every entity follows this indexing pattern:

1. **tenantId** — on every `TenantScopedEntity`
2. **Foreign keys in WHERE clauses** — userId, sectionId, assignmentId, conversationId
3. **Composite unique constraints** — `[email, tenantId]`, `[userId, sectionId]`
4. **Timestamp fields used for ordering** — dueAt, createdAt, lastMessageAt
5. **Status fields used for filtering** — status, isCurrent

---

## JSONB Schema Governance

JSONB columns provide flexibility but must have documented contracts. When adding or modifying a JSONB column:

**`users.profile` contract (FEAT-021):** `bio?: string`, `avatar?: string|null`, `gradeLevel?: number`, and the instructor directory fields `title?: string` (e.g. "Associate Professor") and `officeLocation?: string` (building + room, directory format "ECS 618"). `title`/`officeLocation` are exposed as typed GraphQL fields via `@ResolveField` on `UsersResolver` and written via dedicated `updateProfile` inputs that merge into the blob — never read or replace the raw `profile` string from clients.

1. Document the expected shape in this file
2. Validate input at the service layer (not just DTOs)
3. Use TypeScript interfaces for the JSONB shape in the entity file
4. Never assume a JSONB field has a particular structure without null-checking

---

*Last updated: 2026-02-17*
*Companion docs: [ARCHITECTURE.md](./ARCHITECTURE.md) | [CONVENTIONS.md](./CONVENTIONS.md) | [SECURITY.md](./SECURITY.md)*
