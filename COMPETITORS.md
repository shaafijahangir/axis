# Steal these 10 features, then beat them

Researched 2026-10-30 across 4 note sets covering 30+ products. The single biggest opening: **no competitor combines a real course engine, a Skool grade engagement loop, and a tutor grounded in course content on every plan.** Incumbent AI stops at drafts (Teachable makes an outline only, Thinkific's builder produces empty lesson shells) and learner tutors are paywalled (Thinkific Plus only, Kajabi's Teaching Assistant still "coming soon") ([Coursebox](https://www.coursebox.ai/blog/thinkific-vs-teachable); [Learning Revolution](https://www.learningrevolution.net/kajabi-review/)). Axis already has the hard parts (Socratic Study Coach, Feedback Copilot, Agent Builder, LTI 1.3, multi tenant). What it lacks is the glue the market rewards: a SpeedGrader class grading surface, conditional release and rule based nudges, a live teacher view of AI tutor chats, a per assignment AI policy, outcome based gamification, and an MCP server. Canvas holds **50% of North American higher ed enrollments** and its top complaint is notifications (**54% of 174 Capterra mentions negative**), so the beatable gaps are UX and trust, not feature count ([Phil Hill](https://onedtech.philhillaa.com/p/state-of-higher-ed-lms-market-for-us-and-canada-year-end-2024-edition); [Capterra Canvas](https://capterra.com/p/127214/CANVAS/)).

Axis status note: the brief's module list was cross checked against `axis-backend/src`, which also has `quiz`, `discussions`, `attendance`, `calendar`, `notifications`, `office-hours`, `parent`, `report-cards`, `uploads`. Those count as Have or Partial below. Depth of each module was not audited, so "Have" means the module exists, not that it matches the competitor.

## 1. Verdict: top 10 to steal first

| # | Feature | Steal from | Why first |
|---|---|---|---|
| 1 | Live class view of AI tutor chats (live transcripts, strengths and gaps summary, auto grouping) | SchoolAI Mission Control | Turns Study Coach from a student toy into a teacher tool; MagicSchool is criticized for showing summaries, not full prompts ([SchoolAI](https://schoolai.com/spaces); [GPTZero](https://gptzero.me/news/magicschool-ai-review)) |
| 2 | Fast grading surface plus AI draft feedback per rubric row | Canvas SpeedGrader, D2L Lumi Feedback | SpeedGrader is Canvas's most named feature; Lumi keeps AI grades as drafts until published ([Capterra](https://capterra.com/p/127214/CANVAS/reviews/); [TCU](https://cte.tcu.edu/d2l-lumi-ai-tools/)) |
| 3 | Per assignment AI policy (4 levels, "no AI" to "full Copilot") wired to Study Coach behaviour | Microsoft Education Assignments | Cheap to build, becomes a norm, and Axis can enforce it, not just display it ([EdTech Innovation Hub](https://www.edtechinnovationhub.com/news/microsoft-adds-ai-teaching-tools-to-365-education-as-classroom-use-rises)) |
| 4 | Release conditions plus rule based nudges ("no login in 7 days") as a visual rule builder | Brightspace Release Conditions and Intelligent Agents, Moodle restrict access | The depth differentiator in institutional LMSs; Axis can add AI written nudge text ([D2L Fusion 2026](https://www.d2l.com/whats-new-from-fusion-2026/)) |
| 5 | Agent that previews its plan before acting across the platform's APIs | Canvas IgniteAI Agent | Canvas connects to 500+ APIs with preview and check; Axis's Agent Builder is the base ([Constellation Research](https://www.constellationr.com/insights/news/instructure-launches-igniteai-agent-canvas-builds-amazon-bedrock)) |
| 6 | Teacher in the loop question generation from course content, Bloom aligned, into a question bank | D2L Lumi Pro, Khanmigo Practice My Knowledge | Teachers review, edit or reject each item; feeds `quiz` ([D2L KB](https://community.d2l.com/brightspace/kb/articles/26142-d2l-lumi-pro-for-brightspace-quiz-question-generation-overview); [EdTech Innovation Hub](https://www.edtechinnovationhub.com/news/khan-academy-brings-gemini-powered-visual-tutoring-into-classrooms-for-2026)) |
| 7 | Outcome based gamification: XP, levels that unlock content, streak with freeze, weekly leagues | Skool, Duolingo, Boot.dev | Skool's level gated content is its moat, but it rewards posting; Axis can reward verified learning ([Tools4Skool](https://tools4skool.com/skool/skool-2026); [Duolingo](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo)) |
| 8 | MCP server exposing Axis to Claude, ChatGPT, Copilot | Docebo, Degreed, Kajabi, Circle | 4 competitors shipped one in 2025 to 2026; low effort for a GraphQL backend ([Docebo April 2026](https://www.docebo.com/whatsnew/2026-april/); [IT Brief](https://itbrief.com.au/story/degreed-unveils-ai-tools-to-close-human-readiness-gap)) |
| 9 | In browser code runner with a context aware tutor that sees instructions, learner code and solution | Codecademy, Boot.dev, Scrimba, Expo Snack | Needed for the React Native course; Expo Snack is MIT and embeddable ([Codecademy Help](https://help.codecademy.com/hc/en-us/articles/23400751016859-AI-Features-available-on-Codecademy); [expo/snack](https://github.com/expo/snack)) |
| 10 | Calm notifications: daily digest, one channel, per course controls | Fix for Canvas's top complaint; Circle Weekly Digest | Axis has a `notifications` module and an AI ranked feed already; a digest is a small step ([Capterra Canvas](https://capterra.com/p/127214/CANVAS/); [GroupApp](https://www.group.app/blog/circle-vs-mighty-networks/)) |

## 2. Feature catalogue

### Teaching and content

| Feature | Who has it | What it does | Axis status | Make it better |
|---|---|---|---|---|
| Edit once, sync everywhere content | D2L Createspace (GA Dec 2026) | Reusable content with version control; edits sync to every course using it ([D2L](https://www.d2l.com/whats-new-from-fusion-2026/)) | Missing | Tenant wide content library, with AI flagging courses where a synced edit breaks an assessment |
| Conditional release | Brightspace, Moodle, Canvas Mastery Paths | Unlock on grade, completion, date, group ([D2L](https://www.d2l.com/whats-new-from-fusion-2026/)) | Missing | Visual rule builder; let Study Coach unlock remediation automatically |
| Interactive content (H5P) | Brightspace Creator+, Moodle core | Interactive video, branching, practice with retries ([D2L](https://www.d2l.com/whats-new-from-fusion-2026/)) | Partial (Tiptap rich text) | Tiptap blocks for in-line checks generated by AI from the lesson |
| Interactive video that pauses for quizzes | LearnWorlds | Mid lesson questions pause playback; branching paths ([AIFunnelInsider](https://aifunnelinsider.com/learnworlds-review-2026/)) | Missing | Auto generate pause points from the transcript |
| Verified completion | Mighty Networks Tracked Video (90% watched) | Completion requires real watch time; Thinkific Basic marks complete on click ([GroupApp](https://www.group.app/blog/circle-vs-mighty-networks/); [Coursebox](https://www.coursebox.ai/blog/thinkific-vs-teachable)) | Unknown | Complete only after a passed check, not watch time |
| Event recorded screencasts ("scrims") | Scrimba | Records editor events, not pixels, about 1% of video size; learner edits the instructor's code mid playback ([SurviveJS](https://survivejs.com/blog/scrimba-interview/)) | Missing | Pair with the code runner; tutor can jump to the exact timestamp |
| Document to course generation | Sana, Absorb Create, Arist Sidekick, Thinkific | PDFs and docs into a course; Sana claims "3 weeks to 3 hours" (vendor) ([Sana](https://www.courseplatformsreview.com/blog/sana-learn-review/)) | Partial (Course Planner) | Output finished, assessable lessons, not shells |
| Lesson audio and TTS | Boot.dev | Audio player with speed and scrub on every lesson ([Boot.dev Jul 2026](https://www.boot.dev/blog/news/bootdev-beat-2026-07)) | Missing | Reuse the voice teacher's voice |
| Source grounded audio and video overviews | NotebookLM | Narrated video overviews and flashcards from sources with citations ([Google](https://blog.google/technology/google-labs/notebooklm-student-features/); [Analytics Vidhya](https://www.analyticsvidhya.com/blog/2025/10/notebooklm-features/)) | Missing | One click per section, cited back to Axis content |
| Voice preserving dubbing | Coursera | About 600 courses dubbed with original voice and lip sync ([Gulf Business](https://gulfbusiness.com/en/2026/education/coursera-ceo-greg-hart-on-ai-and-learning-trends/)) | Missing | Later; translation of text content first |
| Localized metadata | Docebo | One course, title shown in each learner's language ([Docebo](https://www.docebo.com/whatsnew/2026-april/)) | Missing | Cheap win for multi tenant |

### Grading and assessment

| Feature | Who has it | What it does | Axis status | Make it better |
|---|---|---|---|---|
| Fast inline grader | Canvas SpeedGrader, Moodle 5.1 grader panel | Review, comment, rubric in one pane ([Capterra](https://capterra.com/p/127214/CANVAS/reviews/); [Moodle 5.1](https://docs.moodle.org/501/en/New_Features)) | Partial (assignments grading) | Keyboard first, Feedback Copilot draft prefilled per rubric row |
| AI rubric generator | Canvas IgniteAI, Blackboard (2,000 char prompt), Gemini in Classroom | Rubric from a description or file ([USNH](https://td.usnh.edu/TDClient/60/Portal/KB/ArticleDet?ID=5404); [Marshall](https://www.marshall.edu/ai/blackboard-ai-design-assistant/)) | Partial (Feedback Copilot uses rubrics) | Generate from the assignment prompt plus past graded work |
| AI feedback as draft | D2L Lumi Feedback, MagicSchool Class Writing Feedback | Drafts stay unpublished until teacher edits ([TCU](https://cte.tcu.edu/d2l-lumi-ai-tools/); [fast.io](https://www.fast.io/resources/magic-ai-review-2026.md)) | Have (Feedback Copilot) | Cite the rubric row and the student's text for each comment |
| Question bank with AI generation | D2L Lumi Pro (1 to 10 per batch, Bloom aligned), Canvas New Quizzes | Generated into the question library ([D2L KB](https://community.d2l.com/brightspace/kb/articles/26142-d2l-lumi-pro-for-brightspace-quiz-question-generation-overview)) | Partial (`quiz` module) | Review, edit, reject flow like Khanmigo; tag items to outcomes |
| Wrong answer study support | D2L Lumi Study Support, NotebookLM "explain" | Topics and feedback from wrong answers, with citations ([TCU](https://cte.tcu.edu/d2l-lumi-ai-tools/); [Google](https://blog.google/technology/google-labs/notebooklm-student-features/)) | Missing | Hand straight to Study Coach with the attempt as context |
| Multi evaluator group grading | Brightspace Fusion 2026 | Delegated marking, co marking on group work ([D2L](https://www.d2l.com/whats-new-from-fusion-2026/)) | Missing | Later, for TAs |
| Learner quiz tools | Brightspace | Bookmark questions, strike through choices ([D2L](https://www.d2l.com/whats-new-from-fusion-2026/)) | Unknown | Tiny, ship with quiz UI |
| Gradebook with drop lowest, categories | Brightspace | Category rules ([TrustRadius](https://www.trustradius.com/reviews/d2l-brightspace-2023-09-13-19-20-28)) | Partial (`report-cards`) | Audit trail on every grade change (fixes Blackboard's top complaint) |
| Writing process inspection | Brisk Inspect Writing | Shows how a student doc was written ([Ditch That Textbook](https://ditch.beehiiv.com/p/4-6-2026)) | Missing | Record Tiptap edit history on submissions |
| AI role play with rubric scoring | Docebo (Jul 2026), LinkedIn Learning, Blackboard AI Conversation | Scenario practice; rubric plus manager or instructor review of transcripts ([Docebo](https://www.docebo.com/whatsnew/2026-april/); [Aberystwyth](https://wordpress.aber.ac.uk/e-learning/2025/05/01/whats-new-in-blackboard-may-2025/)) | Partial (Agent Builder) | Template in Agent Builder: persona, rubric, reflection question |

### AI tutor

| Feature | Who has it | What it does | Axis status | Make it better |
|---|---|---|---|---|
| Socratic, no answer mode | Khanmigo, PowerBuddy, ChatGPT Study Mode, Claude Learning mode | Guides step by step instead of answering ([PowerSchool](https://help.powerschool.com/t5/Schoology-Learning-Adoption/Schoology-PowerBuddy-for-Learning-Guide/ta-p/572539); [Engadget](https://www.engadget.com/ai/chatgpts-study-mode-will-guide-students-to-an-answer-stey-by-step-180614172.html)) | Have (Study Coach) | Make it opt out proof; study modes "only work if you stop cheating" ([BGR](https://bgr.com/1926772/how-to-use-chatgpt-study-mode)) |
| Context aware of exact lesson and code | Codecademy | Sees course, instructions, solution and learner code ([Codecademy](https://help.codecademy.com/hc/en-us/articles/23400751016859-AI-Features-available-on-Codecademy)) | Partial | Pass current Tiptap block, attempt history and runner state |
| Friction before asking | Boot.dev | Asking before finishing costs 50% of lesson XP ([Boot.dev](https://www.boot.dev/lessons/e4fac74c-9d67-41ad-a85c-c579cb3ad76f)) | Missing | Tie to the per assignment AI policy |
| Interactive visual tutoring | Khanmigo (Sep 2026) | Generates draggable diagrams; adapts when student moves a vertex ([EdTech Innovation Hub](https://www.edtechinnovationhub.com/news/khan-academy-brings-gemini-powered-visual-tutoring-into-classrooms-for-2026)) | Missing | Later; start with rendered code and charts |
| Realtime voice tutor with memory | Duolingo Video Call (Lily), Boot.dev calls with Boots | Remembers earlier calls, transcript afterward ([Duolingo](https://blog.duolingo.com/duolingo-max); [Boot.dev Oct 2025](https://www.boot.dev/blog/news/bootdev-beat-2025-10)) | Planned (voice AI teacher) | Put the call as a node on the course path, transcript goes to the teacher view |
| Learner mode inside content | D2L Lumi Learner Mode (beta Sep 2026) | Notes, highlights, knowledge checks, tutoring inside the LMS ([D2L](https://www.d2l.com/newsroom/d2l-announces-new-ai-enhanced-content-creation-and-personalized-learning-at-fusion-2026/)) | Partial | Highlight any text to ask Study Coach |
| Student flashcards and quizzes from course materials | Gemini in Classroom (Aug 2026), NotebookLM | Teacher enables; student picks materials ([Workspace Updates](https://workspaceupdates.googleblog.com/2026/08/gemini-in-google-classroom-is-expanding-to-users-of-all-ages-with-contextualized-Gemini-starter-prompts-for-students.html)) | Missing | Schedule them as spaced repetition |
| Course specific Q&A ("when is it due") | Canvas IgniteAI Agent | Students ask logistics questions ([Constellation](https://www.constellationr.com/insights/news/instructure-launches-igniteai-agent-canvas-builds-amazon-bedrock)) | Partial (feed, planner) | Answer from calendar, assignments and announcements in one call |
| Tutor impact metric | Khan Academy | "Next item correctness" on same skill, unassisted ([EdTech Innovation Hub](https://www.edtechinnovationhub.com/news/khan-academy-brings-gemini-powered-visual-tutoring-into-classrooms-for-2026)) | Missing | Compute from attempts, show per course |

### Teacher AI tools

| Feature | Who has it | What it does | Axis status | Make it better |
|---|---|---|---|---|
| Many one click generators, no prompt writing | MagicSchool (80+), Eduaide (80+), Brisk (about 40) | Lesson plans, quizzes, levelers, exit tickets; teachers report 7 to 10 hours saved per week ([fast.io](https://www.fast.io/resources/magic-ai-review-2026.md)) | Partial (Course Planner, Agent Builder) | Generators that write straight into the course, not into a copy paste box |
| Teacher designed student AI spaces | SchoolAI Spaces, MagicStudent Rooms | Templates: Bellringer, Exit Ticket, Historic Figure ([SchoolAI](https://schoolai.com/spaces)) | Partial (Agent Builder) | Ship 8 templates; students see them inside the course |
| Live monitoring plus gap grouping | SchoolAI Mission Control | Live chats, post session strengths and gaps, auto grouping ([SchoolAI](https://schoolai.com/spaces)) | Missing | Full transcripts plus summary; push groups into sections |
| Class misconceptions view | Khan Academy redesign | Which concepts a class most misunderstands, from tutor data ([EdTech Innovation Hub](https://edtechinnovationhub.com/news/khan-academy-redesigns-classroom-platform-as-ai-tools-move-further-into-daily-teaching)) | Missing | Feed into home feed for teachers |
| Content remix and leveling | D2L Lumi Remix, MagicSchool Text Leveler | Retarget audience, translate ([D2L](https://www.d2l.com/newsroom/d2l-announces-new-ai-enhanced-content-creation-and-personalized-learning-at-fusion-2026/)) | Missing | Publish accuracy per tool; Leveler misses grade at times ([Educators Technology](https://www.educatorstechnology.com/2026/02/magicschool-ai-review.html)) |
| Safety layer | SchoolAI, MagicSchool | Crisis flags, alert routing, no human persona; MagicSchool retired "Raina" persona Feb 2026 ([SchoolAI](https://schoolai.com/spaces); [Educators Technology](https://www.educatorstechnology.com/2026/02/magicschool-ai-review.html)) | Unknown | Required before K12 sales |
| Works inside other tools | Brisk extension | Runs in Docs, Slides, Classroom, Canvas ([Ditch That Textbook](https://ditch.beehiiv.com/p/4-6-2026)) | Partial (LTI 1.3) | Later browser extension; LTI covers in LMS case |
| AI nutrition labels | Ithaca College for IgniteAI | Per feature disclosure ([Ithaca](https://help.ithaca.edu/TDClient/34/Portal/KB/ArticleDet?ID=2196)) | Missing | Ship one per agent; procurement teams love it |

### Engagement and gamification

| Feature | Who has it | What it does | Axis status | Make it better |
|---|---|---|---|---|
| Points, levels unlock content | Skool | Points from likes and replies; levels unlock courses ([CreatorOpsMatrix](https://creatoropsmatrix.com/gohighlevel-vs-skool/)) | Missing | Points from verified learning, not likes |
| Streak plus freeze | Duolingo, Brilliant | Freeze covers one missed day ([Duolingo](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo)) | Missing | Earn freezes by effort; long streak loss drives churn ([WebProNews](https://www.webpronews.com/duolingos-ai-shift-sparks-backlash-user-exodus-despite-revenue-growth)) |
| Weekly leagues | Duolingo (10 tiers), Mighty (Feb 2026) | Weekly XP leaderboards ([Duolingo](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo)) | Missing | Opt in per course; off by default in K12 |
| Quests | Boot.dev, Duolingo Side Quests | Bonus XP for goals or roleplay ([Boot.dev](https://boot.dev/blog/news/bootdev-beat-october-2022); [Duolingo](https://blog.duolingo.com/duolingo-max)) | Missing | Quests generated from planner goals |
| Certificates with expiry | LearnWorlds, Thinkific | Branded, expiring certs ([AIFunnelInsider](https://aifunnelinsider.com/learnworlds-review-2026/)) | Missing | Verifiable link; Circle and Mighty have none |
| Completion celebrations | Boot.dev completion orbs | Visual payoff ([Boot.dev Jul 2026](https://www.boot.dev/blog/news/bootdev-beat-2026-07)) | Unknown | Small, ship with gamification |
| Weekly digest email | Circle | Re engagement on all plans ([GroupApp](https://www.group.app/blog/circle-vs-mighty-networks/)) | Partial (`notifications`) | AI ranked like the feed |

### Community and cohorts

| Feature | Who has it | What it does | Axis status | Make it better |
|---|---|---|---|---|
| Six tab community (Feed, Classroom, Calendar, Leaderboard, Members, Chat) | Skool | Simple, one place ([Tools4Skool](https://tools4skool.com/skool/skool-2026)) | Partial (feed, courses, calendar, messaging, discussions) | Add leaderboard and member directory |
| Live cohorts | Maven | 2 to 6 weeks, 1 to 3 sessions a week, 20 to 200 peers ([SkillScouter](https://skillscouter.com/maven-review/)) | Missing | Async AI recap plus peer pods by timezone (fixes Maven's timezone complaint) |
| Live rooms, breakouts, events with RSVP and local time reminders | Circle, Skool, Mighty | Up to 500 on Mighty livestreams ([Learning Revolution](https://www.learningrevolution.net/circle-review/); [GroupApp](https://www.group.app/blog/circle-vs-mighty-networks/)) | Partial (calendar, office hours) | Office hours booking already beats most; add recording plus AI recap |
| Workflow automations | Circle (20 on Business), Disco | Welcome messages, tag based access, badges ([Learning Revolution](https://www.learningrevolution.net/circle-review/)) | Missing | Same rule builder as release conditions |
| AI member matchmaking | Mighty Networks | Suggests peers ([Ecommerce Platforms](https://ecommerce-platforms.com/articles/mighty-networks-vs-circle)) | Missing | Match by complementary skill gaps |
| AI engagement nudges and suggested replies | Disco | Nudges, suggested questions ([Disco](https://www.disco.co/features/ai-learning-assistants-for-modern-training)) | Missing | Act on at risk signals; Mighty explicitly does "AI for setup, not operations" ([GroupApp](https://www.group.app/blog/circle-vs-mighty-networks/)) |
| Discussion insights and summaries | Canvas IgniteAI | Scores replies for substance; summaries capped at 25 a day ([USNH](https://td.usnh.edu/TDClient/60/Portal/KB/ArticleDet?ID=5404)) | Partial (`discussions`) | No daily cap |

### Selling and monetization (for Axis's own school)

| Feature | Who has it | What it does | Axis status | Make it better |
|---|---|---|---|---|
| Free live sampler into paid cohort | Maven Lightning Lessons | 30 to 45 min free workshops as funnel; cohorts $500 to $3,500 ([SkillScouter](https://skillscouter.com/maven-review/)) | Missing | Voice AI teacher runs free mini lessons 24/7 |
| Checkout with order bumps, payment plans, coupons | Kajabi, Thinkific, Circle | Standard checkout stack ([Learning Revolution](https://www.learningrevolution.net/kajabi-review/)) | Missing | Stripe first; nothing exotic |
| Tax calculation and remittance | Teachable | Merchant of record style ([Coursebox](https://www.coursebox.ai/blog/thinkific-vs-teachable)) | Missing | Use a merchant of record provider, do not build |
| Affiliates that pay out | Teachable, Skool | Track and pay automatically; Thinkific tracks only ([Coursebox](https://www.coursebox.ai/blog/thinkific-vs-teachable)) | Missing | Later |
| Team seat discounts | Maven | 20% for 2 to 10 seats, 25% for 11+ ([SkillScouter](https://skillscouter.com/maven-review/)) | Missing | Cheap B2B wedge into tenant sales |
| Single contact record across email, checkout, courses | Kajabi | One CRM for everything ([Learning Revolution](https://www.learningrevolution.net/kajabi-review/)) | Partial (users) | Learner profile already exists; add purchase history |
| Discovery marketplace | Skool Discovery, Circle Discover | Platform drives signups ([Tools4Skool](https://tools4skool.com/skool/skool-2026)) | Missing | Only if Axis hosts other creators |
| Branded mobile app | Kajabi Pro, Docebo publisher | No code branded app ([Docebo](https://www.docebo.com/whatsnew/2026-april/)) | Partial (`axis-mobile` exists) | Included, not a $149 to $199 add-on like LearnWorlds and Thinkific |

### In browser code and terminal

| Feature | Who has it | What it does | Axis status | Make it better |
|---|---|---|---|---|
| React Native live preview | Expo Snack (MIT) | `snack-sdk` builds custom embeds; used by React Native docs ([expo/snack](https://github.com/expo/snack)) | Planned | Best fit for the React Native course; pick this first |
| Front end sandbox | Sandpack (Apache 2.0) | Embeddable editor and preview; Nodebox runtime has commercial restrictions ([Sandpack FAQ](https://sandpack.codesandbox.io/docs/resources/faq)) | Planned | Use for web lessons, avoid Nodebox templates |
| In browser Node runtime | StackBlitz WebContainers | Best in class, but commercial use needs a paid license with no public price ([aicoolies](https://aicoolies.com/pricing/webcontainers)) | Planned | Skip until revenue justifies a sales call |
| Real shell in browser | Boot.dev Linux course | Course grade terminal shipped Jul 2026 ([Boot.dev](https://www.boot.dev/blog/news/bootdev-beat-2026-07)) | Planned | xterm.js front end plus container over WebSocket |
| Server side code execution | Judge0 (GPL 3.0) | Self host about $15 to $20/mo on 4 vCPU, 8 GB; isolate the network ([unsubbed](https://unsubbed.pages.dev/tools/judge0-ce/); [Judge0 docs](https://docs.judge0.com/products/judge0/get_started/self_hosting)) | Missing | Run as a separate service; confirm GPL position with a lawyer |
| One click formatter | Boot.dev | gofmt, Ruff, Prettier style formatting ([Boot.dev](https://www.boot.dev/blog/news/bootdev-beat-2026-07)) | Missing | Trivial with Prettier |
| AI generated practice challenges | Boot.dev Training Grounds | Generated drills; detects wrong challenge submissions ([Boot.dev](https://blog.boot.dev/news/training-grounds-launch)) | Missing | Generate from the learner's own failed attempts |

### Admin, multi tenant, integrations

| Feature | Who has it | What it does | Axis status | Make it better |
|---|---|---|---|---|
| Sub portals per client | TalentLMS branches | Own branding and users; tier gated ([toolradar](https://toolradar.com/tools/talentlms/pricing)) | Have (tenant management) | District, school, class tenancy native and never upsold |
| MCP server | Docebo (GA Jul 2026), Degreed, Kajabi, Circle | LMS content and records inside Claude and ChatGPT ([Docebo](https://www.docebo.com/whatsnew/2026-april/); [IT Brief](https://itbrief.com.au/story/degreed-unveils-ai-tools-to-close-human-readiness-gap)) | Missing | Expose Agent Builder agents as MCP tools too |
| AI toggles per course and activity, BYO provider | Moodle 5.1 | OpenAI, Azure, DeepSeek; on or off per course and activity; AI policy acceptance ([Moodle 5.1](https://docs.moodle.org/501/en/New_Features)) | Unknown | Per tenant provider plus per assignment policy |
| Admin early access switch | Docebo Launch Pad | Admins enable beta features themselves ([Docebo](https://www.docebo.com/whatsnew/2026-april/)) | Missing | Feature flags per tenant |
| LTI app catalog with automated setup | Brightspace Apps | Clear permissions ([D2L](https://www.d2l.com/whats-new-from-fusion-2026/)) | Partial (LTI 1.3) | Curated catalog |
| LTI out: Axis tools inside other LMSs | Microsoft 365 LTI | Copilot and assignments inside third party LMSs ([EdTech Innovation Hub](https://www.edtechinnovationhub.com/news/bett-2026-microsoft-outlines-major-ai-copilot-and-classroom-updates-across-education-stack)) | Partial | Ship Study Coach as an LTI tool for Canvas schools: a land and expand wedge |
| SSO and rostering | MagicSchool (Google, Microsoft, Clever, ClassLink) | District sign in and sync ([fast.io](https://www.fast.io/resources/magic-ai-review-2026.md)) | Partial (Google OAuth) | Add Microsoft, Clever, ClassLink |
| Parent accounts | Schoology, Classroom guardian summaries | Parents see grades ([Capterra](https://capterra.com/p/128481/Schoology/reviews/)) | Have (`parent`) | AI weekly parent summary |
| Message channel delivery | Arist | Learning over SMS, Slack, Teams, WhatsApp ([Josh Bersin](https://joshbersin.com/podcast/ai-arrives-in-corporate-learning-welcome-to-arist/)) | Missing | Nudges and parent alerts over SMS |
| Compliance and privacy proof | SchoolAI (FERPA, COPPA, SOC 2 Type 2), MagicSchool | Badges procurement checks ([SchoolAI](https://schoolai.com/spaces)) | Partial (COMPLIANCE.md exists) | Publish a plain data sharing stance |

### Analytics

| Feature | Who has it | What it does | Axis status | Make it better |
|---|---|---|---|---|
| Activities overview | Moodle 5.1 | Dates and forum post counts across a course ([Moodle 5.1](https://docs.moodle.org/501/en/New_Features)) | Partial (admin analytics) | Per teacher, not just admin |
| Engagement dashboard and at risk alerts | Brightspace Class Progress, Intelligent Agents | Rule based emails on inactivity ([D2L](https://www.d2l.com/whats-new-from-fusion-2026/)) | Partial | Predicted risk plus one click nudge drafted by AI |
| Conversation analytics | LinkedIn Learning role play | Top scenarios and conversation stats ([LinkedIn](https://tcommunity.linkedin.com/community-news-72/build-human-skills-at-the-speed-of-change-with-ai-powered-role-play-2773)) | Missing | Per agent usage and quality |
| AI uptake tracking | None do it well | Khanmigo reportedly saw about 15% regular student use ([aitoolsbakery](https://aitoolsbakery.com/blog/khanmigo-review/), unverified) | Missing | Instrument from day one |
| Skills and outcomes mapping | Cornerstone SkyHive, Degreed, D2L Lumi Outcomes | Map content to skills or outcomes ([Cornerstone](https://www.cornerstoneondemand.com/resources/article/powering-human-growth-in-the-age-of-ai/)) | Partial (planner) | Mastery per outcome feeds grouping and planner |

## 3. Top complaints about competitors = openings for Axis

| Complaint | Competitor | Evidence | Axis opening |
|---|---|---|---|
| Notification overload | Canvas | 54% of 174 Capterra notification mentions negative ([Capterra](https://capterra.com/p/127214/CANVAS/)) | AI ranked digest, one channel |
| Gradebook you cannot trust | Blackboard Ultra | Professor: "I just make an Excel"; UCA logged data loss and test failures ([MCCC Voice](https://www.mcccvoice.org/ultra/); [UCA](https://uca.edu/lmsreview/vendors/)) | Grade audit trail, visible to students |
| Content buried in folders | Brightspace | r/USC thread ([Reddit mirror](https://nyc1.lr.ggtyler.dev/r/USC/comments/1fckbi2/brightspace_is_awful/lmbiv4s/?context=3)) | Flat structure plus semantic search |
| Core features paywalled | Schoology, Kajabi, Thinkific | Enterprise gating; Thinkific tutor on Plus only; Kajabi Jan 2026 hikes to $179 to $499 ([Capterra](https://capterra.com/p/128481/Schoology/reviews/); [Learning Revolution](https://www.learningrevolution.net/kajabi-review/)) | AI tutor and gamification on every plan |
| AI free trials ending, then add ons | Canvas, Anthology | Free windows ended June 30, 2026 ([Instructure](https://community.instructure.com/en/discussion/664480/igniteai-agent-release-notes-2026-01-17); [BusinessWire](https://www.businesswire.com/news/home/20250715336285/en)) | Transparent per student price including AI |
| Opaque AI credits | Kajabi, Circle, Docebo, TalentLMS | Credits by tier, top ups ([Learning Revolution](https://www.learningrevolution.net/kajabi-review/)) | Credits only as an internal cost cap, never a learner blocker |
| AI builders produce shells | Thinkific, Teachable | Empty lessons, course renamed twice ([Coursebox](https://www.coursebox.ai/blog/thinkific-vs-teachable)) | Finished, assessable lessons |
| Shallow student chatbots, weak logs | MagicSchool | Superficial chats; teachers want full prompts ([Ditch That Textbook](https://ditch.beehiiv.com/p/4-6-2026); [GPTZero](https://gptzero.me/news/magicschool-ai-review)) | Deep Study Coach plus full transcripts |
| Thin course tools on community apps | Skool, Circle, Mighty | No quizzes, certificates or graded work ([Tools4Skool](https://tools4skool.com/skool/skool-2026); [Learning Revolution](https://www.learningrevolution.net/circle-review/)) | Axis is an LMS first, community second |
| Timezone and price friction | Maven | 11 AM ET is overnight in APAC; 10x to 50x self paced price ([SkillScouter](https://skillscouter.com/maven-review/)) | Async cohorts with AI recaps |
| AI replacing humans backlash | Duolingo | MAU fell 19M in Q2 2025 after "AI first" memo ([WebProNews](https://www.webpronews.com/duolingo-ai-pivot-sparks-backlash-drives-41-revenue-surge-to-252m)) | Position AI as augmenting the teacher |
| Low AI tutor uptake | Khanmigo | About 15% regular use (unverified) ([aitoolsbakery](https://aitoolsbakery.com/blog/khanmigo-review/)) | Put the tutor in the lesson flow, not a side panel |
| Opaque pricing, steep admin curve | Docebo | G2: learning curve (45), limited customization (42) ([G2](https://www.g2.com/compare/docebo-vs-schoox)) | Public pricing page |
| No course export, lock in | Teachable, Kajabi | No SCORM or export; subscribers re sign up after migration ([Coursebox](https://www.coursebox.ai/blog/thinkific-vs-teachable); [Learning Revolution](https://www.learningrevolution.net/kajabi-review/)) | Export everything |

## 4. Table stakes vs differentiators

**Table stakes in 2026** (missing any of these loses a deal): courses and modules, assignments with rubric grading, quizzes with a question bank, weighted gradebook, announcements and discussions, calendar and to do, notifications, mobile app, LTI 1.3, SSO, WCAG 2.2 AA, AI draft generators for rubrics, questions and feedback, AI on/off toggles per course, a Socratic student tutor, and for K12 a safety layer with crisis flags ([D2L](https://www.d2l.com/whats-new-from-fusion-2026/); [Moodle 5.1](https://docs.moodle.org/501/en/New_Features); [SchoolAI](https://schoolai.com/spaces)). Google and Microsoft bundle AI at no extra cost, so "we have AI" is no longer a selling point on its own ([Workspace Updates](https://workspaceupdates.googleblog.com/2026/06/updates-to-gemini-in-google-classroom.html)). Gamification is also table stakes in community platforms after Circle 3.0 (2025) and Mighty leaderboards (Feb 2026) ([GroupApp](https://www.group.app/blog/circle-vs-mighty-networks/)).

| Axis status | Table stakes | Differentiators to own |
|---|---|---|
| Have | Auth, SSO (Google), courses, assignments, announcements, messaging, LTI 1.3, quiz, discussions, calendar, parent, attendance, office hours | AI ranked home feed per role, Agent Builder, office hours booking, degree planner |
| Partial | Gradebook depth, notifications control, mobile, question bank AI | Feedback Copilot citing rubric rows, Study Coach grounded in lesson and code |
| Missing | Conditional release, certificates, accessibility checker, Microsoft/Clever SSO, safety layer | Mission Control style live tutor view, per assignment AI policy, outcome based XP, MCP server, plan preview agent, async AI cohorts, voice teacher on the course path |

The differentiator that only Axis can credibly own is the **closed loop**: teacher sets an AI policy, Study Coach enforces it, the live view shows gaps, conditional release routes remediation, and verified learning earns XP. Each competitor owns one link of that chain (Microsoft the policy, SchoolAI the live view, Brightspace the release rules, Skool the XP); none connects them.

## 5. Sources

Primary note sets, all researched 2026-10-30, in `AIS-OS/research_notes/LMS competitor features/`: `institutional_lms.md`, `course_creator_platforms.md`, `ai_native_learning.md`, `corporate_and_teacher_ai.md`.

Source quality caveats from the notes: most course creator pricing comes from affiliate or competitor owned blogs and conflicts across sources (Skool $9 Hobby tier unconfirmed; Thinkific Aug 2026 increase figures conflict). Several Canvas feature descriptions (Mastery Paths, Studio, Commons) were not reverified against 2026 vendor pages and were left out of the citations above. No Reddit sentiment was retrievable for course creator, Boot.dev, Scrimba or teacher tools. Khanmigo's 15% usage figure is secondary and unverified. Exact post June 2026 prices for IgniteAI Agent, Lumi Pro and Anthology AVA, and the WebContainers commercial price, were not found.

Key URLs cited: [Phil Hill market share](https://onedtech.philhillaa.com/p/state-of-higher-ed-lms-market-for-us-and-canada-year-end-2024-edition), [Capterra Canvas](https://capterra.com/p/127214/CANVAS/), [D2L Fusion 2026](https://www.d2l.com/whats-new-from-fusion-2026/), [Moodle 5.1](https://docs.moodle.org/501/en/New_Features), [USNH IgniteAI KB](https://td.usnh.edu/TDClient/60/Portal/KB/ArticleDet?ID=5404), [Constellation Research IgniteAI Agent](https://www.constellationr.com/insights/news/instructure-launches-igniteai-agent-canvas-builds-amazon-bedrock), [Workspace Updates Gemini](https://workspaceupdates.googleblog.com/2026/08/gemini-in-google-classroom-is-expanding-to-users-of-all-ages-with-contextualized-Gemini-starter-prompts-for-students.html), [EdTech Innovation Hub Microsoft](https://www.edtechinnovationhub.com/news/microsoft-adds-ai-teaching-tools-to-365-education-as-classroom-use-rises), [Tools4Skool](https://tools4skool.com/skool/skool-2026), [Learning Revolution Kajabi](https://www.learningrevolution.net/kajabi-review/), [Learning Revolution Circle](https://www.learningrevolution.net/circle-review/), [Coursebox Thinkific vs Teachable](https://www.coursebox.ai/blog/thinkific-vs-teachable), [GroupApp Circle vs Mighty](https://www.group.app/blog/circle-vs-mighty-networks/), [SkillScouter Maven](https://skillscouter.com/maven-review/), [AIFunnelInsider LearnWorlds](https://aifunnelinsider.com/learnworlds-review-2026/), [EdTech Innovation Hub Khanmigo](https://www.edtechinnovationhub.com/news/khan-academy-brings-gemini-powered-visual-tutoring-into-classrooms-for-2026), [Duolingo Max](https://blog.duolingo.com/duolingo-max), [Boot.dev Jul 2026](https://www.boot.dev/blog/news/bootdev-beat-2026-07), [SurviveJS Scrimba](https://survivejs.com/blog/scrimba-interview/), [Codecademy Help](https://help.codecademy.com/hc/en-us/articles/23400751016859-AI-Features-available-on-Codecademy), [Google NotebookLM](https://blog.google/technology/google-labs/notebooklm-student-features/), [Sandpack FAQ](https://sandpack.codesandbox.io/docs/resources/faq), [expo/snack](https://github.com/expo/snack), [Judge0 docs](https://docs.judge0.com/products/judge0/get_started/self_hosting), [Docebo April 2026](https://www.docebo.com/whatsnew/2026-april/), [IT Brief Degreed](https://itbrief.com.au/story/degreed-unveils-ai-tools-to-close-human-readiness-gap), [Workday Sana](https://newsroom.workday.com/2025-11-04-Workday-Completes-Acquisition-of-Sana), [SchoolAI Spaces](https://schoolai.com/spaces), [fast.io MagicSchool](https://www.fast.io/resources/magic-ai-review-2026.md), [Ditch That Textbook](https://ditch.beehiiv.com/p/4-6-2026), [GPTZero MagicSchool](https://gptzero.me/news/magicschool-ai-review).

## Conclusion

The research shifts the question from "which features are missing" to "which links are missing". Axis already matches or beats most incumbents on raw AI capability; Canvas, D2L and Blackboard are only now shipping what Study Coach and Feedback Copilot do, and charging extra for it after June 2026. The real gap is that Axis's agents produce output nobody watches and nothing acts on. Building the teacher live view, the per assignment policy and the rule engine first makes every existing agent more valuable at once, which is better leverage than adding new generators.

For the React Native school specifically, Expo Snack (MIT) plus an xterm.js terminal over a self hosted container avoids the two licensing traps found (WebContainers' unpriced commercial license and Nodebox's commercial restrictions), and pairing it with a Codecademy style context aware tutor and Maven style free voice taught samplers gives a funnel no single competitor offers today.
