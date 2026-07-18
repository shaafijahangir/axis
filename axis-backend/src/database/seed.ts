/**
 * Database Seed Script
 *
 * WHY: Populates the database with realistic demo data so you can
 * experience the full student journey through Axis.
 *
 * USAGE: npm run seed
 *
 * CREDENTIALS (all passwords are "password123"):
 *   Student:    student@Axis.demo
 *   Instructor: prof.chen@Axis.demo
 *   Admin:      admin@Axis.demo
 *   TA:         ta.jordan@Axis.demo
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { entities } from './entities';

config();

// ─── Fixed UUIDs for deterministic references ──────────────────────────
const IDS = {
  tenant: '00000000-0000-0000-0000-000000000001',
  // Users
  student: '10000000-0000-0000-0000-000000000001',
  instructor: '10000000-0000-0000-0000-000000000002',
  admin: '10000000-0000-0000-0000-000000000003',
  ta: '10000000-0000-0000-0000-000000000004',
  instructor2: '10000000-0000-0000-0000-000000000005',
  student2: '10000000-0000-0000-0000-000000000006',
  student3: '10000000-0000-0000-0000-000000000007',
  // Term
  currentTerm: '20000000-0000-0000-0000-000000000001',
  pastTerm: '20000000-0000-0000-0000-000000000002',
  // Courses
  cs101: '30000000-0000-0000-0000-000000000001',
  math201: '30000000-0000-0000-0000-000000000002',
  eng102: '30000000-0000-0000-0000-000000000003',
  phys150: '30000000-0000-0000-0000-000000000004',
  cs201: '30000000-0000-0000-0000-000000000005',
  cs301: '30000000-0000-0000-0000-000000000006',
  math101: '30000000-0000-0000-0000-000000000007',
  // Sections
  cs101sec: '40000000-0000-0000-0000-000000000001',
  math201sec: '40000000-0000-0000-0000-000000000002',
  eng102sec: '40000000-0000-0000-0000-000000000003',
  phys150sec: '40000000-0000-0000-0000-000000000004',
  cs101pastSec: '40000000-0000-0000-0000-000000000005',
  // Degree program
  csBS: '50000000-0000-0000-0000-000000000001',
  // Student degree profile
  studentProfile: '60000000-0000-0000-0000-000000000001',
  // Announcements (fixed so re-seeding doesn't create duplicates)
  ann_cs101_welcome: '70000000-0000-0000-0000-000000000001',
  ann_cs101_midterm: '70000000-0000-0000-0000-000000000002',
  ann_cs101_officehours: '70000000-0000-0000-0000-000000000003',
  ann_math201_update: '70000000-0000-0000-0000-000000000004',
  ann_eng102_essay: '70000000-0000-0000-0000-000000000005',
  ann_phys150_lab: '70000000-0000-0000-0000-000000000006',
  // Office hours + busy blocks (FEAT-018/019) — fixed for idempotent re-seeds
  oh_chen_wed: '80000000-0000-0000-0000-000000000001',
  oh_chen_thu: '80000000-0000-0000-0000-000000000002',
  busy_chen_research: '80000000-0000-0000-0000-000000000003',
  busy_chen_meeting: '80000000-0000-0000-0000-000000000004',
  booking_alex: '80000000-0000-0000-0000-000000000005',
};

async function seed() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'Axis',
    schema: process.env.DATABASE_SCHEMA || 'public',
    entities,
    synchronize: false,
    logging: false,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
  });

  await ds.initialize();
  console.log('Connected to database.');

  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    const now = new Date();

    // ─── 1. Tenant ─────────────────────────────────────────────
    await qr.query(
      `INSERT INTO tenants (id, name, domain, subdomain, settings, "subscriptionPlan", "billingStatus", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET name = $2`,
      [
        IDS.tenant,
        'Axis Demo',
        'localhost',
        'demo',
        '{}',
        'professional',
        'active',
        now,
        now,
      ],
    );
    console.log('  Tenant created.');

    // ─── 2. Users ──────────────────────────────────────────────
    const users = [
      [
        IDS.student,
        'student@Axis.demo',
        'Alex',
        'Rivera',
        '{student}',
        '{"bio":"CS sophomore, loves algorithms","avatar":null}',
        '{"theme":"system","notifications":true}',
      ],
      [
        IDS.instructor,
        'prof.chen@Axis.demo',
        'Sarah',
        'Chen',
        '{instructor}',
        '{"bio":"Associate Professor of Computer Science, specializing in algorithms and data structures","avatar":null}',
        '{}',
      ],
      [
        IDS.admin,
        'admin@Axis.demo',
        'Marcus',
        'Williams',
        '{admin}',
        '{"bio":"University LMS Administrator"}',
        '{}',
      ],
      [
        IDS.ta,
        'ta.jordan@Axis.demo',
        'Jordan',
        'Kim',
        '{student,ta}',
        '{"bio":"CS senior, TA for CSC 110"}',
        '{}',
      ],
      [
        IDS.instructor2,
        'prof.patel@Axis.demo',
        'Raj',
        'Patel',
        '{instructor}',
        '{"bio":"Professor of Mathematics"}',
        '{}',
      ],
      [
        IDS.student2,
        'maria@Axis.demo',
        'Maria',
        'Santos',
        '{student}',
        '{"bio":"Pre-med student"}',
        '{}',
      ],
      [
        IDS.student3,
        'james@Axis.demo',
        'James',
        'Thompson',
        '{student}',
        '{"bio":"English major"}',
        '{}',
      ],
    ];

    for (const [id, email, first, last, roles, profile, prefs] of users) {
      await qr.query(
        `INSERT INTO users (id, "tenantId", email, "passwordHash", "firstName", "lastName", roles, profile, preferences, status, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11)
         ON CONFLICT (id) DO UPDATE SET email=$3, "firstName"=$5, "lastName"=$6`,
        [
          id,
          IDS.tenant,
          email,
          passwordHash,
          first,
          last,
          roles,
          profile,
          prefs,
          now,
          now,
        ],
      );
    }
    console.log('  7 users created.');

    // ─── 3. Academic Terms ─────────────────────────────────────
    await qr.query(
      `INSERT INTO academic_terms (id, "tenantId", name, "startDate", "endDate", "isCurrent", settings, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,true,'{}',$6,$7)
       ON CONFLICT (id) DO UPDATE SET name=$3, "startDate"=$4, "endDate"=$5, "isCurrent"=true`,
      [
        IDS.currentTerm,
        IDS.tenant,
        // UVic-style term naming; dates span "now" so the demo term is live.
        'Summer 2026',
        '2026-05-04',
        '2026-08-21',
        now,
        now,
      ],
    );
    await qr.query(
      `INSERT INTO academic_terms (id, "tenantId", name, "startDate", "endDate", "isCurrent", settings, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,false,'{}',$6,$7)
       ON CONFLICT (id) DO UPDATE SET name=$3, "startDate"=$4, "endDate"=$5, "isCurrent"=false`,
      [
        IDS.pastTerm,
        IDS.tenant,
        'Spring 2026',
        '2026-01-05',
        '2026-04-30',
        now,
        now,
      ],
    );
    console.log('  2 academic terms created.');

    // ─── 4. Courses ────────────────────────────────────────────
    // GTM §8.5: demo tenant carries UVic-shaped data — real UVic course codes
    // and buildings so a UVic contact instantly recognizes the world
    // (CSC 110 is UVic's Python-based intro course, ECS/CLE/ELL/DTB are real
    // buildings). Course *content* below is representative, not copied.
    const courses = [
      [
        IDS.cs101,
        'CSC 110',
        'Fundamentals of Programming I',
        'Introduction to designing, implementing, and understanding computer programs. Uses Python.',
        3,
        'Computer Science',
      ],
      [
        IDS.math201,
        'MATH 101',
        'Calculus II',
        'Integration techniques, series, sequences, and applications of integration.',
        4,
        'Mathematics',
      ],
      [
        IDS.eng102,
        'ATWP 135',
        'Academic Reading and Writing',
        'Research-based writing, argumentation, and critical analysis of texts.',
        3,
        'Academic and Technical Writing',
      ],
      [
        IDS.phys150,
        'PHYS 110',
        'Introductory Physics I',
        "Classical mechanics, kinematics, Newton's laws, energy, and momentum.",
        4,
        'Physics',
      ],
      [
        IDS.cs201,
        'CSC 225',
        'Algorithms and Data Structures I',
        'Trees, graphs, sorting, searching, dynamic programming. Prereq: CSC 110.',
        3,
        'Computer Science',
      ],
      [
        IDS.cs301,
        'CSC 360',
        'Operating Systems',
        'Processes, threads, memory management, file systems. Prereq: CSC 225.',
        3,
        'Computer Science',
      ],
      [
        IDS.math101,
        'MATH 100',
        'Calculus I',
        'Limits, derivatives, and introduction to integration.',
        4,
        'Mathematics',
      ],
    ];

    for (const [id, code, title, desc, credits, dept] of courses) {
      await qr.query(
        `INSERT INTO courses (id, "tenantId", code, title, description, credits, "departmentId", settings, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,'{}',$8,$9)
         ON CONFLICT (id) DO UPDATE SET code=$3, title=$4, description=$5, "departmentId"=$7`,
        [id, IDS.tenant, code, title, desc, credits, dept, now, now],
      );
    }
    console.log('  7 courses created.');

    // ─── 5. Course Sections (current term) ─────────────────────
    const sections = [
      // [id, courseId, instructorId, termId, legacyScheduleBlob, location,
      //  capacity, status, meetingDays, startTime, endTime]
      // SPRINT-1 typed schedule columns are what /schedule actually renders;
      // the legacy blob is kept only for backward-compat reads.
      [
        IDS.cs101sec,
        IDS.cs101,
        IDS.instructor,
        IDS.currentTerm,
        '{"days":["Mon","Wed","Fri"],"time":"10:00-10:50"}',
        'ECS 123',
        35,
        'active',
        '{Mon,Wed,Fri}',
        '10:00',
        '10:50',
      ],
      [
        IDS.math201sec,
        IDS.math201,
        IDS.instructor2,
        IDS.currentTerm,
        '{"days":["Tue","Thu"],"time":"09:00-10:15"}',
        'CLE A203',
        30,
        'active',
        '{Tue,Thu}',
        '09:00',
        '10:15',
      ],
      [
        IDS.eng102sec,
        IDS.eng102,
        IDS.instructor,
        IDS.currentTerm,
        '{"days":["Mon","Wed"],"time":"14:00-15:15"}',
        'DTB A102',
        25,
        'active',
        '{Mon,Wed}',
        '14:00',
        '15:15',
      ],
      [
        IDS.phys150sec,
        IDS.phys150,
        IDS.instructor2,
        IDS.currentTerm,
        '{"days":["Mon","Wed","Fri"],"time":"11:00-11:50"}',
        'ELL 061',
        28,
        'active',
        '{Mon,Wed,Fri}',
        '11:00',
        '11:50',
      ],
      [
        IDS.cs101pastSec,
        IDS.cs101,
        IDS.instructor,
        IDS.pastTerm,
        '{"days":["Mon","Wed","Fri"],"time":"10:00-10:50"}',
        'ECS 123',
        35,
        'completed',
        '{Mon,Wed,Fri}',
        '10:00',
        '10:50',
      ],
    ];

    for (const [
      id,
      courseId,
      instrId,
      termId,
      sched,
      loc,
      cap,
      status,
      meetingDays,
      startTime,
      endTime,
    ] of sections) {
      await qr.query(
        `INSERT INTO course_sections (id, "courseId", "instructorId", "termId", schedule, location, capacity, status, "meetingDays", "startTime", "endTime", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (id) DO UPDATE SET location=$6, status=$8, "meetingDays"=$9, "startTime"=$10, "endTime"=$11`,
        [
          id,
          courseId,
          instrId,
          termId,
          sched,
          loc,
          cap,
          status,
          meetingDays,
          startTime,
          endTime,
          now,
          now,
        ],
      );
    }
    console.log('  5 course sections created.');

    // ─── 6. Enrollments ────────────────────────────────────────
    const enrollments = [
      // Alex Rivera (student) — enrolled in 4 current courses
      [IDS.student, IDS.cs101sec, 'student', 'active', null],
      [IDS.student, IDS.math201sec, 'student', 'active', null],
      [IDS.student, IDS.eng102sec, 'student', 'active', null],
      [IDS.student, IDS.phys150sec, 'student', 'active', null],
      // Alex completed CSC 110 last term
      [IDS.student, IDS.cs101pastSec, 'student', 'completed', 'A-'],
      // Jordan Kim — TA for CSC 110
      [IDS.ta, IDS.cs101sec, 'ta', 'active', null],
      // Maria Santos — in CSC 110 and ATWP 135
      [IDS.student2, IDS.cs101sec, 'student', 'active', null],
      [IDS.student2, IDS.eng102sec, 'student', 'active', null],
      // James Thompson — in ATWP 135 and PHYS 110
      [IDS.student3, IDS.eng102sec, 'student', 'active', null],
      [IDS.student3, IDS.phys150sec, 'student', 'active', null],
    ];

    for (const [userId, sectionId, role, status, grade] of enrollments) {
      await qr.query(
        `INSERT INTO enrollments (id, "tenantId", "userId", "sectionId", role, status, "enrolledAt", "completedAt", "finalGrade", "createdAt", "updatedAt")
         VALUES (uuid_generate_v4(),$1,$2,$3,$4,$5,NOW(),$6,$7,$8,$9)
         ON CONFLICT ("userId", "sectionId") DO NOTHING`,
        [
          IDS.tenant,
          userId,
          sectionId,
          role,
          status,
          status === 'completed' ? new Date('2025-12-15') : null,
          grade,
          now,
          now,
        ],
      );
    }
    console.log('  10 enrollments created.');

    // ─── 7. Assignments ────────────────────────────────────────
    const past = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d;
    };
    const future = (daysAhead: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysAhead);
      return d;
    };

    const assignmentIds: Record<string, string> = {};
    const assignments = [
      // CSC 110
      {
        key: 'cs101_hw1',
        section: IDS.cs101sec,
        title: 'HW1: Variables & Loops',
        desc: 'Write Python programs using variables, for-loops, and while-loops. Submit a .py file for each problem.',
        type: 'assignment',
        points: 100,
        due: past(14),
        module: 'Module 1: Basics',
      },
      {
        key: 'cs101_hw2',
        section: IDS.cs101sec,
        title: 'HW2: Functions & Recursion',
        desc: 'Implement recursive and iterative solutions for the given problems. Include docstrings for each function.',
        type: 'assignment',
        points: 100,
        due: past(3),
        module: 'Module 2: Functions',
      },
      {
        key: 'cs101_hw3',
        section: IDS.cs101sec,
        title: 'HW3: Data Structures',
        desc: 'Implement a linked list and a stack in Python. Write unit tests for both.',
        type: 'assignment',
        points: 100,
        due: future(10),
        module: 'Module 3: Data Structures',
      },
      {
        key: 'cs101_quiz1',
        section: IDS.cs101sec,
        title: 'Quiz 1: Python Basics',
        desc: 'Multiple choice and short answer questions on Python syntax, types, and control flow.',
        type: 'quiz',
        points: 50,
        due: past(21),
        module: 'Module 1: Basics',
      },
      {
        key: 'cs101_midterm',
        section: IDS.cs101sec,
        title: 'Midterm Exam',
        desc: 'Covers Modules 1-3. Mix of coding problems and conceptual questions. 90 minutes.',
        type: 'exam',
        points: 200,
        due: future(14),
        module: null,
      },
      {
        key: 'cs101_project',
        section: IDS.cs101sec,
        title: 'Final Project: CLI Application',
        desc: 'Build a command-line application of your choice that demonstrates mastery of Python fundamentals. Must include file I/O, error handling, and at least 3 classes.',
        type: 'project',
        points: 300,
        due: future(45),
        module: null,
      },
      // MATH 101
      {
        key: 'math_hw1',
        section: IDS.math201sec,
        title: 'Problem Set 1: Integration by Parts',
        desc: 'Complete problems 1-20 from Chapter 7.1. Show all work.',
        type: 'assignment',
        points: 50,
        due: past(10),
        module: 'Chapter 7',
      },
      {
        key: 'math_hw2',
        section: IDS.math201sec,
        title: 'Problem Set 2: Trigonometric Integrals',
        desc: 'Problems from sections 7.2 and 7.3. Due by 11:59 PM.',
        type: 'assignment',
        points: 50,
        due: future(5),
        module: 'Chapter 7',
      },
      {
        key: 'math_quiz',
        section: IDS.math201sec,
        title: 'Quiz: Integration Techniques',
        desc: 'In-class quiz covering integration by parts, trig substitution, and partial fractions.',
        type: 'quiz',
        points: 40,
        due: past(5),
        module: 'Chapter 7',
      },
      // ATWP 135
      {
        key: 'eng_essay1',
        section: IDS.eng102sec,
        title: 'Essay 1: Rhetorical Analysis',
        desc: 'Choose a published opinion piece and write a 1500-word rhetorical analysis. Focus on ethos, pathos, and logos.',
        type: 'assignment',
        points: 100,
        due: past(7),
        module: 'Unit 1: Rhetoric',
      },
      {
        key: 'eng_essay2',
        section: IDS.eng102sec,
        title: 'Essay 2: Research Proposal',
        desc: 'Submit a 500-word proposal for your research paper. Include thesis, 3 sources, and methodology.',
        type: 'assignment',
        points: 50,
        due: future(7),
        module: 'Unit 2: Research',
      },
      {
        key: 'eng_disc1',
        section: IDS.eng102sec,
        title: 'Discussion: AI in Academic Writing',
        desc: 'Post your position on AI writing tools in academia (300 words). Respond to 2 classmates.',
        type: 'discussion',
        points: 20,
        due: past(2),
        module: 'Unit 1: Rhetoric',
      },
      // PHYS 110
      {
        key: 'phys_lab1',
        section: IDS.phys150sec,
        title: 'Lab 1: Projectile Motion',
        desc: 'Perform the projectile motion experiment. Submit lab report with data tables and error analysis.',
        type: 'assignment',
        points: 75,
        due: past(8),
        module: 'Unit 2: Kinematics',
      },
      {
        key: 'phys_hw1',
        section: IDS.phys150sec,
        title: "Problem Set 1: Newton's Laws",
        desc: 'Solve problems 3.1-3.15 from the textbook. Include free-body diagrams for each problem.',
        type: 'assignment',
        points: 50,
        due: future(3),
        module: 'Unit 3: Forces',
      },
    ];

    for (const a of assignments) {
      const id = `70000000-0000-0000-0000-${String(Object.keys(assignmentIds).length + 1).padStart(12, '0')}`;
      assignmentIds[a.key] = id;
      await qr.query(
        `INSERT INTO assignments (id, "tenantId", "sectionId", "moduleId", title, description, type, "pointsPossible", "dueAt", rubric, settings, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL,'{}',$10,$11)
         ON CONFLICT (id) DO UPDATE SET title=$5, "dueAt"=$9`,
        [
          id,
          IDS.tenant,
          a.section,
          a.module,
          a.title,
          a.desc,
          a.type,
          a.points,
          a.due,
          now,
          now,
        ],
      );
    }
    console.log(`  ${assignments.length} assignments created.`);

    // ─── 8. Submissions (Alex Rivera's graded work) ────────────
    const submissions = [
      // Graded submissions
      {
        assignment: 'cs101_hw1',
        user: IDS.student,
        score: 92,
        feedback:
          'Excellent work on the loop problems. Your while-loop solution for problem 3 is particularly elegant. Minor deduction: missing docstring on problem 5.',
        daysAgo: 12,
      },
      {
        assignment: 'cs101_quiz1',
        user: IDS.student,
        score: 45,
        feedback:
          'Strong understanding of Python basics. Review list comprehension syntax — you missed question 8.',
        daysAgo: 19,
      },
      {
        assignment: 'cs101_hw2',
        user: IDS.student,
        score: 88,
        feedback:
          'Good recursive implementations. The memoized Fibonacci is well done. Your tree traversal is missing the base case for empty nodes — causes a crash on edge cases.',
        daysAgo: 1,
      },
      {
        assignment: 'math_hw1',
        user: IDS.student,
        score: 42,
        feedback:
          'Solid work. Problems 12 and 15 have integration errors — review u-substitution steps.',
        daysAgo: 8,
      },
      {
        assignment: 'math_quiz',
        user: IDS.student,
        score: 35,
        feedback:
          'Good performance. Partial fractions section was strong. Review trig substitution — sign error in Q3.',
        daysAgo: 3,
      },
      {
        assignment: 'eng_essay1',
        user: IDS.student,
        score: 85,
        feedback:
          'Strong analysis of ethos in your selected piece. Your logos section could be more specific — cite concrete data points from the article. Excellent use of rhetorical vocabulary throughout.',
        daysAgo: 5,
      },
      {
        assignment: 'eng_disc1',
        user: IDS.student,
        score: 18,
        feedback:
          'Thoughtful position. Your replies to classmates were substantive.',
        daysAgo: 1,
      },
      {
        assignment: 'phys_lab1',
        user: IDS.student,
        score: 68,
        feedback:
          'Data collection was thorough. Error analysis needs improvement — propagate uncertainty through calculations. Graph labels are missing units.',
        daysAgo: 6,
      },
      // Ungraded (submitted, awaiting grade)
      {
        assignment: 'cs101_hw2',
        user: IDS.student2,
        score: null,
        feedback: null,
        daysAgo: 2,
      },
      {
        assignment: 'eng_essay1',
        user: IDS.student2,
        score: null,
        feedback: null,
        daysAgo: 5,
      },
      {
        assignment: 'eng_essay1',
        user: IDS.student3,
        score: 78,
        feedback:
          'Good structure but thesis could be more focused. Work on transitions between paragraphs.',
        daysAgo: 5,
      },
      // Alex's pending submission (not yet due)
      {
        assignment: 'eng_essay2',
        user: IDS.student,
        score: null,
        feedback: null,
        daysAgo: 0,
      },
    ];

    for (const s of submissions) {
      const aId = assignmentIds[s.assignment];
      const submitted = past(s.daysAgo);
      await qr.query(
        `INSERT INTO submissions (id, "tenantId", "assignmentId", "userId", attempt, content, "submittedAt", score, "gradedAt", "gradedBy", feedback, "createdAt", "updatedAt")
         VALUES (uuid_generate_v4(),$1,$2,$3,1,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT DO NOTHING`,
        [
          IDS.tenant,
          aId,
          s.user,
          JSON.stringify({ text: 'Submitted via Axis', files: [] }),
          submitted,
          s.score,
          s.score !== null ? submitted : null,
          s.score !== null ? IDS.instructor : null,
          s.feedback,
          now,
          now,
        ],
      );
    }
    console.log(`  ${submissions.length} submissions created.`);

    // ─── 9. Announcements ──────────────────────────────────────
    const announcements = [
      [
        IDS.ann_cs101_welcome,
        IDS.cs101sec,
        IDS.instructor,
        'Welcome to CSC 110!',
        'Welcome to Fundamentals of Programming I! Please review the syllabus on the course page and come to the first class ready to code. Make sure you have Python 3.12+ installed.\n\nMy office hours are bookable right here in Axis — no email needed. In person Wednesdays (ECS 618) or on Zoom Thursdays.',
        'normal',
        false,
        past(30),
      ],
      [
        IDS.ann_cs101_midterm,
        IDS.cs101sec,
        IDS.instructor,
        'Midterm Study Guide Posted',
        'The midterm study guide has been posted under Module 3. It covers all topics from Modules 1-3. I recommend reviewing your homework solutions and the quiz.\n\nReview session: Friday 3-5 PM in ECS 123.',
        'urgent',
        true,
        past(1),
      ],
      [
        IDS.ann_cs101_officehours,
        IDS.cs101sec,
        IDS.ta,
        'Extra Office Hours This Week',
        "I'll be holding extra office hours this week to help with HW3:\n- Tuesday 4-6 PM\n- Thursday 4-6 PM\n\nLocation: CSC lab (ECS 258)",
        'normal',
        false,
        past(0),
      ],
      [
        IDS.ann_math201_update,
        IDS.math201sec,
        IDS.instructor2,
        'Calculus II — Course Update',
        "We're slightly ahead of schedule, which means we'll have an extra review session before the midterm. Problem Set 2 deadline extended to Friday.\n\nRemember: the textbook companion site has practice problems with solutions.",
        'normal',
        false,
        past(3),
      ],
      [
        IDS.ann_eng102_essay,
        IDS.eng102sec,
        IDS.instructor,
        'Essay 2 Guidelines Updated',
        "I've updated the Essay 2 guidelines based on your questions in class. Key changes:\n- Minimum 4 sources (was 3)\n- APA format (not MLA as originally stated)\n- Proposal due date unchanged\n\nPlease re-download the assignment sheet.",
        'normal',
        false,
        past(2),
      ],
      [
        IDS.ann_phys150_lab,
        IDS.phys150sec,
        IDS.instructor2,
        'Lab Safety Reminder',
        'A reminder that closed-toe shoes are mandatory for all lab sessions. Two students were turned away last week. Please also review the lab safety document before Lab 2.',
        'urgent',
        false,
        past(5),
      ],
    ];

    for (const [
      annId,
      secId,
      authId,
      title,
      body,
      prio,
      pinned,
      created,
    ] of announcements) {
      await qr.query(
        `INSERT INTO announcements (id, "tenantId", "sectionId", "authorId", title, body, priority, pinned, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET title=$5, body=$6`,
        [
          annId,
          IDS.tenant,
          secId,
          authId,
          title,
          body,
          prio,
          pinned,
          created,
          now,
        ],
      );
    }
    console.log(`  ${announcements.length} announcements created.`);

    // ─── 9b. Office hours + busy blocks (FEAT-018/019) ─────────
    // Prof Chen teaches CSC 110 MWF 10:00–10:50 and ATWP 135 MW 14:00–15:15,
    // so these windows deliberately avoid her lectures (the API rejects overlaps).
    const officeHourBlocks = [
      // [id, dayOfWeek, startTime, endTime, slotMinutes, locationType, location, meetingUrl]
      [
        IDS.oh_chen_wed,
        'wed',
        '11:00',
        '12:00',
        15,
        'in_person',
        'ECS 618',
        null,
      ],
      [
        IDS.oh_chen_thu,
        'thu',
        '10:00',
        '12:00',
        20,
        'zoom',
        null,
        'https://zoom.us/j/5551234567',
      ],
    ];
    for (const [
      id,
      day,
      start,
      end,
      slot,
      locType,
      loc,
      url,
    ] of officeHourBlocks) {
      await qr.query(
        `INSERT INTO office_hour_blocks (id, "tenantId", "instructorId", "dayOfWeek", "startTime", "endTime", "slotMinutes", "locationType", location, "meetingUrl", active, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12)
         ON CONFLICT (id) DO UPDATE SET "dayOfWeek"=$4, "startTime"=$5, "endTime"=$6`,
        [
          id,
          IDS.tenant,
          IDS.instructor,
          day,
          start,
          end,
          slot,
          locType,
          loc,
          url,
          now,
          now,
        ],
      );
    }

    // Busy Thu 10:00–11:00 overlaps the Thursday Zoom block on purpose: it
    // demonstrates FEAT-019 suppression — students only see slots from 11:00.
    const busyBlocks = [
      // [id, dayOfWeek, startTime, endTime, label]
      [IDS.busy_chen_research, 'tue', '13:00', '15:00', 'Research'],
      [IDS.busy_chen_meeting, 'thu', '10:00', '11:00', 'Department meeting'],
    ];
    for (const [id, day, start, end, label] of busyBlocks) {
      await qr.query(
        `INSERT INTO busy_blocks (id, "tenantId", "instructorId", "dayOfWeek", "startTime", "endTime", label, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET "dayOfWeek"=$4, "startTime"=$5, "endTime"=$6, label=$7`,
        [id, IDS.tenant, IDS.instructor, day, start, end, label, now, now],
      );
    }
    // FEAT-020: one booked appointment (Alex → Prof Chen, next Wednesday
    // 11:00) so the home feed and reminders have a real appointment to show.
    // Date is computed at seed time so the demo never goes stale.
    const nextWednesday = (() => {
      const d = new Date();
      d.setDate(d.getDate() + ((3 - d.getDay() + 7) % 7 || 7));
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${m}-${day}`;
    })();
    await qr.query(
      `INSERT INTO bookings (id, "tenantId", "blockId", "studentId", "instructorId", date, "startTime", "endTime", status, note, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,'11:00','11:15','booked',$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET date=$6, status='booked'`,
      [
        IDS.booking_alex,
        IDS.tenant,
        IDS.oh_chen_wed,
        IDS.student,
        IDS.instructor,
        nextWednesday,
        'Question about HW3 — linked list edge cases',
        now,
        now,
      ],
    );
    console.log('  2 office-hour blocks + 2 busy blocks + 1 booking created.');

    // ─── 10. Degree Program ────────────────────────────────────
    const csRequirements = JSON.stringify([
      {
        name: 'Core CS Requirements',
        type: 'core',
        creditsRequired: 9,
        courseIds: [IDS.cs101, IDS.cs201, IDS.cs301],
        minCoursesRequired: 3,
        description: 'All three core CS courses must be completed.',
      },
      {
        name: 'Mathematics Requirements',
        type: 'core',
        creditsRequired: 8,
        courseIds: [IDS.math101, IDS.math201],
        minCoursesRequired: 2,
        description: 'Calculus I and II are required for all CS majors.',
      },
      {
        name: 'Science Requirement',
        type: 'general_education',
        creditsRequired: 4,
        courseIds: [IDS.phys150],
        minCoursesRequired: 1,
        description: 'At least one lab science course.',
      },
      {
        name: 'Writing Requirement',
        type: 'general_education',
        creditsRequired: 3,
        courseIds: [IDS.eng102],
        minCoursesRequired: 1,
        description: 'Academic writing proficiency.',
      },
    ]);

    await qr.query(
      `INSERT INTO degree_programs (id, "tenantId", name, code, department, description, "totalCreditsRequired", requirements, status, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET name=$3, code=$4, description=$6`,
      [
        IDS.csBS,
        IDS.tenant,
        'BSc in Computer Science',
        'BSC-CSC',
        'Computer Science',
        'Bachelor of Science in Computer Science. Prepares students for careers in software engineering, data science, and systems design.',
        120,
        csRequirements,
        'active',
        now,
        now,
      ],
    );
    console.log('  1 degree program created.');

    // ─── 11. Student Degree Profile ────────────────────────────
    await qr.query(
      `INSERT INTO student_degree_profiles (id, "tenantId", "userId", "degreeProgramId", "enrollmentYear", "expectedGraduationYear", "completedCourseIds", "currentCourseIds", status, notes, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET "completedCourseIds"=$7`,
      [
        IDS.studentProfile,
        IDS.tenant,
        IDS.student,
        IDS.csBS,
        2025,
        2028,
        JSON.stringify([IDS.math101, IDS.cs101]),
        JSON.stringify([IDS.cs101, IDS.math201, IDS.eng102, IDS.phys150]),
        'active',
        'Strong start. Completed CSC 110 with A- in Spring 2026. On track for 4-year graduation.',
        now,
        now,
      ],
    );
    console.log('  1 student degree profile created.');

    // ─── 12. AI Config ─────────────────────────────────────────
    await qr.query(
      `INSERT INTO tenant_ai_configs (id, "tenantId", enabled, "toolOverrides", "maxRequestsPerMinute", "maxTokensPerDay", "monthlyBudgetUsd", "createdAt", "updatedAt")
       VALUES (uuid_generate_v4(),$1,true,$2,30,500000,50.00,$3,$4)
       ON CONFLICT DO NOTHING`,
      [IDS.tenant, '{}', now, now],
    );
    console.log('  1 tenant AI config created.');

    await qr.commitTransaction();
    console.log('\nSeed complete! Here are your login credentials:');
    console.log('─'.repeat(50));
    console.log('  Student:    student@Axis.demo  / password123');
    console.log('  Instructor: prof.chen@Axis.demo / password123');
    console.log('  Admin:      admin@Axis.demo     / password123');
    console.log('  TA:         ta.jordan@Axis.demo / password123');
    console.log('─'.repeat(50));
    console.log('Open http://localhost:3000 and sign in!\n');
  } catch (err) {
    await qr.rollbackTransaction();
    console.error('Seed failed, rolled back:', err);
    process.exit(1);
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

void seed();
