# OUTREACH.md — Warm Conversation Playbook

> Executes [GTM.md](./GTM.md) §4 (CASL rules) and §8 action 8 ("first 10 warm conversations").
> **Everything in this file is warm outreach** — people Shaafi knows or has met. No cold email
> until the warm list is exhausted; when that day comes, use the GTM §5 skeleton and log
> consent basis first.
>
> Live demo: https://axis-lms-web.onrender.com
> Demo logins (all `password123`): `student@Axis.demo` · `prof.chen@Axis.demo` · `admin@Axis.demo`
> ⚠️ Demo data only — no real student PII goes on this instance (FIPPA; GTM §6).

---

## The 30-second pitch (say it the same way every time)

> I built an AI-native LMS after watching UVic students juggle Brightspace, prof websites,
> Mattermost, and email just to figure out what to do next. Axis is one feed: assignments,
> grades, announcements, office-hours booking — and an AI planner that actually knows the
> student's degree progress. It's live; you can click around it right now.

Three proof points, pick per audience:
1. **Students:** one feed + "when can I meet my prof?" answered with a bookable slot, not an email chain.
2. **Instructors:** define office hours once, bookings arrive on your schedule; busy blocks protect research time; conflict detection stops double-booked weeks.
3. **Decision-makers:** PDF → catalog import onboards a school in under a day; per-tenant AI governance with budgets and an audit log.

---

## Message 1 — The UVic engineer (send first)

*Context: he liked the idea when it was an idea. This is the promised follow-up, not a pitch.*

> Hey [name] — remember the LMS thing we talked about? I built it.
>
> One feed for everything (assignments, grades, announcements), office-hours booking
> built in — students book a slot instead of emailing — and an AI planner that knows
> degree progress. It's deployed: https://axis-lms-web.onrender.com
> (try `student@Axis.demo` / `password123`, or the instructor login `prof.chen@Axis.demo`
> to see the scheduling side).
>
> I'd love 20 minutes of your brain on it — what's real, what's naive, and who at UVic
> would care. When works?

**The ask is feedback + one referral, not a sale.** Log outcome below.

## Message 2 — Profs / TAs Shaafi knows (adapt per person)

> Hi [name] — Shaafi from [course/context]. I've been building an LMS since [term],
> and the instructor side is now live: you define office hours once, students book
> 15-minute slots themselves, your whole week (lectures + bookings + protected research
> time) sits in one calendar, and the system refuses office-hour blocks that collide
> with your lectures.
>
> Two-minute look, no signup: https://axis-lms-web.onrender.com — instructor login
> `prof.chen@Axis.demo` / `password123`, then open Schedule.
>
> Would you give me 15 minutes of honest criticism? You run office hours for real —
> I don't.

## Message 3 — Student clubs (VikeSec, CSC course union, ESS)

> Hey — I'm Shaafi, [year/program] at UVic. I built an LMS where students never have to
> ask "what am I supposed to do next" — one feed, office-hours booking without email
> ping-pong, and an AI degree planner. Live demo: https://axis-lms-web.onrender.com
> (`student@Axis.demo` / `password123`).
>
> Could I demo it at a meeting for 10 minutes? Brutal feedback wanted — this was built
> from UVic pain and you're exactly who it's for.

---

## Conversation log (move to Notion at >10 rows — GTM §4 tracker schema)

| Date | Who | Channel | Consent basis | Outcome | Next action |
|------|-----|---------|---------------|---------|-------------|
| | UVic engineer contact | (warm — prior conversation) | existing relationship | | send Message 1 |
| | | | | | |

## Rules (from GTM §4 — do not improvise)

1. Warm order: UVic engineer → known profs/TAs → student clubs → BC edtech meetups → only then compliant cold email.
2. One person per message. Never a BCC blast. Never scraped addresses.
3. Every message: who you are, how to reach you, and an easy out ("say no thanks and I'll stop").
4. Log every contact here (or Notion) with consent basis *before* sending.
5. Demo instance carries fake data only. If anyone asks "can we try it with our real students" — that triggers the FIPPA/PIA conversation and Canadian hosting first (GTM §6). Exciting problem; do not shortcut it.

## Demo-walkthrough script (for live 15-min calls)

1. **Student home** (`student@Axis.demo`): the feed — deadlines, grades, announcements ranked in one place. "Nothing to hunt for."
2. **Book office hours**: course page → pick Prof Chen slot → booked. No email. Note Thursday 10–11 is missing — her calendar blocked it automatically.
3. **Instructor schedule** (`prof.chen@Axis.demo` → Schedule): whole week in one grid — lectures, office-hour blocks, today's bookings, protected "Research" time. Try adding office hours Monday 10:00 — rejected, collides with her CSC 110 lecture.
4. **AI planner** (student → Planner): degree progress + "what should I take next term" with the AI grounded in the actual catalog.
5. **Admin** (`admin@Axis.demo`): AI governance — per-tool permissions, budgets, usage log. "Your institution controls the AI, not us."
