import Link from 'next/link';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  MessageSquare,
  BarChart3,
  Shield,
  Clock,
  Users,
  Brain,
  Map,
  Upload,
  CheckCircle,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

// ─── Marketing Nav ────────────────────────────────────────────────────────────

function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="text-lg font-bold">NexusEd</span>
        </Link>

        <nav
          className="hidden md:flex items-center gap-6 text-sm"
          aria-label="Marketing navigation"
        >
          <Link
            href="/features"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </Link>
          <Link
            href="/about"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            About
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Get Started
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/30 py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Text */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles
                className="h-3.5 w-3.5 text-primary"
                aria-hidden="true"
              />
              AI-Native Learning Management System
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                The LMS that{' '}
                <span className="text-primary">actually serves students.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-prose">
                NexusEd replaces filing-cabinet LMSes with an AI-first platform
                that answers the question every student is really asking:{' '}
                <em className="text-foreground">What do I need to do next?</em>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Start for free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-md border bg-card px-6 py-3 text-sm font-semibold hover:bg-accent transition-colors"
              >
                Read the story
              </Link>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle
                  className="h-4 w-4 text-emerald-500"
                  aria-hidden="true"
                />
                No credit card required
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle
                  className="h-4 w-4 text-emerald-500"
                  aria-hidden="true"
                />
                Multi-tenant from day one
              </div>
            </div>
          </div>

          {/* Visual — platform preview mockup */}
          <div className="relative">
            <div className="rounded-2xl border bg-card p-4 shadow-2xl">
              {/* Fake top bar */}
              <div className="flex items-center gap-2 mb-4 border-b pb-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-3 h-5 rounded-md bg-muted" />
              </div>

              {/* Fake AI feed */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles
                      className="h-3.5 w-3.5 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="text-xs font-semibold">
                    NexusEd — What matters right now
                  </div>
                </div>

                {[
                  {
                    color:
                      'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
                    label: 'Due in 3 hours',
                    title: 'CPSC 320 — Algorithm Analysis Assignment 4',
                    icon: '📋',
                  },
                  {
                    color:
                      'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
                    label: 'Grade received',
                    title: 'MATH 201 — Quiz 3: 87/100',
                    icon: '✅',
                  },
                  {
                    color:
                      'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                    label: 'New announcement',
                    title: 'ENGL 135 — Office hours moved to Thursday',
                    icon: '📣',
                  },
                ].map((card, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-xs ${card.color}`}
                  >
                    <span className="text-base" role="img" aria-hidden="true">
                      {card.icon}
                    </span>
                    <div>
                      <p
                        className="font-semibold text-muted-foreground"
                        style={{ fontSize: '10px' }}
                      >
                        {card.label}
                      </p>
                      <p className="font-medium mt-0.5">{card.title}</p>
                    </div>
                  </div>
                ))}

                <div className="rounded-lg border bg-primary/5 border-primary/20 p-3 mt-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Brain
                      className="h-3.5 w-3.5 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-[10px] font-semibold text-primary">
                      Study Coach
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You have CPSC 320 due in 3 hours. Based on your grade
                    history, breaking the problem into smaller steps first will
                    help. Want me to walk you through it?
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative glow */}
            <div
              className="absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Problems ─────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    number: '01',
    title: 'Built for administration, not learning',
    body: 'Canvas, Brightspace, Moodle — digital filing cabinets with a gradebook attached. Their navigation reflects an administrator\'s mental model. A student never thinks "I need to navigate to Modules." They think: what do I need to do next?',
  },
  {
    number: '02',
    title: 'Fragmented learning experience',
    body: 'Content lives in one place. Assignments in another. Discussions in a third. Grades in a fourth. Students must mentally reconstruct the relationship between all disconnected pieces, every single time.',
  },
  {
    number: '03',
    title: 'Every student treated identically',
    body: 'A struggling student and a thriving student see the exact same linear list of modules. Zero adaptation. No concept of "this person needs help" versus "this person is ready to move faster."',
  },
  {
    number: '04',
    title: 'Support systems that are broken',
    body: "Academic advisors who don't reply. Appointments booked three weeks out. Drop-in sessions that feel rushed. Students left to navigate degree requirements alone — wondering if they're even on the right track.",
  },
];

function Problems() {
  return (
    <section className="py-20 md:py-28 border-b">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            The Problem
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Modern LMSes have four fundamental flaws.
          </h2>
          <p className="mt-4 text-muted-foreground">
            These aren&apos;t minor UX issues. They&apos;re structural failures
            that leave students behind every semester.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {PROBLEMS.map((p) => (
            <div
              key={p.number}
              className="rounded-xl border bg-card p-6 space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl font-bold text-primary/20 font-mono">
                {p.number}
              </div>
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
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
    body: "Students don't see a folder. They see what matters right now — deadlines, unread feedback, upcoming lessons — ranked by the AI that understands their situation.",
    color: 'text-purple-500',
  },
  {
    icon: Map,
    title: 'Graduation Roadmap',
    body: "Semester-by-semester graduation plan that respects prerequisites, course availability, and financial aid thresholds. Replaces the advisor who doesn't reply.",
    color: 'text-blue-500',
  },
  {
    icon: Brain,
    title: 'Study Coach & Feedback AI',
    body: 'Socratic study coach that guides students to answers. Feedback Copilot that drafts rubric-aligned feedback for instructors — in seconds.',
    color: 'text-emerald-500',
  },
  {
    icon: BookOpen,
    title: 'Course Timeline',
    body: 'Content, assignments, and discussions in a single chronological stream. Not three separate tabs. The relationship between content and work is self-evident.',
    color: 'text-amber-500',
  },
  {
    icon: Upload,
    title: 'AI Catalog Import',
    body: 'Upload a PDF course catalog. AI extracts 200+ courses with prerequisites and degree requirements in minutes. Institutions onboard in hours, not weeks.',
    color: 'text-rose-500',
  },
  {
    icon: MessageSquare,
    title: 'Discussion Threads',
    body: 'Threaded discussions with @mentions, instructor-answer badges, and real-time notifications. Integrated into the course timeline, not a separate tab.',
    color: 'text-cyan-500',
  },
  {
    icon: Shield,
    title: 'AI Governance Console',
    body: 'Per-action governance rules (auto/suggest/blocked), daily token budgets, and full audit logs. Institutions stay in control of every AI interaction.',
    color: 'text-indigo-500',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    body: 'Grade distributions, submission rates, AI usage costs, and at-risk student alerts — all tenant-scoped, all real-time.',
    color: 'text-orange-500',
  },
];

function Features() {
  return (
    <section className="py-20 md:py-28 bg-muted/30 border-b">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything a modern institution needs. Nothing it doesn&apos;t.
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-5 space-y-3 hover:shadow-md transition-shadow"
            >
              <div
                className={`inline-flex rounded-lg p-2.5 bg-muted ${f.color}`}
              >
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Differentiators ──────────────────────────────────────────────────────────

function Differentiators() {
  return (
    <section className="py-20 md:py-28 border-b">
      <div className="mx-auto max-w-7xl px-6 space-y-20">
        {/* Differentiator 1 */}
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              AI Catalog Import
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              Upload your PDF catalog. AI sets up your institution.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              DegreeWorks charges $100k+/year and requires weeks of manual
              setup. NexusEd&apos;s AI extraction pipeline processes a 50-page
              academic calendar, finds 200+ courses with prerequisites and
              degree requirements, and puts them in front of an admin for review
              — in minutes.
            </p>
            <div className="space-y-2">
              {[
                'Natural language prerequisite parsing ("minimum C+ or permission of instructor")',
                'Degree requirement group extraction',
                'Low-confidence flagging for human review',
                'All-or-nothing transaction — no partial imports',
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle
                    className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold">
                  AI Extraction — Processing
                </p>
                <p className="text-xs text-muted-foreground">
                  CS_Catalog_2026.pdf
                </p>
              </div>
            </div>
            {[
              { status: 'done', text: 'Extracting courses... 247 found' },
              { status: 'done', text: 'Parsing prerequisites...' },
              {
                status: 'done',
                text: 'Mapping degree programs... 12 programs',
              },
              { status: 'flag', text: '3 items flagged for review' },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs rounded-md px-3 py-2 ${
                  item.status === 'done'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                }`}
              >
                {item.status === 'done' ? (
                  <CheckCircle
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                {item.text}
              </div>
            ))}
            <div className="border-t pt-3 text-xs text-muted-foreground">
              Ready to import — 244 courses, 12 programs, 3 require admin review
            </div>
          </div>
        </div>

        {/* Differentiator 2 */}
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1 rounded-2xl border bg-card p-6 space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-muted/60 p-3">
              <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Users
                  className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                  aria-hidden="true"
                />
              </div>
              <p className="text-sm">
                I need a 3-credit elective that doesn&apos;t conflict with MATH
                221 on MWF.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/10 p-3">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles
                  className="h-3.5 w-3.5 text-primary"
                  aria-hidden="true"
                />
              </div>
              <div className="text-sm space-y-2">
                <p>
                  Found 4 options that fit your schedule and count toward your
                  CS electives:
                </p>
                <div className="space-y-1">
                  {[
                    'PHIL 220 — Logic & Computation (Tu/Th, 3 cr)',
                    'STAT 260 — Applied Statistics (M/W/F, 3 cr)',
                    'LING 180 — Language & Mind (M/W, 3 cr)',
                  ].map((c) => (
                    <div
                      key={c}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <CheckCircle
                        className="h-3 w-3 text-emerald-500"
                        aria-hidden="true"
                      />
                      {c}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-primary font-medium">
                  Want me to enroll you in STAT 260?
                </p>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Brain className="h-3.5 w-3.5" aria-hidden="true" />
              AI Enrollment
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              &ldquo;I need a 3-credit elective.&rdquo; AI finds and enrolls
              you.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Every other LMS treats enrollment as admin plumbing — CSV imports
              and manual assignment. NexusEd makes it a student-facing,
              conversational experience. Describe what you need in plain
              language. The AI finds matching courses, checks your
              prerequisites, and enrolls you — all without leaving the chat.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Social Proof ─────────────────────────────────────────────────────────────

function SocialProof() {
  return (
    <section className="py-16 bg-muted/30 border-b">
      <div className="mx-auto max-w-7xl px-6 text-center space-y-6">
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
          Built for the institutions that put students first
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          {[
            'Research Universities',
            'Community Colleges',
            'Polytechnic Institutes',
            'Online-First Programs',
          ].map((label) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full border bg-card px-5 py-2.5 text-sm font-medium text-muted-foreground"
            >
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              {label}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Testimonials and case studies coming soon. We&apos;re currently in
          early access.
        </p>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="py-20 md:py-28 border-b bg-primary text-primary-foreground">
      <div className="mx-auto max-w-3xl px-6 text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your students deserve better than a filing cabinet.
          </h2>
          <p className="text-primary-foreground/80 text-lg">
            Get NexusEd running in hours, not months. No vendor lock-in. No
            six-figure implementation fees.
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

        <p className="text-xs text-primary-foreground/60">
          Multi-tenant SaaS. FERPA-aware architecture. Self-hosting available.
        </p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-12 bg-card border-t">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap
                className="h-5 w-5 text-primary"
                aria-hidden="true"
              />
              <span className="font-bold">NexusEd</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-native LMS built by someone who lived the problem, for every
              student who deserves better.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Product
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/features"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Log in
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Get started
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              For Institutions
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>AI Catalog Import</li>
              <li>Graduation Planning</li>
              <li>LTI 1.3 Integration</li>
              <li>Multi-tenant SaaS</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              For Students
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>AI Study Coach</li>
              <li>Smart Enrollment</li>
              <li>Graduation Roadmap</li>
              <li>Feed-first dashboard</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} NexusEd. Built to serve students first.
          </p>
          <p>
            Questions?{' '}
            <a
              href="mailto:hello@nexused.app"
              className="hover:text-foreground transition-colors"
            >
              hello@nexused.app
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>
        <Hero />
        <Problems />
        <Features />
        <Differentiators />
        <SocialProof />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
