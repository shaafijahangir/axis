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

// ─── Shared ────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
      {children}
    </p>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
      <CheckCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
        aria-hidden="true"
      />
      {children}
    </li>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function FeaturesHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background py-20 md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -top-16 -right-32 h-[400px] w-[400px] rounded-full bg-violet-100/40 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-6 text-center space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Every feature designed around one question
        </span>

        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Does this{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            serve students?
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
          NexusEd isn&apos;t a better filing cabinet. It&apos;s a platform built
          from first principles — starting with what students actually need,
          then working backward to what admins and instructors need to deliver
          it.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors"
          >
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-7 py-3.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            Why we built this
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  body,
  bullets,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-sm hover:border-primary/30 hover:shadow-md transition-all space-y-5">
      <div className="flex items-start gap-4">
        <div
          className={`inline-flex shrink-0 rounded-xl p-2.5 ${iconBg} ${iconColor}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {body}
          </p>
        </div>
      </div>
      <ul className="space-y-2 pl-14">
        {bullets.map((b) => (
          <Bullet key={b}>{b}</Bullet>
        ))}
      </ul>
    </div>
  );
}

// ─── For Students ─────────────────────────────────────────────────────────────

const STUDENT_FEATURES = [
  {
    icon: Sparkles,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    title: 'AI-Prioritized Home Feed',
    body: "Students don't see a folder on login — they see what matters right now. Deadlines within 48 hours, unread feedback, upcoming lessons, and urgent announcements — ranked by AI.",
    bullets: [
      'Deadline-aware ranking (due in 4 hours > announcement from this morning)',
      'Surfaces unread instructor feedback before it gets buried',
      'Distinguishes urgent from non-urgent announcements',
      'Zero configuration required — works from day one',
    ],
  },
  {
    icon: Map,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Graduation Roadmap',
    body: 'A semester-by-semester graduation plan that respects prerequisites, course availability, credit load limits, financial aid GPA thresholds, and annual credit caps.',
    bullets: [
      'Prerequisite-aware semester planning',
      'Financial projections per semester (tuition, aid, net cost)',
      'Financial aid awareness (GPA floor, credit minimums)',
      'Major-change simulation — see the impact before you switch',
    ],
  },
  {
    icon: Brain,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    title: 'Study Coach',
    body: "A Socratic AI tutor that guides students toward understanding rather than giving answers. It knows which course they're in, which content they're studying, and their learning objectives.",
    bullets: [
      'Socratic method — guides, never just gives the answer',
      'Full academic context: courses, assignments, grades',
      'Per-session conversation history',
      'Governed per institution (auto / suggest / blocked)',
    ],
  },
  {
    icon: BookOpen,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'Course Timeline',
    body: 'Inside a course, content, assignments, and discussions are a single chronological stream — not three separate tabs. Each piece of content connects naturally to the work it generates.',
    bullets: [
      'Content and assignments appear together in sequence',
      'Discussions threaded to the relevant content item',
      'Clear visual progress through the semester',
      'No more "where is the assignment for this lecture?"',
    ],
  },
  {
    icon: MessageSquare,
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    title: 'Discussion Threads',
    body: 'Threaded discussions with @mentions, instructor-answer badges, and real-time notifications — integrated into the course timeline.',
    bullets: [
      'Nested reply threads',
      'Instructor-answer badge highlights authoritative responses',
      '@mention notifications',
      'Rich text with formatting support',
    ],
  },
  {
    icon: Bell,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    title: 'Smart Notifications',
    body: 'Push notifications and an in-app notification centre that surfaces only what matters — grades, due dates, instructor replies, and announcements.',
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
    <section className="border-b border-border bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 space-y-12">
        <div>
          <SectionLabel>For Students</SectionLabel>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A platform that knows what you need before you ask.
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
            Canvas shows you folders. NexusEd answers the question every student
            actually has: what do I need to do right now, and am I on track to
            graduate?
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {STUDENT_FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
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
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    title: 'AI Catalog Import',
    body: "Upload a PDF academic calendar or course catalog. NexusEd's AI extraction pipeline finds courses, prerequisites, and degree requirements — flagging anything it's uncertain about for human review.",
    bullets: [
      'PDF → structured course data in minutes',
      'Natural language prerequisite parsing',
      'Degree requirement group extraction',
      'Low-confidence items flagged for admin review',
      'All-or-nothing transaction — no partial imports',
    ],
  },
  {
    icon: FileText,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'AI-Assisted Course Creation',
    body: 'Upload a syllabus and NexusEd generates a course structure — weeks, content items, assignment suggestions — ready for instructor review and adjustment.',
    bullets: [
      'Syllabus → course outline in seconds',
      'Suggested assignment types and due dates',
      'Editable before publishing',
      'Respects course section dates and term boundaries',
    ],
  },
  {
    icon: Bot,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    title: 'AI Agent Builder',
    body: 'Instructors create custom AI agents with specific system prompts, tool access, and governance rules. Deploy a course-specific tutor, writing coach, or math assistant — without any code.',
    bullets: [
      'Custom system prompts and personas',
      'Granular tool access per agent',
      'Per-agent daily token budgets',
      'Feedback Copilot: draft rubric-aligned feedback in seconds',
    ],
  },
  {
    icon: Clock,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'Gradebook & Submissions',
    body: 'Inline assignment review with a rich text editor for feedback. Rubric-based grading. Auto-scored multiple choice and true/false. Manual review queue for short-answer and essay.',
    bullets: [
      'Per-submission inline feedback editor',
      'Rubric-aligned grading workflow',
      'Auto-score MCQ and true/false on submission',
      'Grade distribution view per assignment',
    ],
  },
];

function ForInstructors() {
  return (
    <section className="border-b border-border bg-muted py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 space-y-12">
        <div>
          <SectionLabel>For Instructors</SectionLabel>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Spend your time teaching, not wrestling with the platform.
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
            AI handles the setup work — content structure, catalog import,
            first-draft feedback. Instructors focus on what they&apos;re
            actually good at.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {INSTRUCTOR_FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
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
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    title: 'Analytics Dashboard',
    body: 'Grade distributions, submission rates, at-risk student alerts, and AI usage cost tracking — all tenant-scoped and real-time.',
    bullets: [
      'Grade distributions per course and section',
      'Submission rates and completion tracking',
      'AI token usage and estimated USD cost per agent',
      'At-risk student indicators (average score < 60%)',
    ],
  },
  {
    icon: Shield,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: 'AI Governance Console',
    body: 'Every AI action runs through a three-tier governance check before execution. Admins define which tools auto-execute, which require approval, and which are blocked.',
    bullets: [
      'Per-action rules: auto / suggest / blocked',
      'Daily token budgets per tenant and per agent',
      'Rate limiting (requests per minute per user)',
      'Immutable audit log of every AI tool invocation',
    ],
  },
  {
    icon: Users,
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    title: 'People Management',
    body: 'Manage users, roles, and course assignments across the institution. Bulk enrollment tools, role assignment, and a searchable directory.',
    bullets: [
      'Multi-role users (STUDENT, INSTRUCTOR, ADMIN, TA)',
      'Course section assignment',
      'Enrollment management with status tracking',
      'Bulk CSV enrollment import',
    ],
  },
  {
    icon: DollarSign,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    title: 'Financial Aid Configuration',
    body: 'Define financial aid rules for your institution — minimum GPA, minimum credits, SAP thresholds. These flow directly into graduation plan calculations.',
    bullets: [
      'Minimum GPA for aid eligibility',
      'Minimum credit load for full-time status',
      'SAP thresholds for academic standing',
      'Per-term aid configuration',
    ],
  },
  {
    icon: Zap,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    title: 'Integrations',
    body: 'Connect NexusEd to your existing infrastructure. LTI 1.3, Cloudflare R2 for file storage, Resend for transactional email.',
    bullets: [
      'LTI 1.3 compliant (Canvas, Brightspace, Moodle)',
      'Cloudflare R2 file storage',
      'Transactional email via Resend',
      'VAPID web push notifications',
    ],
  },
  {
    icon: GraduationCap,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Multi-Tenant Architecture',
    body: 'Every institution gets a fully isolated tenant. Data never crosses tenant boundaries. FERPA-aware data handling throughout.',
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
    <section className="border-b border-border bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 space-y-12">
        <div>
          <SectionLabel>For Administrators</SectionLabel>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Institutional oversight without micromanagement tools.
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
            Visibility and control — AI governance, analytics, people
            management, and configuration — without burying you in config
            screens.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-background p-6 shadow-sm hover:border-primary/30 hover:shadow-md transition-all space-y-4"
            >
              <div
                className={`inline-flex rounded-xl p-2.5 ${f.iconBg} ${f.iconColor}`}
              >
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {f.body}
                </p>
              </div>
              <ul className="space-y-2">
                {f.bullets.map((b) => (
                  <Bullet key={b}>{b}</Bullet>
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

function Yes() {
  return (
    <CheckCircle
      className="mx-auto h-4 w-4 text-emerald-500"
      aria-label="Yes"
    />
  );
}
function No() {
  return (
    <span
      className="text-muted-foreground/40 text-lg leading-none"
      aria-label="No"
    >
      —
    </span>
  );
}

function ComparisonTable() {
  return (
    <section className="border-b border-border bg-muted py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6 space-y-10">
        <div>
          <SectionLabel>Comparison</SectionLabel>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            What NexusEd does that Canvas and Brightspace don&apos;t.
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            The comparison isn&apos;t about parity — it&apos;s about what
            category of problem each platform is solving.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-5 py-4 text-left font-semibold text-foreground">
                  Capability
                </th>
                <th className="px-5 py-4 text-center font-semibold text-primary">
                  NexusEd
                </th>
                <th className="px-5 py-4 text-center font-semibold text-muted-foreground">
                  Canvas
                </th>
                <th className="px-5 py-4 text-center font-semibold text-muted-foreground">
                  Brightspace
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARISON.map((row) => (
                <tr
                  key={row.capability}
                  className="bg-background hover:bg-muted transition-colors"
                >
                  <td className="px-5 py-3.5 text-muted-foreground">
                    {row.capability}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {row.nexused ? <Yes /> : <No />}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {row.canvas ? <Yes /> : <No />}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {row.brightspace ? <Yes /> : <No />}
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
    <section className="relative overflow-hidden bg-primary py-20 md:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl px-6 text-center space-y-8">
        <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
          Ready to see it in action?
        </h2>
        <p className="text-lg text-primary-foreground/80 leading-relaxed">
          Get NexusEd running in hours. No vendor lock-in. No six-figure
          implementation fees.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-background px-8 py-3.5 text-sm font-semibold text-primary shadow-lg hover:opacity-95 transition-opacity"
          >
            Start for free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/30 px-8 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
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
