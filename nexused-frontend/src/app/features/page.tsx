import Link from 'next/link';
import {
  Sparkles,
  BookOpen,
  BarChart3,
  Shield,
  Users,
  Brain,
  Map,
  Upload,
  CheckCircle,
  ArrowRight,
  GraduationCap,
  MessageSquare,
  Clock,
  Zap,
  Bot,
  DollarSign,
  Bell,
  FileText,
} from 'lucide-react';
import { MarketingNav } from '@/components/marketing/marketing-nav';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

// ─── Hero ─────────────────────────────────────────────────────────────────────

function FeaturesHero() {
  return (
    <section className="border-b bg-gradient-to-b from-background to-muted/30 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6 text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Every feature designed around one question
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl max-w-3xl mx-auto">
          Does this serve students?
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          NexusEd isn&apos;t a better filing cabinet. It&apos;s a platform built
          from first principles — starting with what students actually need,
          then working backward to what admins and instructors need to deliver
          it.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-md border px-6 py-3 text-sm font-semibold hover:bg-muted transition-colors"
          >
            Why we built this
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Section header helper ─────────────────────────────────────────────────────

function SectionHeader({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm font-semibold text-primary uppercase tracking-widest">
        {label}
      </p>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

// ─── For Students ─────────────────────────────────────────────────────────────

const STUDENT_FEATURES = [
  {
    icon: Sparkles,
    color: 'text-purple-500',
    title: 'AI-Prioritized Home Feed',
    body: "Students don't see a folder on login — they see what matters right now. Deadlines within 48 hours, unread instructor feedback, next lessons, and urgent announcements — ranked by an AI that understands their academic position. Not 30 notifications. Three to five prioritized items.",
    bullets: [
      'Deadline-aware ranking (due in 4 hours > announcement from this morning)',
      'Surfaces unread feedback before it gets buried',
      'Distinguishes urgent from non-urgent announcements',
      'Zero configuration required',
    ],
  },
  {
    icon: Map,
    color: 'text-blue-500',
    title: 'Graduation Roadmap',
    body: "A semester-by-semester graduation plan that respects every constraint a student faces — prerequisites, course availability, credit load limits, financial aid GPA thresholds, and annual credit caps. Built to replace the advisor who doesn't reply.",
    bullets: [
      'Prerequisite-aware semester planning',
      'Financial projections per semester (tuition, aid, net cost)',
      'Financial aid awareness (GPA floor, credit minimums)',
      'Drag-and-drop course rescheduling',
    ],
  },
  {
    icon: Brain,
    color: 'text-emerald-500',
    title: 'Study Coach',
    body: "A Socratic AI tutor that guides students toward understanding rather than giving answers. It knows which course the student is in, which content they're studying, and what their learning objectives are — context the student doesn't have to repeat.",
    bullets: [
      'Socratic method — guides, never just answers',
      'Full academic context: courses, assignments, grades',
      'Per-session conversation history',
      'Governance controls for institutions',
    ],
  },
  {
    icon: BookOpen,
    color: 'text-amber-500',
    title: 'Course Timeline',
    body: 'Inside a course, content, assignments, and discussions are not three separate tabs. They are a single chronological stream where each piece of content connects naturally to the work it generates and the conversation around it.',
    bullets: [
      'Content and assignment appear together in sequence',
      'Discussions threaded to the relevant content item',
      'Clear visual progress through the semester',
      'No more "where is the assignment for this lecture?"',
    ],
  },
  {
    icon: MessageSquare,
    color: 'text-cyan-500',
    title: 'Discussion Threads',
    body: 'Threaded discussions with @mentions, instructor-answer badges, and real-time notifications — integrated into the course timeline, not an afterthought in a separate tab.',
    bullets: [
      'Nested reply threads',
      'Instructor-answer badge highlights authoritative responses',
      '@mention notifications',
      'Rich text with code blocks and math',
    ],
  },
  {
    icon: Bell,
    color: 'text-rose-500',
    title: 'Smart Notifications',
    body: 'Push notifications and an in-app notification centre that surfaces only what matters. Assignments due, grades posted, instructor replies, and new announcements — delivered in real time.',
    bullets: [
      'Browser push notifications (opt-in)',
      'In-app notification centre with unread count',
      'Email notifications via Resend',
      'Per-category notification preferences',
    ],
  },
];

function ForStudents() {
  return (
    <section className="py-20 md:py-28 border-b">
      <div className="mx-auto max-w-7xl px-6 space-y-12">
        <SectionHeader
          label="For Students"
          title="A platform that knows what you need before you ask."
          body="Canvas shows you folders. NexusEd answers the question every student actually has: what do I need to do right now, and am I on track to graduate?"
        />

        <div className="grid gap-8 lg:grid-cols-2">
          {STUDENT_FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-6 space-y-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`inline-flex rounded-lg p-2.5 bg-muted ${f.color} shrink-0`}
                >
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.body}
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 pl-14">
                {f.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <CheckCircle
                      className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── For Instructors ──────────────────────────────────────────────────────────

const INSTRUCTOR_FEATURES = [
  {
    icon: Upload,
    color: 'text-rose-500',
    title: 'AI Catalog Import',
    body: "Upload a PDF academic calendar or course catalog. NexusEd's AI extraction pipeline finds courses, prerequisites, and degree requirements — flagging anything it's uncertain about for human review. An institution goes from zero to a fully structured catalog in minutes.",
    bullets: [
      'PDF → structured course data in minutes',
      'Natural language prerequisite parsing',
      'Degree requirement group extraction',
      'Low-confidence flagging for admin review',
      'All-or-nothing transaction — no partial imports',
    ],
  },
  {
    icon: FileText,
    color: 'text-indigo-500',
    title: 'AI-Assisted Course Creation',
    body: 'Upload a syllabus and NexusEd generates a course structure — weeks, content items, assignment suggestions — ready for instructor review and adjustment. Not a blank page.',
    bullets: [
      'Syllabus → course outline in seconds',
      'Suggested assignment types and due dates',
      'Editable before publishing',
      'Respects course section dates and term boundaries',
    ],
  },
  {
    icon: Bot,
    color: 'text-violet-500',
    title: 'AI Agent Builder',
    body: 'Instructors can create custom AI agents with specific system prompts, tool access, and governance rules. Deploy a course-specific tutor, a writing coach, or a math assistant — without writing any code.',
    bullets: [
      'Custom system prompts and personas',
      'Granular tool access per agent',
      'Per-agent daily token budgets',
      'Feedback Copilot: draft rubric-aligned feedback in seconds',
    ],
  },
  {
    icon: Clock,
    color: 'text-amber-500',
    title: 'Gradebook & Submissions',
    body: 'Inline assignment review with a rich text editor for feedback. Rubric-based grading. Auto-scored multiple choice and true/false. Manual review queue for short-answer and essay.',
    bullets: [
      'Per-submission inline feedback editor',
      'Rubric-aligned grading',
      'Auto-score MCQ and true/false on submission',
      'Grade distribution view per assignment',
    ],
  },
];

function ForInstructors() {
  return (
    <section className="py-20 md:py-28 bg-muted/30 border-b">
      <div className="mx-auto max-w-7xl px-6 space-y-12">
        <SectionHeader
          label="For Instructors"
          title="Spend your time teaching, not wrestling with the platform."
          body="AI handles the setup work — content structure, catalog import, first-draft feedback. Instructors focus on what they're actually good at."
        />

        <div className="grid gap-8 lg:grid-cols-2">
          {INSTRUCTOR_FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-6 space-y-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`inline-flex rounded-lg p-2.5 bg-muted ${f.color} shrink-0`}
                >
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {f.body}
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 pl-14">
                {f.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <CheckCircle
                      className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── For Admins ───────────────────────────────────────────────────────────────

const ADMIN_FEATURES = [
  {
    icon: BarChart3,
    color: 'text-orange-500',
    title: 'Analytics Dashboard',
    body: 'Grade distributions, submission rates, at-risk student alerts, and AI usage cost tracking — all tenant-scoped and real-time. Know what is happening across the institution without micromanaging.',
    bullets: [
      'Grade distributions per course and section',
      'Submission rates and completion tracking',
      'AI token usage and estimated USD cost per agent',
      'At-risk student indicators',
    ],
  },
  {
    icon: Shield,
    color: 'text-indigo-500',
    title: 'AI Governance Console',
    body: 'Every AI action runs through a three-tier governance check before execution. Admins define which tools auto-execute, which require instructor approval, and which are blocked entirely. Full audit log of every AI interaction.',
    bullets: [
      'Per-action rules: auto / suggest / blocked',
      'Daily token budgets per tenant and per agent',
      'Rate limiting (requests per minute per user)',
      'Immutable audit log of every AI tool invocation',
    ],
  },
  {
    icon: Users,
    color: 'text-cyan-500',
    title: 'People Management',
    body: 'Manage users, roles, and course assignments across the institution. Bulk enrollment tools, role assignment, and a searchable directory.',
    bullets: [
      'Multi-role users (STUDENT, INSTRUCTOR, ADMIN, TA)',
      'Course section assignment',
      'Enrollment management with status tracking',
      'User search and filtering',
    ],
  },
  {
    icon: DollarSign,
    color: 'text-emerald-500',
    title: 'Financial Aid Configuration',
    body: 'Define the financial aid rules for your institution — minimum GPA, minimum credits, Satisfactory Academic Progress thresholds. These constraints flow directly into graduation plan calculations.',
    bullets: [
      'Minimum GPA for aid eligibility',
      'Minimum credit load for full-time status',
      'SAP thresholds for academic standing',
      'Per-term aid configuration',
    ],
  },
  {
    icon: Zap,
    color: 'text-yellow-500',
    title: 'Integrations',
    body: 'Connect NexusEd to your existing infrastructure. LTI 1.3 for tool interoperability, Cloudflare R2 for file storage, Resend for transactional email, and webhook support for custom workflows.',
    bullets: [
      'LTI 1.3 compliant',
      'Cloudflare R2 file storage',
      'Transactional email via Resend',
      'Webhook support for external systems',
    ],
  },
  {
    icon: GraduationCap,
    color: 'text-blue-500',
    title: 'Multi-Tenant Architecture',
    body: 'Every institution gets a fully isolated tenant. Data never crosses tenant boundaries. Subdomain routing, per-tenant configuration, and FERPA-aware data handling throughout.',
    bullets: [
      'Complete data isolation per tenant',
      'Subdomain-based routing',
      'Per-tenant AI governance settings',
      'FERPA-aware data model',
    ],
  },
];

function ForAdmins() {
  return (
    <section className="py-20 md:py-28 border-b">
      <div className="mx-auto max-w-7xl px-6 space-y-12">
        <SectionHeader
          label="For Administrators"
          title="Institutional oversight without micromanagement tools."
          body="The admin console gives you visibility and control — AI governance, analytics, people management, and configuration — without burying you in configuration screens."
        />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-5 space-y-4"
            >
              <div
                className={`inline-flex rounded-lg p-2.5 bg-muted ${f.color}`}
              >
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.body}
                </p>
              </div>
              <ul className="space-y-1.5">
                {f.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <CheckCircle
                      className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Comparison table ─────────────────────────────────────────────────────────

const COMPARISON = [
  {
    capability: 'AI-prioritized home feed',
    nexused: true,
    canvas: false,
    brightspace: false,
  },
  {
    capability: 'Graduation roadmap with prerequisites',
    nexused: true,
    canvas: false,
    brightspace: false,
  },
  {
    capability: 'AI study coach (per-student context)',
    nexused: true,
    canvas: false,
    brightspace: false,
  },
  {
    capability: 'AI catalog import from PDF',
    nexused: true,
    canvas: false,
    brightspace: false,
  },
  {
    capability: 'AI governance controls',
    nexused: true,
    canvas: false,
    brightspace: false,
  },
  {
    capability: 'Financial projections in graduation plan',
    nexused: true,
    canvas: false,
    brightspace: false,
  },
  {
    capability: 'Course timeline (content + assignments + discussions)',
    nexused: true,
    canvas: false,
    brightspace: false,
  },
  {
    capability: 'Multi-tenant SaaS, self-hostable',
    nexused: true,
    canvas: true,
    brightspace: true,
  },
  {
    capability: 'LTI 1.3 integration',
    nexused: true,
    canvas: true,
    brightspace: true,
  },
  {
    capability: 'FERPA compliance',
    nexused: true,
    canvas: true,
    brightspace: true,
  },
];

function ComparisonTable() {
  return (
    <section className="py-20 md:py-28 bg-muted/30 border-b">
      <div className="mx-auto max-w-5xl px-6 space-y-10">
        <SectionHeader
          label="Comparison"
          title="What NexusEd does that Canvas and Brightspace don't."
          body="The comparison isn't about parity — it's about what category of problem each platform is solving."
        />

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left font-semibold">
                  Capability
                </th>
                <th className="py-3 px-4 text-center font-semibold text-primary">
                  NexusEd
                </th>
                <th className="py-3 px-4 text-center font-semibold text-muted-foreground">
                  Canvas
                </th>
                <th className="py-3 px-4 text-center font-semibold text-muted-foreground">
                  Brightspace
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, i) => (
                <tr
                  key={row.capability}
                  className={i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}
                >
                  <td className="py-3 px-4 text-muted-foreground">
                    {row.capability}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.nexused ? (
                      <CheckCircle
                        className="h-4 w-4 text-emerald-500 mx-auto"
                        aria-label="Yes"
                      />
                    ) : (
                      <span className="text-muted-foreground" aria-label="No">
                        —
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.canvas ? (
                      <CheckCircle
                        className="h-4 w-4 text-emerald-500 mx-auto"
                        aria-label="Yes"
                      />
                    ) : (
                      <span className="text-muted-foreground" aria-label="No">
                        —
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.brightspace ? (
                      <CheckCircle
                        className="h-4 w-4 text-emerald-500 mx-auto"
                        aria-label="Yes"
                      />
                    ) : (
                      <span className="text-muted-foreground" aria-label="No">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function FeaturesCTA() {
  return (
    <section className="py-20 md:py-28 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl px-6 text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to see it in action?
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Get NexusEd running in hours. No vendor lock-in. No six-figure
            implementation fees.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-md bg-primary-foreground px-8 py-3.5 text-sm font-semibold text-primary hover:opacity-90 transition-opacity"
          >
            Start for free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/30 px-8 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
          >
            Read the story
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>
        <FeaturesHero />
        <ForStudents />
        <ForInstructors />
        <ForAdmins />
        <ComparisonTable />
        <FeaturesCTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
