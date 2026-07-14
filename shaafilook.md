# Shaafi Look — What the Research Says

Research conducted July 2026 into University of Victoria and Simon Fraser University student experiences, with focus on tool fragmentation, faculty profile data models, and office hours booking workflows.

---

## 1. The Clear Problem: Tool Fragmentation

UVic students operate across at least **five distinct communication and learning platforms**, each serving overlapping functions, with no central hub:

| Tool | Primary Use | Status |
|------|------------|--------|
| **Brightspace** | Primary LMS: course materials, assignments, grades, announcements | Mandatory; controls course structure |
| **Ed Discussion** (Brightspace) | Forum discussions for course topics | Inside Brightspace but separated from timeline |
| **Mattermost** | Real-time group communication, instant messaging | Optional; parallel to email for group projects |
| **Microsoft Teams** | Alternative synchronous communication, team chats | Optional; alternative discussion/chat channel |
| **Zoom** | Synchronous video office hours, lectures | Optional; external to LMS |
| **Email** | Direct professor contact, appointment requests | Fallback for everything not automated |
| **Professor personal websites** | Course syllabus, readings, office hours (sometimes) | Hosted externally at web.uvic.ca or personal domains |

**Evidence:**
- UVic's "Student services - Online tools" page [lists Brightspace, Zoom, Teams, and other services](https://www.uvic.ca/tools/help/student/index.php) as separate systems students must navigate
- UVic's "Teach Anywhere" documentation describes [Brightspace discussions](https://teachanywhere.uvic.ca/learning-tech/brightspace/student-discussions/) and [Microsoft Teams channels](https://teachanywhere.uvic.ca/) as distinct communication options; Zoom office hours are a separate, LMS-external pattern (documented e.g. by [UW IT](https://ois.uw.edu/tools-services-support/voice-video/zoom-video-conferencing/teach/office-hours) — same model UVic instructors follow)
- UVic supports [self-serve web hosting for personal course websites](https://www.uvic.ca/systems/support/web/departmentalwebhosting/index.php)
- [Brightspace Pulse mobile app](https://onlineacademiccommunity.uvic.ca/LearnAnywhere/) is described as one convenience layer, implying students already feel scattered across platforms

**The problem in plain language:** A UVic student logging in for their day must check Brightspace for announcements, scan email for professor updates, join Mattermost for group project chat, check a professor's personal website for office hours posted as a PDF, and then email the professor to book a time. The LMS fragments what should be a unified academic interface.

---

## 2. Professor Page Data Model: What Exists Today

**UVic Computer Science Faculty Directory** fetched from [https://www.uvic.ca/ecs/computerscience/people/faculty/index.php](https://www.uvic.ca/ecs/computerscience/people/faculty/index.php):

### Fields Present on UVic Prof Pages
| Field | Present? | Format Example |
|-------|----------|-----------------|
| **Name** | ✓ | "Celina Berg" |
| **Title** | ✓ | "Teaching Professor, Associate Dean Undergraduate" |
| **Office Location** | ✓ | "ECS 618" (Building + Room) |
| **Email** | ✓ | "celinag@uvic.ca" |
| **Phone** | ✓ | "250-472-4818" |
| **Office Hours** | ✗ | Not listed |
| **Research Areas** | ✓ | "Computer Science education" |
| **Personal Website** | ✗ | Not linked |
| **Biography** | ✗ | Not included |

**Sample UVic Faculty Records:**
- Celina Berg, Teaching Professor, ECS 618, celinag@uvic.ca, 250-472-4818 — office hours not shown
- Daniela Damian, Professor, ECS 558, danielad@uvic.ca, 250-472-5788 — research areas listed but no booking info
- Yvonne Coady, Professor, ECS 565, ycoady@uvic.ca, 250-472-5715 — phone provided but no meeting availability

**SFU Computing Science Faculty Directory** fetched from [https://www.sfu.ca/fas/computing/people/faculty.html](https://www.sfu.ca/fas/computing/people/faculty.html):

### Fields Present on SFU Prof Pages
| Field | Present? | Format Example |
|-------|----------|-----------------|
| **Name** | ✓ | "Aksoy, Yagiz" |
| **Title** | ✓ | "Assistant Professor" |
| **Office Location** | ✓ | "TASC1 9019" (Building + Room) |
| **Email** | ✓ | "yagiz@sfu.ca" |
| **Phone** | ✓ (partial) | "778.782.4813" |
| **Office Hours** | ✗ | Not listed |
| **Research Areas** | ✗ | Not shown on directory |
| **Personal Website** | ✗ | Not linked from directory |
| **Honors/Titles** | ✓ | "Canada Research Chair" displayed for some |

**Sample SFU Faculty Records:**
- Aksoy, Yagiz, Assistant Professor, TASC1 9019, yagiz@sfu.ca — no phone or hours
- Carpendale, Sheelagh, Professor / Canada Research Chair / NSERC Fellow, TASC1 9233, sheelagh@sfu.ca, 778.782.5415 — credentials highlighted but no availability
- Chen, Mo, Associate Professor, TASC1 8225, mochen@sfu.ca, 778.782.7198 — no hours listed

**Key Finding:** Both UVic and SFU use the same core data model for faculty directories:
- **Always present:** Name, Title, Office (building + room number), Email
- **Sometimes present:** Phone
- **Never present (verified on both):** Office hours, recurring availability, appointment booking link

This is the critical gap. A student has a professor's office location and email but no way to know when that professor is available or how to book time.

---

## 3. How Office Hours Booking Works Today (The Manual Reality)

**Official processes at UVic:**
1. **Check the syllabus.** Most professors post office hours in the first-day syllabus PDF or on their Brightspace course announcement. [UVic advising documentation](https://www.uvic.ca/advising/academic-advising/connect-with-us/index.php) points students to check syllabi for faculty contact and availability.
2. **Drop-in if listed.** If a professor posts "Tue 2-4pm, ECS 618, no appointment needed," students walk in during that window. [This is still the standard model](https://learningcenter.unc.edu/tips-and-tools/using-office-hours-effectively/) at most universities.
3. **Email if not listed or by appointment.** If hours aren't posted or the professor requires pre-booking, students email to request a time. [This is confirmed as common practice](https://www.quora.com/How-can-I-ask-my-professor-for-his-office-hour-via-email).
4. **Ad-hoc booking tools.** Some professors use [Doodle polls, Google Sheets, Calendly, or wikispaces](https://www.getclockwise.com/blog/office-hours) to let students self-serve, but this is inconsistent and scattered.

**Why it's fragmented:**
- Each professor invents their own system (drop-in, email, Doodle, external site)
- No discovery mechanism: a student doesn't know how Prof. A books time vs. Prof. B
- Syllabus PDFs are not searchable or indexed
- No "book with Prof X" option in Brightspace, Canvas, or any LMS core feature
- Email creates back-and-forth friction: "When are you free?" "How about 2pm Wed?" "Actually 3pm works better..." [This manual scheduling is documented as inefficient](https://www.getclockwise.com/blog/office-hours)

**What LMS platforms offer but UVic doesn't use:**
- Canvas has a built-in Appointment Group/Scheduler [allowing students to sign up for time slots](https://courses.uchicago.edu/2018/09/10/scheduling-office-hours-in-canvas-an-introduction/)
- Brightspace has a Scheduler tool [that can be used for office hours](https://carleton.ca/brightspace/instructors/using-the-scheduler/) with Zoom integration
- Neither is adopted as standard at UVic; adoption is voluntary and rare

**Result:** Booking a professor office hours at UVic involves guesswork, email, manual calendar checking, and luck. It is not integrated into the student's academic platform.

---

## 4. UI/UX Direction for Axis

Axis solves this by making office hours a **first-class citizen** in the learning platform, designed around the feed-first, three-nav principle established in the MISSION.

### Where Booking Lives (Interaction Model)

**Home Feed** (primary entry point):
- Surfaces upcoming appointments: "Your meeting with Prof Daniela Damian on Wed 2pm in ECS 558"
- Surfaced by priority: if student has office hours in 24 hours, it appears at the top
- One-tap view of appointment details (Zoom link, or in-person location + map)

**Inside Course Timeline:**
- Professor card always visible in course header: name, office location (ECS 558), email, photo
- "Book Office Hours" call-to-action on prof card → opens booking panel
- Booking panel shows:
  - Prof's recurring office hours blocks (e.g., "Tuesdays 2-4pm, Thursdays 10am-12pm")
  - Student selects a 30-minute slot from available times
  - Confirmation with Zoom link (auto-generated) or in-person location + calendar invite
  - ≤3 taps: tap card → tap "Book" → select time → done

**In AI Chat** (Study Coach / Feedback Copilot):
- Student asks: "Can I meet with my prof about my assignment feedback?"
- AI responds: "I can help. Prof Damian has office hours Tue 2-4pm in ECS 558. [Book now]"
- One-tap booking from chat context

### Instructor Setup (Define Once, Reuse Always)

Instructors define recurring office hours **once** in their profile settings:
- "Tuesdays 2-4pm (in-office)" + office location (auto-populated from directory)
- "Thursdays 10am-12pm (Zoom)" + Zoom link or auto-generate
- "By appointment via email" as a fallback option
- Axis automatically blocks calendar, prevents double-booking, and surfaces availability to all students in real-time

No per-course setup. No syllabus PDF to update. Recurring patterns define 80% of the semester.

### What the Feed Shows Students

- **Upcoming appointments:** "Prof Chen office hours Wed 2:30pm in ECS 520" (in nav or home feed)
- **Reminders:** 24 hours before, 1 hour before (gentle notification, not aggressive)
- **Post-meeting prompt:** "How was your meeting with Prof Chen?" (1-2 question feedback to improve prof availability data over time)

### What the Feed Shows Instructors

- **Office hours load:** "4/5 slots booked Tue 2-4pm" (see at a glance if they need to add hours)
- **Student no-show tracking:** "Student booked but didn't attend" (optional; helps improve time management)
- **Feedback sentiment:** "Students gave 4.8/5 stars on office hour meetings this week" (quality signal, not surveillance)

---

## 5. What This Means for Positioning

### The Wedge: Consolidation + Booking

Axis enters a market where **incumbents (Canvas, Brightspace) cannot easily copy office hours booking** because:

1. **They ARE the fragmentation.** Canvas and Brightspace are filing cabinets designed for admin/gradebook workflows. Adding a booking feature is a band-aid on a broken architecture. Axis is built from first principles around *what students actually need*.

2. **Office hours booking is not in their core product.** Canvas and Brightspace have Scheduler tools but they are:
   - Optional (adoption requires instructor opt-in and active setup per course)
   - Not discoverable (buried in course settings, not visible in student nav)
   - Not feed-integrated (no "upcoming appointment" in a home view)
   - Not AI-aware (no "book prof X about topic Y" from chat)

3. **Consolidation is the competitive moat.** When a student opens Axis, they find:
   - Home feed with 3-5 prioritized actions (one of which is "upcoming office hours")
   - Courses organized chronologically (not folders)
   - One place to message, check grades, see feedback, and book prof time
   - No context-switching to email, Mattermost, Zoom, or personal websites

Incumbents are software. Axis is a **system.** That's not copyable in a quarterly release cycle.

### Three Positioning Bullets

- **"All-in-one, actually."** While Canvas and Brightspace fragment students across email, chat, and booking tools, Axis consolidates advising, coursework, messages, and office hours into one feed. Students stop juggling seven browser tabs.

- **"Office hours that don't require email."** Every other LMS assumes professors will post hours in a syllabus and students will email. Axis makes booking a 30-second action from the course page. No email friction. Professors define hours once, students see real-time availability across all their courses.

- **"AI knows what you need next."** The Study Coach doesn't just answer questions. It surfaces "Your next deadline is Fri, and you're 0% done" and "Prof Damian has availability Wed 2pm if you want to discuss." Invisible AI + visible booking = guidance students actually use.

---

## 6. Sources

### UVic Directories & Profiles
- [UVic Computer Science Faculty Directory](https://www.uvic.ca/ecs/computerscience/people/faculty/index.php)
- [UVic Student Services - Online Tools](https://www.uvic.ca/tools/help/student/index.php)
- [UVic Websites - Self-Serve Web Hosting](https://www.uvic.ca/systems/support/web/departmentalwebhosting/index.php)

### UVic Learning Platform & Tools
- [UVic Teach Anywhere - Brightspace Student Guide](https://teachanywhere.uvic.ca/learning-tech/brightspace/student-discussions/)
- [UVic Brightspace Pulse Mobile App](https://onlineacademiccommunity.uvic.ca/LearnAnywhere/)
- [UVic Learning & Teaching Technologies](https://www.uvic.ca/systems//services/learningteaching/brightspace/index.php)
- [UVic Academic Advising - Connect with Us](https://www.uvic.ca/advising/academic-advising/connect-with-us/index.php)

### SFU Faculty Directory & Comparison
- [SFU School of Computing Science Faculty Directory](https://www.sfu.ca/fas/computing/people/faculty.html)
- [SFU Faculty of Education Staff Directory](https://www.sfu.ca/education/contact/staff-directory.html)

### Office Hours Booking Practices (General)
- [Canvas Scheduling Office Hours - UChicago](https://courses.uchicago.edu/2018/09/10/scheduling-office-hours-in-canvas-an-introduction/)
- [Brightspace Scheduler Tool - Carleton University](https://carleton.ca/brightspace/instructors/using-the-scheduler/)
- [Clockwise: A Smarter Way to Schedule Office Hours](https://www.getclockwise.com/blog/office-hours)
- [UNC Learning Center: Using Office Hours Effectively](https://learningcenter.unc.edu/tips-and-tools/using-office-hours-effectively/)
- [Quora: How to ask professor for office hour via email (common practice)](https://www.quora.com/How-can-I-ask-my-professor-for-his-office-hour-via-email)
- [UW IT: Use Zoom for online office hours](https://ois.uw.edu/tools-services-support/voice-video/zoom-video-conferencing/teach/office-hours)
