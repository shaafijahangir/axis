import Link from 'next/link';
import {
  GraduationCap,
  ArrowRight,
  Mail,
  Building2,
  Lightbulb,
  Target,
} from 'lucide-react';
import { MarketingNav } from '@/components/marketing/marketing-nav';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

// ─── Story ────────────────────────────────────────────────────────────────────

function Story() {
  return (
    <section className="py-16 md:py-24 border-b">
      <div className="mx-auto max-w-3xl px-6">
        {/* Byline */}
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <GraduationCap
              className="h-5 w-5 text-primary"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="font-semibold text-sm">The story behind NexusEd</p>
            <p className="text-xs text-muted-foreground">
              Written by the founder
            </p>
          </div>
        </div>

        {/* Story body */}
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl not-prose mb-6">
            Built by someone who lived the problem.
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            NexusEd was born out of frustration — the real kind, not the startup
            pitch kind.
          </p>

          <p className="text-muted-foreground leading-relaxed mb-5">
            Its creator, a student at the University of Victoria in British
            Columbia, lived through exactly what this platform aims to fix.
            Brightspace, the LMS used at UVic, is a perfect example of the
            problem: functional enough to check boxes, broken enough to fail
            students daily.
          </p>

          <p className="text-muted-foreground leading-relaxed mb-5">
            The experience went deeper than bad software. Academic advisors who
            don&apos;t reply to emails. Appointment systems that are always
            full. Drop-in advising sessions that feel rushed and dismissive. A
            system that technically offers support but practically leaves
            students alone with their stress — wondering what courses to take,
            how many credits they need, whether they&apos;re even on the right
            track to graduate.
          </p>

          <blockquote className="border-l-4 border-primary pl-5 py-1 my-8 space-y-2">
            <p className="text-lg font-medium leading-relaxed">
              &ldquo;The frustration isn&apos;t just about software. Software
              can be replaced. The deeper problem is a support system that
              exists on paper but fails in practice.&rdquo;
            </p>
          </blockquote>

          <p className="text-muted-foreground leading-relaxed mb-5">
            The AI course planner wasn&apos;t an abstract idea. It was built
            from a specific need: a student staring at a course catalog, unsure
            whether they had the right prerequisites, unsure how many credits
            stood between them and graduation, unsure whether changing direction
            would cost them an extra year.
          </p>

          <p className="text-muted-foreground leading-relaxed mb-5">
            The concept was straightforward — an intelligent assistant that
            understands a student&apos;s major, their completed courses, their
            remaining requirements, and can answer real questions. &ldquo;What
            should I take next semester?&rdquo; &ldquo;How many credits do I
            have left?&rdquo; &ldquo;What happens if I switch to a minor in
            this?&rdquo; Not a chatbot reciting policy pages. A tool that
            actually understands a student&apos;s academic position and gives
            them clarity.
          </p>

          <h2 className="text-xl font-bold mt-10 mb-4">
            The institutional wall
          </h2>

          <p className="text-muted-foreground leading-relaxed mb-5">
            The idea was proposed directly to UVic. The head software engineer
            understood it. He saw the value. He liked it. But he was honest
            about the reality: he couldn&apos;t push it forward. It was a
            business decision, not a technical one. The people who control what
            gets built don&apos;t experience the problem. The people who
            experience the problem don&apos;t control what gets built.
          </p>

          <p className="text-muted-foreground leading-relaxed mb-5">
            That conversation made something clear. The barrier to better
            educational technology is not capability. The tools exist. The
            models exist. The infrastructure exists. The barrier is
            institutional willingness — committees, budgets, risk aversion, and
            a comfort with &ldquo;good enough&rdquo; that students don&apos;t
            share.
          </p>

          <blockquote className="border-l-4 border-primary pl-5 py-1 my-8 space-y-2">
            <p className="text-lg font-medium leading-relaxed">
              &ldquo;Waiting for institutions to change is not a viable
              strategy. They move on decade-long timescales. Students graduate
              in four years. The math doesn&apos;t work.&rdquo;
            </p>
          </blockquote>

          <p className="text-muted-foreground leading-relaxed mb-5">
            So you build the thing yourself. Not because it&apos;s easy, but
            because every semester that passes without it means more students
            are sitting alone wondering if they&apos;re on the right track, with
            no one answering.
          </p>

          <p className="text-muted-foreground leading-relaxed">
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
    title: 'Students first. Always.',
    body: 'Every feature decision starts with one question: does this serve students? Not does it make administration easier, not does it add to the feature list — does it make a student more likely to understand their path, complete their work, and graduate on time.',
  },
  {
    icon: Lightbulb,
    title: 'AI should be invisible before it is visible.',
    body: 'The most important AI in NexusEd is the kind you never interact with directly. The prioritized feed. The course recommendation. The prerequisite check. Ambient intelligence that makes the platform feel like it understands you — before you open the chat.',
  },
  {
    icon: Building2,
    title: 'Institutions that serve students deserve better tools.',
    body: "We're not anti-institution. We're anti-institution-that-forgot-who-it's-for. The schools that are genuinely trying to serve students deserve technology as serious as that commitment — not software designed for administrators, sold to administrators, without a student in the room.",
  },
];

function Values() {
  return (
    <section className="py-20 md:py-28 bg-muted/30 border-b">
      <div className="mx-auto max-w-7xl px-6 space-y-10">
        <div className="max-w-2xl space-y-3">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest">
            What we believe
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            The principles that drive every decision.
          </h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-xl border bg-card p-6 space-y-4"
            >
              <div className="inline-flex rounded-lg p-2.5 bg-primary/10">
                <v.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-lg leading-snug">{v.title}</h3>
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
    <section className="py-20 md:py-28 border-b">
      <div className="mx-auto max-w-3xl px-6 space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest">
            Long-term vision
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Not a better Brightspace. Something different.
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
          <p>
            A revolutionary, agentic LMS that{' '}
            <strong className="text-foreground">
              boosts growth and eliminates noise
            </strong>
            . Every feature decision, every design choice, every line of code
            should be tested against that sentence. If it doesn&apos;t boost
            growth or eliminate noise, it doesn&apos;t belong.
          </p>
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
    <section className="py-20 md:py-28 bg-muted/30 border-b">
      <div className="mx-auto max-w-3xl px-6">
        <div className="rounded-2xl border bg-card p-8 md:p-12 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex rounded-lg p-2.5 bg-primary/10">
              <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Interested in NexusEd for your institution?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We&apos;re in early access. If you represent a college,
              university, or online program and want to talk about what NexusEd
              could do for your students, reach out directly.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
              <Mail
                className="h-4 w-4 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
              <a
                href="mailto:hello@nexused.app"
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                hello@nexused.app
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              We respond to every institutional inquiry within 48 hours. No
              sales pipeline. No SDR. A real conversation with someone who built
              this.
            </p>
          </div>

          <div className="border-t pt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Try it yourself
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
