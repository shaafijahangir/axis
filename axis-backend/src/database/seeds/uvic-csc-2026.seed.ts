/**
 * UVic CSC Major (Sept 2026 entry) seed
 *
 * WHY: Loads a real UVic worksheet and a real student record into the demo
 * tenant so the degree planner can be checked against a known answer.
 * The student and grades are fictional.
 *
 * USAGE: pnpm seed:uvic   (run `pnpm seed` first; idempotent, safe to rerun)
 *
 * CREDENTIALS: demo.cs@Axis.demo / password123
 *
 * LIMITS (the model cannot express these):
 *   - minimum grade C is enforced on Y1-Y3 groups only (CSC 360 D does not count)
 *   - level pools ("any CSC 4xx") are enumerated from the courses seeded here
 *   - IB transfer credit is a placeholder course, "XFER IB"
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { entities } from '../entities';

config();

const TENANT = '00000000-0000-0000-0000-000000000001';
const IDS = {
  student: '10000000-0000-0000-0000-0000000000a1',
  program: '70000000-0000-0000-0000-0000000000a1',
  profile: '80000000-0000-0000-0000-0000000000a1',
};

// [code, title, units]. Titles are best effort from the UVic calendar.
const COURSES: [string, string, number][] = [
  ['ATWP 135', 'Academic Reading and Writing', 1.5],
  ['ENSH 101', 'Academic Reading and Writing for Multilingual Students I', 1.5],
  [
    'ENSH 102',
    'Academic Reading and Writing for Multilingual Students II',
    1.5,
  ],
  ['CSC 106', 'The Practice of Computer Science', 1.5],
  ['CSC 110', 'Fundamentals of Programming I', 1.5],
  ['CSC 115', 'Fundamentals of Programming II', 1.5],
  ['CSC 120', 'Fundamentals of Programming (Accelerated)', 1.5],
  ['ED-D 101', 'Introduction to Educational Psychology', 1.5],
  ['MATH 100', 'Calculus I', 1.5],
  ['MATH 101', 'Calculus II', 1.5],
  ['MATH 109', 'Introduction to Calculus', 1.5],
  ['MATH 122', 'Logic and Foundations', 1.5],
  ['CSC 225', 'Algorithms and Data Structures I', 1.5],
  ['CSC 226', 'Algorithms and Data Structures II', 1.5],
  ['CSC 230', 'Introduction to Computer Architecture', 1.5],
  ['SENG 265', 'Software Development Methods', 1.5],
  ['ENGR 240', 'Technical Writing', 1.5],
  ['MATH 202', 'Calculus III', 1.5],
  ['MATH 204', 'Calculus IV', 1.5],
  ['MATH 211', 'Matrix Algebra I', 1.5],
  ['STAT 260', 'Introduction to Probability and Statistics I', 1.5],
  ['HLTH 251', 'Health Studies', 1.5],
  ['CSC 305', 'Introduction to Computer Graphics', 1.5],
  ['CSC 320', 'Foundations of Computer Science', 1.5],
  ['CSC 321', 'Foundations of Computer Science II', 1.5],
  ['CSC 330', 'Programming Languages', 1.5],
  ['CSC 355', 'Digital Logic and Computer Organization', 1.5],
  ['CSC 360', 'Operating Systems', 1.5],
  ['CSC 361', 'Computer Communications and Networks', 1.5],
  ['CSC 370', 'Database Systems', 1.5],
  ['SENG 310', 'Human Computer Interaction', 1.5],
  ['SENG 321', 'Requirements Engineering', 1.5],
  ['SENG 365', 'Web Development', 1.5],
  ['SENG 371', 'Software Evolution', 1.5],
  ['EDCI 337', 'Interactive and Multimedia Learning', 1.5],
  ['EDCI 338', 'Social Media and Personal Learning Networks', 1.5],
  ['EDCI 339', 'Distributed and Open Learning', 1.5],
  ['TS 300', 'Technology and Society', 1.5],
  ['CSC 412', 'Topics in Computer Science', 1.5],
  ['CSC 421', 'Introduction to Artificial Intelligence', 1.5],
  ['CSC 425', 'Analysis of Algorithms', 1.5],
  ['CSC 460', 'Design and Analysis of Real-time Systems', 1.5],
  ['SENG 468', 'Software System Scalability', 1.5],
  ['SENG 474', 'Data Mining', 1.5],
  ['EDCI 495', 'Topics in Curriculum and Instruction', 1.5],
  ['XFER IB', 'IB Transfer Credit (unassigned)', 12],
];

// Fictional demo grades (not a real record). Test cases: CSC 360 D (fails
// min C), CSC 320 C (counts), EDCI 495 COM (co-op style pass). XFER IB is transfer credit, recorded as CR.
const COMPLETED: [string, string][] = [
  ['ATWP 135', 'B+'],
  ['CSC 106', 'B'],
  ['ED-D 101', 'A'],
  ['MATH 122', 'B-'],
  ['CSC 225', 'C+'],
  ['MATH 109', 'B+'],
  ['CSC 230', 'B'],
  ['MATH 101', 'C+'],
  ['SENG 265', 'A-'],
  ['CSC 226', 'B+'],
  ['EDCI 337', 'B'],
  ['EDCI 338', 'A-'],
  ['ENGR 240', 'B-'],
  ['HLTH 251', 'B+'],
  ['CSC 370', 'C+'],
  ['EDCI 339', 'B'],
  ['MATH 211', 'C+'],
  ['STAT 260', 'B-'],
  ['CSC 305', 'A'],
  ['CSC 320', 'C'],
  ['SENG 310', 'B+'],
  ['CSC 355', 'B'],
  ['CSC 361', 'A-'],
  ['MATH 202', 'B'],
  ['SENG 321', 'A-'],
  ['CSC 360', 'D'],
  ['SENG 371', 'B+'],
  ['SENG 468', 'B'],
  ['TS 300', 'A'],
  ['CSC 412', 'B+'],
  ['EDCI 495', 'COM'],
  ['SENG 474', 'A-'],
  ['XFER IB', 'CR'],
];

const level = (code: string): number | null => {
  const m = code.match(/(\d)\d\d$/);
  return m ? Number(m[1]) * 100 : null;
};

async function seedUvic() {
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
  const qr = ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    const now = new Date();
    const id: Record<string, string> = {};

    // ─── Courses (upsert by code, so demo rows like CSC 110 are reused) ───
    for (const [code, title, units] of COURSES) {
      const [row] = await qr.query(
        `INSERT INTO courses (id, "tenantId", code, title, credits, "departmentId", "courseLevel", settings, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,'{}',$7,$7)
         ON CONFLICT ("tenantId", code) DO UPDATE SET title=$3, credits=$4, "courseLevel"=$6
         RETURNING id`,
        [TENANT, code, title, units, code.split(' ')[0], level(code), now],
      );
      id[code] = row.id;
    }
    console.log(`  ${COURSES.length} UVic courses upserted.`);

    const ids = (codes: string[]) => codes.map((c) => id[c]);
    const group = (
      name: string,
      type: string,
      codes: string[],
      minCoursesRequired: number,
      creditsRequired: number,
      description?: string,
      minGrade: string | null = null,
    ) => ({
      name,
      type,
      creditsRequired,
      courseIds: ids(codes),
      minCoursesRequired,
      description,
      minGrade,
    });

    // Level pools are enumerated from the seeded catalog and kept disjoint
    // so the planner never counts one course in two groups.
    const all = COURSES.map(([c]) => c);
    const y3 = [
      'CSC 305',
      'CSC 320',
      'CSC 321',
      'CSC 330',
      'CSC 360',
      'CSC 361',
      'CSC 370',
      'SENG 310',
      'SENG 365',
    ];
    const named = new Set([
      'CSC 110',
      'CSC 115',
      'CSC 120',
      'ATWP 135',
      'ENSH 101',
      'ENSH 102',
      'MATH 100',
      'MATH 109',
      'MATH 101',
      'MATH 122',
      'CSC 225',
      'CSC 226',
      'CSC 230',
      'SENG 265',
      'ENGR 240',
      'MATH 202',
      'MATH 204',
      'MATH 211',
      'STAT 260',
      ...y3,
    ]);
    const csc4 = all.filter((c) => /^CSC 4/.test(c));
    const seng4 = all.filter((c) => /^SENG 4/.test(c));
    const rest = all.filter(
      (c) => !named.has(c) && !csc4.includes(c) && !seng4.includes(c),
    );
    const upper = rest.filter((c) => (level(c) ?? 0) >= 300);
    const anyLevel = rest.filter((c) => !upper.includes(c));

    const C = 'C';
    const requirements = [
      group('Y1: CSC 110', 'core', ['CSC 110'], 1, 1.5, undefined, C),
      group('Y1: CSC 115', 'core', ['CSC 115'], 1, 1.5, undefined, C),
      group('Y1: CSC 120', 'core', ['CSC 120'], 1, 1.5, undefined, C),
      group(
        'Y1: ATWP 135 or ENSH 101 or ENSH 102',
        'core',
        ['ATWP 135', 'ENSH 101', 'ENSH 102'],
        1,
        1.5,
        undefined,
        C,
      ),
      group(
        'Y1: MATH 100 or MATH 109',
        'core',
        ['MATH 100', 'MATH 109'],
        1,
        1.5,
        undefined,
        C,
      ),
      group('Y1: MATH 101', 'core', ['MATH 101'], 1, 1.5, undefined, C),
      group('Y1: MATH 122', 'core', ['MATH 122'], 1, 1.5, undefined, C),
      group(
        'Y2: required',
        'core',
        [
          'CSC 225',
          'CSC 226',
          'CSC 230',
          'SENG 265',
          'ENGR 240',
          'MATH 211',
          'STAT 260',
        ],
        7,
        10.5,
        undefined,
        C,
      ),
      group(
        'Y2: MATH 202 or MATH 204',
        'core',
        ['MATH 202', 'MATH 204'],
        1,
        1.5,
        undefined,
        C,
      ),
      group(
        'Y3: choose 7',
        'concentration',
        y3,
        7,
        10.5,
        'Minimum grade C.',
        C,
      ),
      group('Y4: 2 courses CSC 4xx', 'concentration', csc4, 2, 3),
      group(
        'Y4: 1 course CSC or SENG 4xx',
        'concentration',
        seng4,
        1,
        1.5,
        'Pool lists SENG 4xx only; a third CSC 4xx cannot count here.',
      ),
      group('Y4: 6.0 units 300/400 electives', 'elective', upper, 0, 6),
      group(
        'Electives (any level)',
        'elective',
        anyLevel,
        0,
        16.5,
        'Includes 12.0 units IB transfer credit.',
      ),
    ];

    await qr.query(
      `INSERT INTO degree_programs (id, "tenantId", name, code, department, description, "programType", "totalCreditsRequired", "catalogYear", requirements, status, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,'major',60,'2026-2027',$7,'active',$8,$8)
       ON CONFLICT (id) DO UPDATE SET name=$3, code=$4, description=$6, requirements=$7`,
      [
        IDS.program,
        TENANT,
        'BSc Computer Science Major (UVic, Sept 2026 entry)',
        'UVIC-CSC-26',
        'Computer Science',
        'Mirrors the UVic 2026 CS Major worksheet. 60.0 units, 21.0 at 300/400 level, minimum grade C in required CSC/SENG/MATH/STAT/English.',
        JSON.stringify(requirements),
        now,
      ],
    );

    // ─── Student + profile ───
    const passwordHash = await bcrypt.hash('password123', 10);
    // Upsert by fixed id: an earlier run's user on this id is renamed in
    // place to the fictional demo student (idempotent cleanup).
    // A user already holding the demo email on another id would break the
    // unique email index: update that row instead of inserting a new one.
    const byEmail: { id: string }[] = await qr.query(
      `SELECT id FROM users WHERE lower(email)=lower('demo.cs@Axis.demo') AND id<>$1 LIMIT 1`,
      [IDS.student],
    );
    const studentId = byEmail[0]?.id ?? IDS.student;
    await qr.query(
      `INSERT INTO users (id, "tenantId", email, "passwordHash", "firstName", "lastName", roles, profile, preferences, status, "createdAt", "updatedAt")
       VALUES ($1,$2,'demo.cs@Axis.demo',$3,'Demo','Student','{student}','{}','{}','active',$4,$4)
       ON CONFLICT (id) DO UPDATE SET email='demo.cs@Axis.demo', "passwordHash"=$3, "firstName"='Demo', "lastName"='Student'`,
      [studentId, TENANT, passwordHash, now],
    );

    await qr.query(
      `INSERT INTO student_degree_profiles (id, "tenantId", "userId", "degreeProgramId", "enrollmentYear", "expectedGraduationYear", "completedCourseIds", "completedCourses", "currentCourseIds", status, notes, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,2020,2026,$5,$6,'[]','active',$7,$8,$8)
       ON CONFLICT (id) DO UPDATE SET "enrollmentYear"=2020, "catalogYear"=NULL, "completedCourseIds"=$5, "completedCourses"=$6, notes=$7`,
      [
        IDS.profile,
        TENANT,
        studentId,
        IDS.program,
        JSON.stringify(ids(COMPLETED.map(([c]) => c))),
        JSON.stringify(
          COMPLETED.map(([c, grade]) => ({ courseId: id[c], grade })),
        ),
        '12.0 units IB transfer credit, unmapped (XFER IB).',
        now,
      ],
    );

    await qr.commitTransaction();
    console.log('  UVic CSC program and Demo Student profile seeded.');
    console.log('  Login: demo.cs@Axis.demo / password123');
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
    await ds.destroy();
  }
}

seedUvic().catch((err) => {
  console.error('UVic seed failed:', err);
  process.exit(1);
});
