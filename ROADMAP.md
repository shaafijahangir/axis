# NexusEd Development Roadmap

> **Guiding filter:** Does this feature boost growth or eliminate noise? If not, it doesn't belong.

---

## What's Done (Phase 0: Foundation)

The scaffolding is in place. Both frontend and backend are wired up, authentication works, the database schema covers core entities, and the multi-tenant architecture is solid.

- [x] Next.js 15 + NestJS project scaffolding
- [x] Authentication system (JWT + bcrypt + Google OAuth)
- [x] Multi-tenant foundation (schema-per-tenant, PostgreSQL RLS)
- [x] Core database entities: Tenants, Users, Academic Terms, Courses, Course Sections, Enrollments, Assignments, Submissions
- [x] GraphQL API with Apollo Server
- [x] Tenant CRUD operations
- [x] Login and registration pages
- [x] Base UI components (shadcn/ui)

---

## Phase 1: The Feed and Navigation ✓

**Goal:** Build the skeleton that every future feature plugs into. The home feed, the navigation architecture, and the course timeline view. This phase defines what NexusEd *feels* like.

### Navigation Shell
- [x] Role-based layout system (student, instructor, admin, parent get different shells)
- [x] Student nav: Home, Courses, Messages + Profile avatar
- [x] Instructor nav: Home, Courses, Messages + Profile avatar
- [x] Admin nav: Home, People, Academics + Settings gear
- [x] Parent nav: Home, Messages + Profile avatar
- [x] Mobile-responsive navigation (bottom bar on mobile, sidebar on desktop)

### Home Feed (Student)
- [x] Feed component architecture
- [x] Static feed with hardcoded priority items (deadlines, grades, announcements)
- [x] Feed card types: deadline, grade posted, announcement, course update
- [x] Empty state and loading states
- [x] Relative time displays ("due in 4 hours", "graded yesterday")

### Home Feed (Instructor)
- [x] Submissions-to-grade queue
- [x] Upcoming deadline reminders for courses you teach
- [ ] Student flag alerts (placeholder for Phase 3 AI)

### Course Timeline View
- [x] Unified course view: content + assignments + discussions in one chronological stream
- [x] Course header with key info (instructor, schedule, progress)
- [x] Timeline entry types: lesson, assignment, discussion, announcement
- [x] Assignment detail view with submission

---

## Phase 2: Core Academic Features

**Goal:** The platform works end-to-end for a real course. An instructor can create content and assignments. A student can view, submit, and get graded.

### Course Management (Instructor)
- [ ] Course content builder (rich text + file uploads)
- [x] Assignment creation with due dates, rubrics, point values
- [x] Assignment types: standard, quiz, discussion, project
- [x] Course roster view
- [ ] Bulk operations (extend deadline, send announcement to section)

### Student Experience
- [x] Assignment submission (file upload, text entry)
- [x] Submission confirmation and status tracking
- [ ] Grades view within course timeline
- [ ] Overall grades summary (accessible from profile)

### Gradebook (Instructor)
- [ ] Gradebook as a view *inside* a course, not a standalone section
- [x] Inline grading with rubric support
- [ ] Grade statistics (mean, median, distribution)
- [ ] Export grades (CSV)

### Messaging
- [ ] Direct messaging between users within a tenant
- [ ] Conversation threads
- [ ] Unread indicators in nav
- [ ] Role-appropriate contacts (students see instructors/TAs for their courses)

### Admin Panel
- [ ] User management: create, edit, deactivate, assign roles
- [ ] Academic term management
- [ ] Course catalog management
- [ ] Section creation and instructor assignment
- [ ] Enrollment management (manual and bulk import)

---

## Phase 3: AI Intelligence Layer

**Goal:** The platform gets smart. The feed becomes AI-prioritized. Instructors get AI-assisted tooling. Students get a study coach and course planner.

> **Critical:** This phase was originally Phase 3 but the AI prioritization engine should influence the feed from Phase 1 onward, even if it starts simple (rule-based before ML-based).

### Invisible AI (Priority Engine)
- [ ] Feed ranking algorithm: score items by urgency, relevance, and student behavior
- [ ] Smart deadline awareness (haven't started + due soon = high priority)
- [ ] Grade change detection (new grade posted = surface immediately)
- [ ] Announcement relevance scoring (course-specific > institution-wide)
- [ ] Gradual migration from rule-based to ML-based ranking

### AI Course Planner
- [ ] Student degree profile: major, completed courses, credits earned
- [ ] Prerequisite chain analysis
- [ ] "What should I take next semester?" recommendations
- [ ] "How many credits until graduation?" calculator
- [ ] "What if I change my major?" scenario modeling
- [ ] Integration with institution's course catalog and scheduling

### AI Study Coach
- [ ] Socratic tutoring: asks questions instead of giving answers
- [ ] Scoped to enrolled course content only
- [ ] Context-aware: knows what the student is currently working on
- [ ] Rate-limited: 50 interactions/day per student
- [ ] Escalation: flags when a student seems significantly stuck

### AI for Instructors
- [ ] Syllabus-to-course-structure generator (upload PDF, get course skeleton)
- [ ] Quiz auto-generation from course materials
- [ ] Feedback copilot: suggested rubric comments based on submission content
- [ ] At-risk student detection: predictive alerts based on engagement patterns

### AI Guardrails
- [ ] Socratic method enforcement (never gives direct homework answers)
- [ ] PII stripping before external API calls
- [ ] Scope limitation to enrolled courses
- [ ] Human review flags for edge-case interactions
- [ ] Audit logging for all AI interactions

---

## Phase 4: Polish and Scale

**Goal:** Production-ready. Performance, accessibility, integrations, and the features that make institutions want to adopt NexusEd.

### Performance & Quality
- [ ] Comprehensive test suite (unit, integration, e2e)
- [ ] Performance optimization (lazy loading, caching, pagination)
- [ ] Accessibility audit and WCAG 2.1 AA compliance
- [ ] Error handling and graceful degradation
- [ ] Offline-capable PWA for mobile

### Integrations
- [ ] LTI 1.3 for tool interoperability
- [ ] SAML 2.0 / institutional SSO
- [ ] Calendar export (iCal)
- [ ] Payment processing (Stripe) for tenant billing

### Analytics & Reporting
- [ ] Student engagement analytics (for instructors)
- [ ] Institution-wide reporting (for admins)
- [ ] Course effectiveness metrics
- [ ] AI usage and impact dashboards

### Parent Experience
- [ ] Child progress dashboard
- [ ] Grade notifications
- [ ] Communication channel with instructors
- [ ] Attendance visibility

---

## Decisions That Are Locked

These architectural and design decisions are final and should not be revisited:

| Decision | Rationale |
|---|---|
| Feed-first UX | The home feed is the product. Not a dashboard, not a file browser. |
| 3 nav items per role (max 4 for admin) | If we need more, the information architecture is wrong. |
| Unified course timeline | Content + assignments + discussions in one stream. No separate tabs. |
| TA is a scoped instructor, not a separate role | Reduces complexity. Permission scope, not role proliferation. |
| AI is infrastructure | The priority engine runs the feed. AI isn't a sidebar feature. |
| Multi-tenant with RLS | Schema-per-tenant + PostgreSQL Row-Level Security. Proven pattern. |
| Mobile-first | Every feature is designed for phones first, desktop second. |
| No standalone notification center | The feed *is* the notification center. Bell icon for quick glance only. |
| No standalone announcements page | Announcements are feed items and course timeline entries. |
| No standalone discussions section | Discussions live inside the course timeline. |

---

## Open Questions

Things we haven't decided yet and need to resolve:

1. **Should the course view support both timeline and module views?** Timeline is the default, but some instructors may want to organize by topic/module. Do we support both or commit fully to timeline?

2. **How does the parent role link to student accounts?** Invitation system? Verification? What prevents someone from claiming to be a parent?

3. **What's the content format?** Rich text editor? Markdown? Block-based editor (like Notion)? This affects the entire content creation and viewing experience.

4. **Tenant onboarding flow.** How does an institution get set up? Self-serve? Manual? What's the minimum configuration needed?

5. **AI model strategy.** Claude primary, OpenAI fallback — but do we need a local model option for institutions with strict data residency requirements?

---

*Last updated: January 2026*
*This is a living document. Updated as decisions are made and priorities shift.*
