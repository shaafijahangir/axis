import type { Metadata } from 'next';
import Link from 'next/link';
import {
  GraduationCap,
  ArrowRight,
  Mail,
  Building2,
  Lightbulb,
  Target,
  Quote,
} from 'lucide-react';
import { MarketingNav } from '@/components/marketing/marketing-nav';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

export const metadata: Metadata = {
  title: 'Our Story — NexusEd',
  description:
    'NexusEd was built by a student who lived the problem. This is the story of why filing-cabinet LMSes fail students — and what we built instead.',
};

// ─── Story ────────────────────────────────────────────────────────────────────

function Story() {
  return (
    <section className="border-b border-border bg-background pt-16 pb-16 md:pt-20 md:pb-24 lg:pt-24">
      <div className="mx-auto max-w-3xl px-6">
        {/* Byline */}
        <div className="mb-12 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5">
            <GraduationCap
              className="h-6 w-6 text-primary"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              The story behind NexusEd
            </p>
            <p className="text-sm text-muted-foreground">
              Written by the founder
            </p>
          </div>
        </div>

        <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Built by someone who{' '}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            lived the problem.
          </span>
        </h1>

        <div className="space-y-5 text-muted-foreground leading-relaxed">
          <p className="text-lg text-foreground/90">
            NexusEd was born out of frustration — the real kind, not the startup
            pitch kind.
          </p>

          <p>
            Its creator, a student at the University of Victoria in British
            Columbia, lived through exactly what this platform aims to fix.
            Brightspace, the LMS used at UVic, is a perfect example of the
            problem: functional enough to check boxes, broken enough to fail
            students daily.
          </p>

          <p>
            The experience went deeper than bad software. Academic advisors who
            don&apos;t reply to emails. Appointment systems that are always
            full. Drop-in advising sessions that feel rushed and dismissive. A
            system that technically offers support but practically leaves
            students alone with their stress — wondering what courses to take,
            how many credits they need, whether they&apos;re even on the right
            track to graduate.
          </p>

          <blockquote className="my-10 border-l-4 border-primary bg-primary/5 pl-6 pr-4 py-5 rounded-r-2xl">
            <Quote
              className="mb-3 h-6 w-6 text-primary/40"
              aria-hidden="true"
            />
            <p className="text-lg font-medium text-foreground leading-relaxed">
              The frustration isn&apos;t just about software. Software can be
              replaced. The deeper problem is a support system that exists on
              paper but fails in practice.
            </p>
          </blockquote>

          <p>
            The AI course planner wasn&apos;t an abstract idea. It was built
            from a specific need: a student staring at a course catalog, unsure
            whether they had the right prerequisites, unsure how many credits
            stood between them and graduation, unsure whether changing direction
            would cost them an extra year.
          </p>

          <p>
            The concept was straightforward — an intelligent assistant that
            understands a student&apos;s major, their completed courses, their
            remaining requirements, and can answer real questions. &ldquo;What
            should I take next semester?&rdquo; &ldquo;How many credits do I
            have left?&rdquo; &ldquo;What happens if I switch to a minor in
            this?&rdquo; Not a chatbot reciting policy pages. A tool that
            actually understands a student&apos;s academic position and gives
            them clarity.
          </p>

          <h2 className="mt-12 mb-4 text-xl font-bold text-foreground">
            The institutional wall
          </h2>

          <p>
            The idea was proposed directly to UVic. The head software engineer
            understood it. He saw the value. He liked it. But he was honest
            about the reality: he couldn&apos;t push it forward. It was a
            business decision, not a technical one. The people who control what
            gets built don&apos;t experience the problem. The people who
            experience the problem don&apos;t control what gets built.
          </p>

          <p>
            That conversation made something clear. The barrier to better
            educational technology is not capability. The tools exist. The
            models exist. The infrastructure exists. The barrier is
            institutional willingness — committees, budgets, risk aversion, and
            a comfort with &ldquo;good enough&rdquo; that students don&apos;t
            share.
          </p>

          <blockquote className="my-10 border-l-4 border-primary bg-primary/5 pl-6 pr-4 py-5 rounded-r-2xl">
            <Quote
              className="mb-3 h-6 w-6 text-primary/40"
              aria-hidden="true"
            />
            <p className="text-lg font-medium text-foreground leading-relaxed">
              Waiting for institutions to change is not a viable strategy. They
              move on decade-long timescales. Students graduate in four years.
              The math doesn&apos;t work.
            </p>
          </blockquote>

          <p>
            So you build the thing yourself. Not because it&apos;s easy, but
            because every semester that passes without it means more students
            are sitting alone wondering if they&apos;re on the right track, with
            no one answering.
          </p>

          <p className="text-foreground/90 font-medium">
            NexusEd is the answer to a question no institution bothered to ask:
            what would it look like if we actually built technology that served
            students first?
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Values ───────────────────────────────────────────────────────────────────

const VALUES = [
  {
    icon: Target,
    iconBg: 'bg-primary/5',
    iconColor: 'text-primary',
    title: 'Students first. Always.',
    body: 'Every feature decision starts with one question: does this serve students? Not does it make administration easier, not does it add to the feature list — does it make a student more likely to understand their path, complete their work, and graduate on time.',
  },
  {
    icon: Lightbulb,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'AI should be invisible before it is visible.',
    body: 'The most important AI in NexusEd is the kind you never interact with directly. The prioritized feed. The course recommendation. The prerequisite check. Ambient intelligence that makes the platform feel like it understands you — before you open the chat.',
  },
  {
    icon: Building2,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Institutions that serve students deserve better tools.',
    body: "We're not anti-institution. We're anti-institution-that-forgot-who-it's-for. The schools genuinely trying to serve students deserve technology as serious as that commitment — not software designed for administrators, sold to administrators, without a student in the room.",
  },
];

function Values() {
  return (
    <section className="border-b border-border bg-muted py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 space-y-12">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            What we believe
          </p>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            The principles that drive every decision.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl border border-border bg-background p-7 shadow-sm space-y-4"
            >
              <div
                className={`inline-flex rounded-xl p-3 ${v.iconBg} ${v.iconColor}`}
              >
                <v.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-foreground text-lg leading-snug">
                {v.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {v.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Vision ───────────────────────────────────────────────────────────────────

function Vision() {
  return (
    <section className="border-b border-border bg-background py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6 space-y-8">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            Long-term vision
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Not a better Brightspace.{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Something different.
            </span>
          </h2>
        </div>

        <div className="space-y-5 text-muted-foreground leading-relaxed">
          <p>
            NexusEd is not trying to out-feature Canvas or compete on
            integrations with Brightspace. Those platforms had decades and
            hundreds of millions of dollars. That&apos;s not the game.
          </p>
          <p>
            The game is this: a platform that makes students say &ldquo;I
            actually know what I need to do, I&apos;m not stressed about whether
            I&apos;m on track, and I feel supported.&rdquo;
          </p>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <p className="text-foreground font-medium leading-relaxed">
              A revolutionary, agentic LMS that{' '}
              <strong className="text-primary">
                boosts growth and eliminates noise.
              </strong>{' '}
              Every feature decision, every design choice, every line of code
              should be tested against that sentence.
            </p>
          </div>
          <p>
            The long-term vision is a platform that replaces not just the LMS,
            but the advisor who doesn&apos;t reply — giving every student,
            regardless of institution size or budget, access to the kind of
            individualized support that currently only exists at elite schools
            with low student-to-advisor ratios.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Contact ──────────────────────────────────────────────────────────────────

function Contact() {
  return (
    <section className="border-b border-border bg-muted py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="rounded-2xl border border-border bg-background p-8 shadow-sm md:p-12 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex rounded-xl bg-primary/5 p-3">
              <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Interested in NexusEd for your institution?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We&apos;re in early access. If you represent a college,
              university, or online program and want to talk about what NexusEd
              could do for your students, reach out directly.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="mailto:hello@nexused.app"
              className="flex items-center gap-3 rounded-xl border border-border bg-muted px-5 py-4 hover:border-primary/30 hover:bg-primary/5 transition-colors group"
            >
              <Mail
                className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                hello@nexused.app
              </span>
            </a>
            <p className="text-xs text-muted-foreground px-1">
              We respond to every institutional inquiry within 48 hours. No
              sales pipeline. No SDR. A real conversation with someone who built
              this.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t border-border pt-6">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              Try it yourself
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/features"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              See all features →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main>
        <Story />
        <Values />
        <Vision />
        <Contact />
      </main>
      <MarketingFooter />
    </div>
  );
}
