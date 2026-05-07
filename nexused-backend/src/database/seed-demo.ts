/**
 * Demo Seed Script — Realistic School Volume
 *
 * Creates a full school with 60 students, 6 instructors, 10 courses,
 * 10 sections, ~180 enrollments, and hundreds of assignments + submissions.
 * Uses random data from name/subject pools — no external dependencies.
 *
 * USAGE: npm run seed:demo
 *
 * NOTE: Runs seed.ts first (primary demo user accounts + fixed structure).
 * Then adds the bulk realistic population on top.
 *
 * Primary demo accounts remain from seed.ts:
 *   student@nexused.demo  / password123
 *   prof.chen@nexused.demo / password123
 *   admin@nexused.demo     / password123
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { entities } from './entities';

config();

// ─── Data Pools ──────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Aaliyah',
  'Adrian',
  'Aisha',
  'Alexander',
  'Alexis',
  'Aliyah',
  'Amanda',
  'Amara',
  'Andre',
  'Angela',
  'Aria',
  'Ashley',
  'Brianna',
  'Brooklyn',
  'Cameron',
  'Carlos',
  'Charlotte',
  'Chloe',
  'Christian',
  'Christopher',
  'Clara',
  'Daniel',
  'David',
  'Diana',
  'Diego',
  'Dylan',
  'Elena',
  'Elijah',
  'Elizabeth',
  'Emily',
  'Emma',
  'Ethan',
  'Fatima',
  'Gabriel',
  'Grace',
  'Hannah',
  'Harper',
  'Hayden',
  'Isaac',
  'Isabella',
  'Isaiah',
  'Jasmine',
  'Jason',
  'Jaylen',
  'Jennifer',
  'Jessica',
  'Jordan',
  'Joshua',
  'Julian',
  'Kayla',
  'Kevin',
  'Kylie',
  'Leilani',
  'Liam',
  'Lily',
  'Lucas',
  'Luna',
  'Madison',
  'Marcus',
  'Maya',
  'Michael',
  'Michelle',
  'Miguel',
  'Miles',
  'Mohammed',
  'Morgan',
  'Naomi',
  'Nathan',
  'Natalie',
  'Nicholas',
  'Noah',
  'Olivia',
  'Omar',
  'Patricia',
  'Priya',
  'Rachel',
  'Rebecca',
  'Riley',
  'Ryan',
  'Samantha',
  'Samuel',
  'Santiago',
  'Sarah',
  'Savannah',
  'Skylar',
  'Sofia',
  'Sophia',
  'Stephanie',
  'Steven',
  'Taylor',
  'Thomas',
  'Tiffany',
  'Tyler',
  'Victoria',
  'William',
  'Yasmine',
  'Zoe',
  'Zuri',
];

const LAST_NAMES = [
  'Adams',
  'Allen',
  'Anderson',
  'Baker',
  'Brown',
  'Campbell',
  'Carter',
  'Chen',
  'Clark',
  'Collins',
  'Cooper',
  'Davis',
  'Edwards',
  'Evans',
  'Flores',
  'Foster',
  'Garcia',
  'Gonzalez',
  'Green',
  'Hall',
  'Harris',
  'Hernandez',
  'Hill',
  'Howard',
  'Jackson',
  'James',
  'Johnson',
  'Jones',
  'Kim',
  'King',
  'Kumar',
  'Lee',
  'Lewis',
  'Lopez',
  'Martin',
  'Martinez',
  'Miller',
  'Mitchell',
  'Moore',
  'Morgan',
  'Morris',
  'Nelson',
  'Nguyen',
  'Parker',
  'Patel',
  'Perez',
  'Phillips',
  'Powell',
  'Robinson',
  'Rodriguez',
  'Rogers',
  'Sanchez',
  'Scott',
  'Singh',
  'Smith',
  'Stewart',
  'Taylor',
  'Thomas',
  'Thompson',
  'Torres',
  'Turner',
  'Walker',
  'Washington',
  'White',
  'Williams',
  'Wilson',
  'Wright',
  'Young',
  'Zhang',
];

const INSTRUCTOR_TITLES = ['Prof.', 'Dr.', 'Dr.', 'Dr.'];

const COURSE_CATALOG = [
  {
    code: 'CS102',
    title: 'Introduction to Java Programming',
    dept: 'Computer Science',
    credits: 3,
    desc: 'Object-oriented programming using Java. Topics include classes, inheritance, interfaces, and collections.',
  },
  {
    code: 'CS210',
    title: 'Web Development Fundamentals',
    dept: 'Computer Science',
    credits: 3,
    desc: 'HTML, CSS, JavaScript, and modern front-end frameworks. Build responsive, interactive web applications.',
  },
  {
    code: 'CS310',
    title: 'Database Systems',
    dept: 'Computer Science',
    credits: 3,
    desc: 'Relational databases, SQL, normalization, transactions, and introduction to NoSQL systems.',
  },
  {
    code: 'CS350',
    title: 'Software Engineering',
    dept: 'Computer Science',
    credits: 3,
    desc: 'Agile methodologies, version control, testing, CI/CD, and collaborative software development.',
  },
  {
    code: 'MATH220',
    title: 'Linear Algebra',
    dept: 'Mathematics',
    credits: 3,
    desc: 'Vector spaces, linear transformations, matrices, eigenvalues, and applications in data science.',
  },
  {
    code: 'MATH301',
    title: 'Probability & Statistics',
    dept: 'Mathematics',
    credits: 3,
    desc: 'Probability theory, distributions, hypothesis testing, and regression analysis.',
  },
  {
    code: 'BIO110',
    title: 'Cell Biology',
    dept: 'Biology',
    credits: 4,
    desc: 'Structure and function of cells, molecular biology fundamentals, genetics, and cell signaling.',
  },
  {
    code: 'CHEM105',
    title: 'General Chemistry I',
    dept: 'Chemistry',
    credits: 4,
    desc: 'Atomic structure, chemical bonding, stoichiometry, thermochemistry, and states of matter.',
  },
  {
    code: 'ECON101',
    title: 'Principles of Microeconomics',
    dept: 'Economics',
    credits: 3,
    desc: 'Supply and demand, market structures, consumer behavior, and market failures.',
  },
  {
    code: 'PSYC100',
    title: 'Introduction to Psychology',
    dept: 'Psychology',
    credits: 3,
    desc: 'Biological bases of behavior, sensation, perception, memory, cognition, and personality.',
  },
];

const ASSIGNMENT_TEMPLATES = [
  { title: 'Problem Set 1', type: 'assignment', points: 100 },
  { title: 'Problem Set 2', type: 'assignment', points: 100 },
  { title: 'Problem Set 3', type: 'assignment', points: 100 },
  { title: 'Quiz 1', type: 'quiz', points: 50 },
  { title: 'Quiz 2', type: 'quiz', points: 50 },
  { title: 'Midterm Exam', type: 'exam', points: 150 },
  { title: 'Lab Report 1', type: 'assignment', points: 75 },
  { title: 'Final Project', type: 'project', points: 200 },
];

const FEEDBACK_TEMPLATES = [
  'Good work overall. See inline comments for specific suggestions.',
  'Strong performance. Your analysis section was particularly well done.',
  'Solid effort. Review the grading rubric for areas where points were deducted.',
  'Well organized and clearly written. Minor errors noted in calculations.',
  'Good understanding of the core concepts. Push further on the application portion.',
  'Thorough and detailed. A few conceptual gaps to address before the next assignment.',
  'Excellent critical thinking demonstrated throughout.',
  'Satisfactory work. Focus on showing your reasoning more explicitly.',
];

// ─── Utilities ────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID();

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function daysFromNow(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

function generateScore(pointsPossible: number): number {
  // Normally distributed around 78% with variance
  const pct = Math.max(0.45, Math.min(1.0, 0.78 + (Math.random() - 0.5) * 0.4));
  return Math.round(pct * pointsPossible);
}

// ─── Main Seed ────────────────────────────────────────────────────────────────

async function seedDemo() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'nexused',
    schema: process.env.DATABASE_SCHEMA || 'public',
    entities,
    synchronize: false,
    logging: false,
  });

  await ds.initialize();
  console.log('Connected to database.');

  // Use the fixed demo tenant UUID created by seed.ts
  const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const tenantResult = await ds.query<{ id: string }[]>(
    `SELECT id FROM tenants WHERE id = $1`,
    [DEMO_TENANT_ID],
  );
  if (!tenantResult.length) {
    console.error(
      'No tenant found. Run "npm run seed" first to create the base demo data.',
    );
    process.exit(1);
  }
  const tenantId = tenantResult[0].id;
  console.log(`Using tenant: ${tenantId}`);

  // Resolve the current academic term
  const termResult = await ds.query<{ id: string }[]>(
    `SELECT id FROM academic_terms WHERE "tenantId" = $1 AND "isCurrent" = true LIMIT 1`,
    [tenantId],
  );
  if (!termResult.length) {
    console.error('No current term found. Run "npm run seed" first.');
    process.exit(1);
  }
  const termId = termResult[0].id;

  const passwordHash = await bcrypt.hash('password123', 10);
  const now = new Date();

  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    // ─── 1. Instructors ─────────────────────────────────────────
    const usedNames = new Set<string>();
    const instructorIds: string[] = [];

    for (let i = 0; i < 6; i++) {
      let first: string, last: string, key: string;
      do {
        first = pick(FIRST_NAMES);
        last = pick(LAST_NAMES);
        key = `${first}-${last}`;
      } while (usedNames.has(key));
      usedNames.add(key);

      const title = pick(INSTRUCTOR_TITLES);
      const id = uuid();
      instructorIds.push(id);
      const emailSlug = `${first.toLowerCase()}.${last.toLowerCase()}${i}`;

      await qr.query(
        `INSERT INTO users (id, "tenantId", email, "passwordHash", "firstName", "lastName", roles, profile, preferences, status, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,'{instructor}',$7,'{}','active',$8,$9)
         ON CONFLICT (email, "tenantId") DO NOTHING`,
        [
          id,
          tenantId,
          `${emailSlug}@nexused.demo`,
          passwordHash,
          first,
          last,
          JSON.stringify({
            bio: `${title} ${last}, Department of ${pick(['Computer Science', 'Mathematics', 'Sciences', 'Humanities'])}`,
          }),
          now,
          now,
        ],
      );
    }
    console.log(`  ${instructorIds.length} instructors created.`);

    // ─── 2. Students ─────────────────────────────────────────────
    const studentIds: string[] = [];

    for (let i = 0; i < 60; i++) {
      let first: string, last: string, key: string;
      do {
        first = pick(FIRST_NAMES);
        last = pick(LAST_NAMES);
        key = `${first}-${last}-stu`;
      } while (usedNames.has(key));
      usedNames.add(key);

      const id = uuid();
      studentIds.push(id);

      await qr.query(
        `INSERT INTO users (id, "tenantId", email, "passwordHash", "firstName", "lastName", roles, profile, preferences, status, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,'{student}',$7,'{}','active',$8,$9)
         ON CONFLICT (email, "tenantId") DO NOTHING`,
        [
          id,
          tenantId,
          `${first.toLowerCase()}.${last.toLowerCase()}${i}@student.nexused.demo`,
          passwordHash,
          first,
          last,
          JSON.stringify({ bio: `Year ${randInt(1, 4)} student` }),
          now,
          now,
        ],
      );
    }
    console.log(`  ${studentIds.length} students created.`);

    // ─── 3. Courses ───────────────────────────────────────────────
    const courseIds: string[] = [];

    for (const course of COURSE_CATALOG) {
      const id = uuid();
      courseIds.push(id);
      await qr.query(
        `INSERT INTO courses (id, "tenantId", code, title, description, credits, "departmentId", settings, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,'{}',$8,$9)
         ON CONFLICT ("tenantId", code) DO NOTHING`,
        [
          id,
          tenantId,
          course.code,
          course.title,
          course.desc,
          course.credits,
          course.dept,
          now,
          now,
        ],
      );
    }
    console.log(`  ${courseIds.length} courses created.`);

    // Re-fetch actual course IDs (conflict-do-nothing may have skipped some inserts)
    // Must use qr.query to read within the same transaction
    const fetchedCourses = (await qr.query(
      `SELECT id, code FROM courses WHERE "tenantId" = $1 AND code = ANY($2::text[])`,
      [tenantId, COURSE_CATALOG.map((c) => c.code)],
    )) as { id: string; code: string }[];
    const courseMap = new Map(fetchedCourses.map((c) => [c.code, c.id]));

    // ─── 4. Sections ──────────────────────────────────────────────
    const sectionIds: string[] = [];
    const sectionToInstructor = new Map<string, string>();
    const schedules = [
      '{"days":["Mon","Wed","Fri"],"time":"08:00-08:50"}',
      '{"days":["Mon","Wed","Fri"],"time":"10:00-10:50"}',
      '{"days":["Mon","Wed","Fri"],"time":"13:00-13:50"}',
      '{"days":["Tue","Thu"],"time":"09:30-10:45"}',
      '{"days":["Tue","Thu"],"time":"11:00-12:15"}',
      '{"days":["Tue","Thu"],"time":"14:00-15:15"}',
    ];
    const buildings = [
      'Science Hall',
      'Math Building',
      'Humanities',
      'Engineering',
      'Social Sciences',
    ];

    for (const course of COURSE_CATALOG) {
      const courseId = courseMap.get(course.code);
      if (!courseId) continue;

      const instrId = pick(instructorIds);
      const id = uuid();
      sectionIds.push(id);
      sectionToInstructor.set(id, instrId);

      await qr.query(
        `INSERT INTO course_sections (id, "courseId", "instructorId", "termId", schedule, location, capacity, status, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9)`,
        [
          id,
          courseId,
          instrId,
          termId,
          pick(schedules),
          `${pick(buildings)} ${randInt(100, 399)}`,
          randInt(25, 45),
          now,
          now,
        ],
      );
    }
    console.log(`  ${sectionIds.length} sections created.`);

    // ─── 5. Enrollments ───────────────────────────────────────────
    let enrollmentCount = 0;

    for (const studentId of studentIds) {
      const numCourses = randInt(3, 5);
      const enrolled = shuffle(sectionIds).slice(0, numCourses);

      for (const sectionId of enrolled) {
        await qr.query(
          `INSERT INTO enrollments (id, "tenantId", "userId", "sectionId", role, status, "enrolledAt", "createdAt", "updatedAt")
           VALUES (uuid_generate_v4(),$1,$2,$3,'student','active',NOW(),$4,$5)
           ON CONFLICT DO NOTHING`,
          [tenantId, studentId, sectionId, now, now],
        );
        enrollmentCount++;
      }
    }

    // Instructors are linked via course_sections.instructorId FK, not via enrollments
    console.log(`  ~${enrollmentCount} student enrollments created.`);

    // ─── 6. Assignments ────────────────────────────────────────────
    const assignmentMap = new Map<
      string,
      Array<{ id: string; points: number }>
    >();

    for (const sectionId of sectionIds) {
      const sectionAssignments: Array<{ id: string; points: number }> = [];
      let weekOffset = -8;

      for (const tmpl of ASSIGNMENT_TEMPLATES) {
        const id = uuid();
        sectionAssignments.push({ id, points: tmpl.points });
        const dueAt = daysFromNow(weekOffset);
        weekOffset += randInt(7, 14);

        await qr.query(
          `INSERT INTO assignments (id, "tenantId", "sectionId", title, description, type, "pointsPossible", "dueAt", rubric, settings, "createdAt", "updatedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NULL,'{}',$9,$10)`,
          [
            id,
            tenantId,
            sectionId,
            tmpl.title,
            `Complete the ${tmpl.title.toLowerCase()} as outlined in the course materials.`,
            tmpl.type,
            tmpl.points,
            dueAt,
            now,
            now,
          ],
        );
      }
      assignmentMap.set(sectionId, sectionAssignments);
    }
    console.log(
      `  ${sectionIds.length * ASSIGNMENT_TEMPLATES.length} assignments created.`,
    );

    // ─── 7. Submissions (realistic grade distribution) ─────────────
    let submissionCount = 0;

    // Get all enrollments for the newly created sections
    // Must use qr.query to read within the same transaction
    const enrollmentRows = (await qr.query(
      `SELECT "userId", "sectionId" FROM enrollments
       WHERE "tenantId" = $1 AND "sectionId" = ANY($2::uuid[]) AND role = 'student'`,
      [tenantId, sectionIds],
    )) as { userId: string; sectionId: string }[];

    for (const row of enrollmentRows) {
      const assignments = assignmentMap.get(row.sectionId) ?? [];

      for (const assignment of assignments) {
        // 75% submission rate on past-due assignments
        if (Math.random() > 0.75) continue;

        const score = generateScore(assignment.points);
        const submittedAt = daysFromNow(randInt(-14, -1));
        const graded = Math.random() > 0.2; // 80% grading rate

        await qr.query(
          `INSERT INTO submissions (id, "tenantId", "assignmentId", "userId", attempt, content, "submittedAt", score, "gradedAt", "gradedBy", feedback, "createdAt", "updatedAt")
           VALUES (uuid_generate_v4(),$1,$2,$3,1,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT DO NOTHING`,
          [
            tenantId,
            assignment.id,
            row.userId,
            JSON.stringify({ text: 'Submitted via NexusEd', files: [] }),
            submittedAt,
            graded ? score : null,
            graded ? submittedAt : null,
            graded ? 'auto' : null,
            graded ? pick(FEEDBACK_TEMPLATES) : null,
            now,
            now,
          ],
        );
        submissionCount++;
      }
    }
    console.log(`  ~${submissionCount} submissions created.`);

    await qr.commitTransaction();
    console.log('\nDemo seed complete!');
    console.log('─'.repeat(60));
    console.log('  60 students, 6 instructors, 10 courses, 10 sections');
    console.log(
      `  ~${enrollmentCount} enrollments, ~${submissionCount} submissions`,
    );
    console.log(
      '\nLogin with any demo account from seed.ts (password: password123)',
    );
    console.log('or pick any student from the list (all use password123).\n');
  } catch (err) {
    await qr.rollbackTransaction();
    console.error('Demo seed failed, rolled back:', err);
    process.exit(1);
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

void seedDemo();
