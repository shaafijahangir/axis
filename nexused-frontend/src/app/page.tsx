import Link from 'next/link';
import {
  Sparkles,
  BookOpen,
  MessageSquare,
  BarChart3,
  Shield,
  Users,
  Brain,
  Map,
  Upload,
  CheckCircle,
  ArrowRight,
  GraduationCap,
  Bot,
  Zap,
} from 'lucide-react';
import { MarketingNav } from '@/components/marketing/marketing-nav';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function Check({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <CheckCircle
        className="h-4 w-4 shrink-0 text-emerald-500"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden bg-background pt-16 pb-20 md:pt-20 md:pb-28 lg:pt-24 lg:pb-32">
      {/* Gradient blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -top-16 -right-32 h-[500px] w-[500px] rounded-full bg-violet-100/50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI-Native Learning Management System
          </span>
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-center text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          The LMS that{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            actually puts students first.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground">
          NexusEd replaces filing-cabinet LMSes with an AI-first platform that
          answers the question every student actually has:{' '}
          <strong className="font-semibold text-foreground">
            what do I need to do next?
          </strong>
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
          >
            Start for free
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-8 py-3.5 text-sm font-semibold text-foreground shadow-sm hover:bg-muted transition-colors"
          >
            Read the story
          </Link>
        </div>

        {/* Trust items */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <Check>No credit card required</Check>
          <Check>Multi-tenant from day one</Check>
          <Check>FERPA-aware architecture</Check>
        </div>

        {/* Product mockup */}
        <div className="relative mt-16 mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-2xl ring-1 ring-foreground/5">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
              <div className="flex gap-1.5 shrink-0">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 mx-3 h-6 rounded-md border border-border bg-background px-3 flex items-center">
                <span className="text-[11px] text-muted-foreground">
                  nexused.app/dashboard
                </span>
              </div>
            </div>

            {/* App layout: sidebar + main */}
            <div className="flex min-h-[280px] sm:min-h-[340px]">
              {/* Sidebar */}
              <div className="w-12 shrink-0 border-r border-border bg-muted p-2 sm:w-44 sm:p-3 space-y-1">
                <div className="mb-4 flex items-center gap-2 px-1">
                  <div className="h-6 w-6 rounded-md bg-primary shrink-0" />
                  <span className="hidden sm:block text-xs font-bold text-foreground">
                    NexusEd
                  </span>
                </div>
                {[
                  { icon: Sparkles, label: 'Feed', active: true },
                  { icon: BookOpen, label: 'Courses', active: false },
                  { icon: Map, label: 'Planner', active: false },
                  { icon: Brain, label: 'AI Chat', active: false },
                  { icon: MessageSquare, label: 'Messages', active: false },
                ].map(({ icon: Icon, label, active }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 rounded-lg px-2 py-2 ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="hidden sm:block text-xs font-medium">
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Main feed */}
              <div className="flex-1 p-4 space-y-3 bg-background">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles
                      className="h-3.5 w-3.5 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    What matters right now
                  </span>
                </div>

                {[
                  {
                    bg: 'bg-red-50 border-red-200',
                    dot: 'bg-red-500',
                    label: 'Due in 3 hours',
                    title: 'CPSC 320 — Algorithm Analysis Assignment 4',
                    icon: '📋',
                  },
                  {
                    bg: 'bg-emerald-50 border-emerald-200',
                    dot: 'bg-emerald-500',
                    label: 'Grade received',
                    title: 'MATH 201 — Quiz 3: 87/100 ✓',
                    icon: '🎯',
                  },
                  {
                    bg: 'bg-blue-50 border-blue-200',
                    dot: 'bg-blue-500',
                    label: 'New announcement',
                    title: 'ENGL 135 — Office hours moved to Thursday',
                    icon: '📣',
                  },
                ].map((card, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${card.bg}`}>
                    <div className="flex items-start gap-3">
                      <span
                        className="text-base leading-none"
                        role="img"
                        aria-hidden="true"
                      >
                        {card.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${card.dot}`}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {card.label}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">
                          {card.title}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Brain
                      className="h-3.5 w-3.5 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-[10px] font-bold text-primary">
                      Study Coach
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    CPSC 320 is due in 3 hours. Based on your submissions,
                    breaking it into sub-problems first helps you most. Want me
                    to walk you through it?
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Ambient glow below mockup */}
          <div
            aria-hidden="true"
            className="absolute -bottom-8 left-1/2 h-24 w-2/3 -translate-x-1/2 rounded-full bg-primary/20 blur-2xl"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar() {
  const items = [
    { value: '16+', label: 'Built-in AI tools' },
    { value: '3-tier', label: 'AI governance' },
    { value: '20+', label: 'Entity types' },
    { value: '100%', label: 'Tenant isolated' },
  ];

  return (
    <div className="border-y border-border bg-muted">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {items.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Problems ─────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    n: '01',
    title: 'Built for administrators, not learners',
    body: 'Canvas, Brightspace, Moodle — digital filing cabinets with a gradebook bolted on. Their navigation reflects an admin\'s mental model. Students don\'t think "I need to go to Modules." They think: what do I need to do right now?',
  },
  {
    n: '02',
    title: 'Fragmented across four different tabs',
    body: 'Content, assignments, discussions, and grades all live in separate places. Students must mentally reconstruct the relationship between disconnected pieces — every single session.',
  },
  {
    n: '03',
    title: 'Every student treated identically',
    body: 'A student struggling with the last assignment and one who just aced it see the exact same page. Zero adaptation. No concept of "this person needs help" or "this person is ready to accelerate."',
  },
  {
    n: '04',
    title: "Support systems that don't work",
    body: "Academic advisors who don't reply. Appointments booked three weeks out. Drop-in sessions that feel rushed. Students left alone wondering if they're even on the right track to graduate.",
  },
];

function Problems() {
  return (
    <section className="border-b border-border bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            The Problem
          </p>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Modern LMSes have four fundamental flaws.
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
            These aren&apos;t minor UX issues. They&apos;re structural failures
            that leave students behind every semester.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {PROBLEMS.map((p) => (
            <div
              key={p.n}
              className="group rounded-2xl border border-border bg-background p-7 shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/5 text-sm font-bold text-primary font-mono">
                {p.n}
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI-Prioritized Feed',
    body: 'Students see what matters right now — deadlines, unread feedback, upcoming content — ranked by AI that understands their academic position.',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    icon: Map,
    title: 'Graduation Roadmap',
    body: "Semester-by-semester plan respecting prerequisites, course availability, and financial aid thresholds. Replaces the advisor who doesn't reply.",
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    icon: Brain,
    title: 'Study Coach',
    body: 'Socratic AI tutor with full course context. Guides students toward understanding — never just gives the answer.',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
  },
  {
    icon: BookOpen,
    title: 'Course Timeline',
    body: 'Content, assignments, and discussions in one chronological stream. The relationship between reading and work is finally self-evident.',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
  {
    icon: Upload,
    title: 'AI Catalog Import',
    body: 'Upload a PDF academic catalog. AI extracts courses, prerequisites, and degree programs — in minutes, not weeks.',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
  },
  {
    icon: MessageSquare,
    title: 'Discussion Threads',
    body: 'Threaded discussions with @mentions, instructor-answer badges, and real-time notifications — inside the course timeline.',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Shield,
    title: 'AI Governance Console',
    body: 'Per-action governance (auto / suggest / blocked), daily token budgets, monthly cost caps, and a full audit log.',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    body: 'Grade distributions, submission rates, AI costs, and at-risk student alerts — all tenant-scoped and real-time.',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    icon: Bot,
    title: 'Agent Builder',
    body: 'Instructors build custom AI agents for their courses — system prompts, tool access, and governance rules — no code required.',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
  },
];

function Features() {
  return (
    <section className="border-b border-border bg-muted py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything an institution needs. Nothing it doesn&apos;t.
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Built AI-native from day one — not a traditional LMS with a chatbot
            bolted on.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-background p-6 shadow-sm hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div
                className={`mb-4 inline-flex rounded-xl p-2.5 ${f.iconBg} ${f.iconColor}`}
              >
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/features"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            See the full feature breakdown
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      step: '01',
      title: 'Import your catalog',
      body: 'Upload a PDF or CSV. AI extracts courses, prerequisites, and degree programs. Admin reviews and confirms in minutes.',
    },
    {
      icon: Users,
      step: '02',
      title: 'Onboard your students',
      body: 'Students register, select their degree program, and get a personalized AI-prioritized feed from day one.',
    },
    {
      icon: Brain,
      step: '03',
      title: 'AI works in the background',
      body: 'Study Coach answers academic questions. Feedback Copilot drafts rubric-aligned feedback. Graduation planner tracks progress.',
    },
    {
      icon: Zap,
      step: '04',
      title: 'Students succeed',
      body: 'Fewer missed deadlines. Better grades. Students who know exactly where they stand — without needing to ask anyone.',
    },
  ];

  return (
    <section className="border-b border-border bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            How it works
          </p>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From zero to running in a single day.
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-border bg-background p-7 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/5">
                  <s.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <span className="font-mono text-2xl font-bold text-foreground/10">
                  {s.step}
                </span>
              </div>
              <h3 className="font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Differentiators ──────────────────────────────────────────────────────────

function DiffRow({
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
  bullets,
  mockup,
  reverse = false,
}: {
  badge: string;
  badgeIcon: React.ElementType;
  title: React.ReactNode;
  description: string;
  bullets: string[];
  mockup: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-12 lg:flex-row lg:items-center ${
        reverse ? 'lg:flex-row-reverse' : ''
      }`}
    >
      {/* Text */}
      <div className="flex-1 space-y-6 min-w-0">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <BadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {badge}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
        <ul className="space-y-2.5">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2.5 text-sm text-muted-foreground"
            >
              <CheckCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                aria-hidden="true"
              />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Mockup */}
      <div className="flex-1 min-w-0">{mockup}</div>
    </div>
  );
}

function CatalogMockup() {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
          <Brain className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">AI Extraction</p>
          <p className="text-xs text-muted-foreground">CS_Catalog_2026.pdf</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { ok: true, text: 'Extracting courses… 247 found' },
          { ok: true, text: 'Parsing prerequisites and corequisites…' },
          { ok: true, text: 'Mapping degree programs… 12 programs' },
          { ok: false, text: '3 items flagged for admin review' },
        ].map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-medium ${
              item.ok
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {item.ok ? (
              <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {item.text}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-border bg-muted px-4 py-3 text-xs text-muted-foreground">
        Ready to import — 244 courses · 12 programs · 3 need review
      </div>
    </div>
  );
}

function EnrollmentMockup() {
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-lg space-y-3">
      {/* Student message */}
      <div className="flex items-start gap-3 rounded-xl bg-muted p-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted-foreground/30 text-xs font-bold text-muted-foreground">
          S
        </div>
        <p className="text-sm text-foreground">
          I need a 3-credit elective that doesn&apos;t conflict with MATH 221 on
          MWF.
        </p>
      </div>
      {/* AI response */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="text-foreground">
            Found 3 options that fit your schedule and count toward your CS
            electives:
          </p>
          <ul className="space-y-1.5">
            {[
              'PHIL 220 — Logic & Computation (Tu/Th, 3 cr)',
              'STAT 260 — Applied Statistics (M/W/F 2–3 pm, 3 cr)',
              'LING 180 — Language & Mind (M/W, 3 cr)',
            ].map((c) => (
              <li
                key={c}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <CheckCircle
                  className="h-3 w-3 shrink-0 text-emerald-500"
                  aria-hidden="true"
                />
                {c}
              </li>
            ))}
          </ul>
          <p className="text-xs font-semibold text-primary">
            Want me to enroll you in STAT 260?
          </p>
        </div>
      </div>
    </div>
  );
}

function Differentiators() {
  return (
    <section className="border-b border-border bg-muted py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 space-y-20">
        <DiffRow
          badge="AI Catalog Import"
          badgeIcon={Upload}
          title={
            <>
              Upload your PDF catalog.
              <br />
              AI sets up your institution.
            </>
          }
          description="DegreeWorks charges $100k+/year and requires weeks of manual setup. NexusEd's AI extraction pipeline processes a 50-page academic calendar and puts structured course data in front of an admin for review — in minutes."
          bullets={[
            'Natural language prerequisite parsing ("minimum C+ or permission of instructor")',
            'Degree requirement group extraction and mapping',
            'Low-confidence items flagged for human review',
            'All-or-nothing transaction — no partial imports',
          ]}
          mockup={<CatalogMockup />}
        />

        <DiffRow
          reverse
          badge="AI Enrollment"
          badgeIcon={Brain}
          title={
            <>
              &ldquo;I need a 3-credit elective.&rdquo;
              <br />
              AI finds and enrolls you.
            </>
          }
          description="Every other LMS treats enrollment as admin plumbing — CSV imports and manual assignment. NexusEd makes it a student-facing, conversational experience. Describe what you need in plain language and the AI does the rest."
          bullets={[
            'Natural language course search across the full catalog',
            'Schedule conflict detection before suggesting options',
            'Prerequisite validation before enrollment',
            'Conversational — all in the AI chat interface',
          ]}
          mockup={<EnrollmentMockup />}
        />
      </div>
    </section>
  );
}

// ─── For roles ────────────────────────────────────────────────────────────────

const ROLES = [
  {
    role: 'Students',
    icon: GraduationCap,
    color: 'indigo',
    perks: [
      'AI-prioritized home feed (deadlines first)',
      'Study Coach with full course context',
      'Graduation roadmap with prerequisite checks',
      'Financial aid-aware semester planning',
      'Conversational course enrollment',
      'Real-time discussion threads',
    ],
  },
  {
    role: 'Instructors',
    icon: BookOpen,
    color: 'violet',
    perks: [
      'Feedback Copilot drafts rubric-aligned feedback',
      'AI agent builder for custom course tutors',
      'Course timeline (content + assignments + discussions)',
      'Quiz engine with auto-grading',
      'Gradebook with submission management',
      'AI catalog import and course structure generation',
    ],
  },
  {
    role: 'Administrators',
    icon: Shield,
    color: 'slate',
    perks: [
      'Per-tenant AI governance (auto / suggest / blocked)',
      'Daily token budgets and monthly cost caps',
      'Full AI audit log',
      'Analytics: grades, submissions, at-risk students',
      'LTI 1.3 integration',
      'Multi-tenant data isolation',
    ],
  },
];

const roleColorMap: Record<
  string,
  { badge: string; icon: string; bullet: string }
> = {
  indigo: {
    badge: 'bg-primary/5 text-primary',
    icon: 'bg-primary/5 text-primary',
    bullet: 'text-primary',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-700',
    icon: 'bg-violet-50 text-violet-600',
    bullet: 'text-violet-500',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-700',
    icon: 'bg-slate-100 text-slate-600',
    bullet: 'text-slate-400',
  },
};

function ForRoles() {
  return (
    <section className="border-b border-border bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            For everyone
          </p>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built around what each role actually needs.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {ROLES.map((r) => {
            const colors = roleColorMap[r.color];
            return (
              <div
                key={r.role}
                className="rounded-2xl border border-border bg-background p-7 shadow-sm"
              >
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.icon}`}
                  >
                    <r.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-foreground">{r.role}</h3>
                </div>
                <ul className="space-y-2.5">
                  {r.perks.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                      <CheckCircle
                        className={`mt-0.5 h-4 w-4 shrink-0 ${colors.bullet}`}
                        aria-hidden="true"
                      />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="relative overflow-hidden bg-primary py-20 md:py-28">
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
          Your students deserve better than a filing cabinet.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/80">
          Get NexusEd running in hours, not months. No vendor lock-in. No
          six-figure implementation fees.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
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

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/70">
          {['Multi-tenant SaaS', 'FERPA-aware', 'Self-hosting available'].map(
            (t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle
                  className="h-4 w-4 shrink-0 text-primary-foreground/60"
                  aria-hidden="true"
                />
                {t}
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>
        <Hero />
        <StatsBar />
        <Problems />
        <Features />
        <HowItWorks />
        <Differentiators />
        <ForRoles />
        <CTA />
      </main>
      <MarketingFooter />
    </div>
  );
}
