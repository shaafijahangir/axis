# GTM.md — Axis Go-To-Market Playbook

> **North star:** value before money. Axis exists because students are unsupported (see [MISSION.md](./MISSION.md)). Revenue funds the mission; it is not the mission.
>
> **Evidence Rule applies** (CLAUDE.md): every claim here is cited or labeled *unverified*. Update this doc as facts change — Living Docs Rule.

*Created 2026-07-13. Status: pre-revenue, product in Phase A (see ROADMAP.md), not yet deployed publicly.*

---

## 1. Market Facts (cited)

| Fact | Number | Source |
|------|--------|--------|
| Global LMS market, 2026 | ~$34.1B USD | [Grand View Research](https://www.grandviewresearch.com/industry-analysis/learning-management-systems-market) |
| Projected 2033 | ~$123.8B (20.2% CAGR) | [Grand View Research](https://www.grandviewresearch.com/industry-analysis/learning-management-systems-market) |
| Colleges/universities with an LMS | 99% | [Research.com LMS statistics](https://research.com/education/lms-statistics) |
| NA higher-ed LMS share (Fall 2024) | Canvas 39%, Blackboard 19%, Moodle 16%, Brightspace 16% | [Research.com LMS statistics](https://research.com/education/lms-statistics) |
| AI-in-education market | $4B (2024), ~36% CAGR to 2030 | cited via [Docebo](https://www.docebo.com/learning-network/blog/ai-learning-platforms/) — vendor blog, treat as directional |
| Avg. student-to-advisor ratio (US) | 375:1 | [EAB](https://eab.com/higher-education-glossary/student-to-advisor-ratio/) |
| Advisor caseload benchmarks | 286:1 avg at public 4-years; Boyer 2030 report recommends 250:1 | [EAB](https://eab.com/higher-education-glossary/student-to-advisor-ratio/), [NACADA clearinghouse](https://nacada.ksu.edu/Resources/Clearinghouse/View-Articles/Advisor-to-Student-Ratio-Caseload-Resources.aspx) |
| #1 barrier to better advising since 2021 | high caseloads (Tyton Partners survey) | via [NASPA](https://www.naspa.org/blog/caseload-alignment-for-holistic-advising-and-student-success) |

**Read on the market:** 99% penetration means we are in a *replacement/augmentation* market at institutions — but a *greenfield* market for (a) small institutions running on duct tape and (b) student-facing tools that sit beside the incumbent LMS.

## 2. Competitive Landscape (July 2026)

**Incumbents have shipped AI — the window for "we have AI, they don't" is closed:**
- **Instructure Canvas — IgniteAI Agent**: launched Mar 12 2026 (US + LatAm), agentic assistant across 500+ Canvas APIs, AWS-powered, free for US customers through Jun 30 2026 and globally through Sep 30 2026. [Press release](https://www.instructure.com/press-release/instructure-delivers-its-agentic-ai-promise-launch-igniteai-agent)
- **D2L Brightspace — Lumi** (UVic's vendor): AI content creation, module summaries, quiz recommendations, rubric feedback drafting; "Lumi Learner Mode" AI tutoring beta from Sept 2026. [D2L Lumi](https://www.d2l.com/lumi/), [Fusion 2026 announcements](http://www.prnewswire.com/news-releases/d2l-announces-new-ai-enhanced-content-creation-and-personalized-learning-at-fusion-2026-302822234.html)
- **AI-native startups** (Sana, Disco): corporate L&D focus, not academic operations (enrollment, degrees, advising). [Docebo roundup](https://www.docebo.com/learning-network/blog/ai-learning-platforms/), [Disco](https://www.disco.co/blog/ai-lms-platforms-higher-education-2026)

**Where nobody ships (our lanes):**
1. **Student-path agents** — graduation planning with financial projections, AI-native enrollment. Incumbent AI is instructor-workflow + content-gen. (Axis: GRAD-001–004, ENROLL-001–006 built.)
2. **All-in-one consolidation** — incumbents ARE the fragmentation (Brightspace + Ed + Mattermost + prof sites + email; evidence in [shaafilook.md](./shaafilook.md)). They can't consolidate tools they don't own.
3. **Office-hours booking as a first-class feature** — Canvas/Brightspace schedulers exist but are optional, buried, not feed-integrated, rarely adopted ([UChicago on Canvas Scheduler](https://courses.uchicago.edu/2018/09/10/scheduling-office-hours-in-canvas-an-introduction/), [Carleton on Brightspace Scheduler](https://carleton.ca/brightspace/instructors/using-the-scheduler/)). UVic/SFU faculty directories list office + email but **never** hours or booking (verified in shaafilook.md).
4. **Per-tenant AI governance + cost tracking** — auto/suggest/blocked tiers, budgets, audit log (FEAT-012 built).
5. **PDF → catalog AI onboarding** (ONBOARD-004 built).

**One-liner:** *Axis is the AI-native LMS where a student always knows what to do next — one feed, one system, and an AI that actually knows their academic position.*

## 3. Beachhead Ladder (in order — do not skip rungs)

| Rung | Who | Why | Sales motion | Proves |
|------|-----|-----|-------------|--------|
| 1 | **Private/independent schools, career colleges, tutoring academies, continuing-ed programs (BC first)** | Owner/director decides in weeks; underserved by Moodle/Google-Classroom duct tape; Axis self-onboarding + CSV/PDF catalog import fits exactly | Demo → 1-term free pilot → paid | Willingness to pay; onboarding works without hand-holding |
| 2 | **Students directly at UVic (planner wedge)** | The origin problem; zero procurement; PDF catalog import lets students self-serve degree planning beside Brightspace | Free tool → word of mouth → usage data | Demand evidence for the institutional pitch ("N UVic students use this weekly") |
| 3 | **One university department/advising office pilot** | Warm door (the UVic engineer who liked the idea); departments can pilot without campus-wide RFP | Warm intro → scoped pilot → reference customer | Institutional viability, PIA/privacy process experience |
| 4 | **Institutional sales** | Only after 1–3 produce references + revenue | RFP game (see §6) | Scale |

*Unverified, to research when rung 1 starts: BC independent-school associations (e.g. FISA BC) as channel; list of BC career colleges/tutoring chains.*

## 4. Outreach System — CASL-Compliant (Canada)

**The law (this section is compliance — read carefully):**
Canada's Anti-Spam Legislation (CASL) is the strictest commercial-email law in the world. Penalties: up to **$1M CAD (individuals) / $10M CAD (organizations) per violation**. Cold B2B email is legal only under **implied consent**: the recipient's address was conspicuously published (or given to you), there is no statement declining commercial messages, and your message is relevant to their business role. Every commercial message must identify the sender, include valid contact info, and provide a working unsubscribe honoured within 10 business days. You must be able to prove the consent basis for every contact you hold. Sources: [CRTC implied-consent guidance](https://crtc.gc.ca/eng/com500/guide.htm), [CASL cold-email guide 2026](https://litemail.ai/blog/casl-cold-email-canada-guide-2026), [Canadian Chamber of Commerce](https://chamber.ca/resources/canadas-anti-spam-legislation/).

**Practical rules for Axis:**
1. **Warm before cold, always.** Order: UVic engineer contact → profs/TAs Shaafi knows → student clubs → BC edtech meetups/associations → then compliant cold email.
2. **Never mass-scrape emails into a blast list.** Scraping public directories for *research/demo modeling* is fine (light volume, respect robots.txt). Scraping to *email* creates CASL exposure and burns reputation.
3. **Cold email format** (when used): individually sent, role-relevant, and:
   - Subject = the specific problem ("Office-hours booking at [school] is still email ping-pong")
   - ≤5 sentences: problem observed → what Axis does differently (1 line) → proof (live demo link) → small ask (15 min)
   - Signature: full name, role, contact + unsubscribe line ("Reply 'no thanks' and I won't email again" satisfies the mechanism if honoured)
   - Log consent basis (`implied — published address`) in the tracker before sending.

**Lead tracker (Notion or HubSpot free tier — decision: do NOT build our own yet):**

| Column | Values |
|--------|--------|
| Institution / Org | text |
| Type | private school / career college / tutoring / continuing-ed / university dept / student group |
| Contact + Role | text |
| Email + Source URL | where the address was published |
| **Consent basis** | implied-published / implied-existing-relationship / express / none-do-not-email |
| Stage | research → contacted → replied → demo → pilot → closed-won / closed-lost |
| Next action + date | text |
| Notes | pain points, objections, champions |

**Why not build the CRM:** every engineering hour goes to the product until the product has users. Revisit at 50+ active leads. Shaafi's larger idea — an internal ops console (superuser → roles/permissions → feature tabs) — is architecturally sound and fits the existing multi-tenant + roles system; parked here so it isn't lost. An `.md` + Notion covers the next 6 months.

## 5. Cold-Email Skeleton (adapt per rung)

```
Subject: [specific pain] at [their org]

Hi [name] — I'm Shaafi, a UVic student. I built Axis after watching [specific pain:
students juggle Brightspace + prof websites + email to book office hours / advising
appointments booked out 3 weeks].

Axis is an AI-native LMS: one feed, office-hours booking built in, and an AI planner
that knows each student's degree progress. [1 proof point: live demo / pilot result].

Would a 15-minute look be useful? If not, reply "no thanks" and I won't follow up.

Shaafi Jahangir — Founder, Axis
[email] · [demo URL]
```

## 6. University Route — Legal & Procurement Primer

*(Mentor-lawyer mode. Research-backed guidance, **not legal advice** — flagged below where a real lawyer is mandatory.)*

**Procurement reality:** successful sellers engage 6–18 months before an RFP exists ([Starbridge](https://starbridge.ai/blog/sled-sales)); typical path is champion → IT/security review → legal/contract → pilot → purchase, 9–12 months end-to-end ([Chop Dawg breakdown](https://www.chopdawg.com/how-to-build-an-edtech-app-that-schools-and-universities-will-actually-adopt/), [HEP procurement guide](https://hepinc.com/newsroom/understanding-the-procurement-process/)). Strategy: skip the RFP at first — a department-level pilot under discretionary spending limits, converted to a reference.

**Privacy law that governs us in Canada:**
- **PIPEDA** (federal) — applies to Axis as a private company handling personal information commercially: consent, purpose limitation, safeguards, breach reporting.
- **BC FIPPA** — applies to *public bodies* (UVic). Bill 22 (Nov 2021) removed the old blanket "store personal data in Canada only" rule and replaced it with a privacy-impact-assessment regime; "sensitive" personal information disclosed for storage outside Canada requires a prescribed PIA. Sources: [BC gov data-residency summary](https://www2.gov.bc.ca/assets/gov/british-columbians-our-governments/services-policies-for-government/information-management-technology/information-privacy/resources/2021-amendments/foippa_amendments_data_residency.pdf), [UBC Privacy Matters on Bill 22](https://privacymatters.ubc.ca/resources/bill22), [BLG analysis](https://www.blg.com/en/insights/2022/01/changes-to-bcs-public-sector-privacy-legislation), [McCarthy Tétrault](https://www.mccarthy.ca/en/insights/blogs/techlex/british-columbia-unveils-significant-changes-fippa-including-new-data-sovereignty-rules).
- **Practical consequence:** expect every BC institution to run a **PIA** on Axis before any pilot with real student data ([UBC's process as example](https://lddi.educ.ubc.ca/student-privacy-fippa/)). Hosting in a **Canadian region** (Render/AWS ca-central-1, Cloudflare R2 with jurisdiction controls) removes the hardest questions before they're asked. Decide hosting region with this in mind at deploy time.
- **FERPA** (US) — only when selling to US institutions; SECURITY.md already tracks it.

**When a real lawyer is mandatory (not optional):** signing any institutional contract or data-processing agreement; before storing real (non-demo) student PII in production; incorporation + founder liability; anything involving minors' data (K-12 rung).

## 7. Metrics That Matter (per rung)

- Rung 1: demos booked → pilots started → pilot-to-paid conversion; time-to-onboard a school (target: <1 day via CSV/PDF import).
- Rung 2: weekly active students; plans generated; % returning weekly; unsolicited shares.
- Rung 3: PIA passed (binary); pilot renewal; named reference approved.

## 8. Current Next Actions

1. ✅ Field research → [shaafilook.md](./shaafilook.md)
2. ⬜ End-to-end self-test of the product (all 4 roles)
3. ⬜ Office-hours booking feature (FEAT-018 — PR in progress)
4. ⬜ Deploy (Render; Canadian region decision per §6)
5. ⬜ Demo tenant with UVic-shaped data
6. ⬜ Set up lead tracker (Notion/HubSpot free)
7. ⬜ 2–3 min demo video + polish `/`, `/features`, `/about`
8. ⬜ First 10 warm conversations (start: UVic engineer — "built the thing we discussed, want a look?")
