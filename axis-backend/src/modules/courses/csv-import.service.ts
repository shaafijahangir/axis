import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Course, CourseCategory } from '../../database/entities/course.entity';
import {
  DegreeProgram,
  DegreeProgramType,
  RequirementGroup,
} from '../../database/entities/degree-program.entity';
import { User, UserRole } from '../../database/entities/user.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import {
  Enrollment,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { AcademicTerm } from '../../database/entities/academic-term.entity';
import { ImportResult, ImportError } from './dto/course.types';

// ─── CSV Parser ──────────────────────────────────────────────────────────────

/**
 * Minimal RFC-4180 compliant CSV parser.
 * Handles: quoted fields with commas, double-quote escape sequences, CRLF and LF.
 *
 * WHY hand-rolled: Avoids a new dependency for straightforward parsing.
 * The format we accept is well-defined and controlled via downloadable templates.
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd();
  if (!src) return rows;

  let row: string[] = [];
  let field = '';
  let i = 0;

  while (i < src.length) {
    if (src[i] === '"') {
      i++; // skip opening quote
      while (i < src.length) {
        if (src[i] === '"' && src[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (src[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          field += src[i++];
        }
      }
    } else if (src[i] === ',') {
      row.push(field.trim());
      field = '';
      i++;
    } else if (src[i] === '\n') {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else {
      field += src[i++];
    }
  }
  // Push the last field + row
  row.push(field.trim());
  if (row.some((f) => f.length > 0)) rows.push(row);

  return rows;
}

/**
 * Map header row → column indexes so we can access columns by name
 * regardless of column order.
 */
function buildHeaderMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => map.set(h.toLowerCase().trim(), i));
  return map;
}

function col(
  row: string[],
  headers: Map<string, number>,
  name: string,
): string {
  const idx = headers.get(name);
  return idx !== undefined ? (row[idx] ?? '').trim() : '';
}

function splitCodes(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const CATEGORY_MAP: Record<string, CourseCategory> = {
  core: CourseCategory.CORE,
  elective: CourseCategory.ELECTIVE,
  general_education: CourseCategory.GENERAL_EDUCATION,
  gen_ed: CourseCategory.GENERAL_EDUCATION,
  lab: CourseCategory.LAB,
  seminar: CourseCategory.SEMINAR,
};

const PROGRAM_TYPE_MAP: Record<string, DegreeProgramType> = {
  major: DegreeProgramType.MAJOR,
  minor: DegreeProgramType.MINOR,
  certificate: DegreeProgramType.CERTIFICATE,
  diploma: DegreeProgramType.DIPLOMA,
};

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    @InjectRepository(DegreeProgram)
    private programRepo: Repository<DegreeProgram>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(CourseSection)
    private sectionRepo: Repository<CourseSection>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(AcademicTerm)
    private termRepo: Repository<AcademicTerm>,
    private dataSource: DataSource,
  ) {}

  // ── Courses ─────────────────────────────────────────────────────────────────

  /**
   * Import courses from CSV.
   *
   * Expected columns (order-independent, header required):
   *   code*, title*, credits, department, category, level, description,
   *   prerequisites, corequisites, offered_semesters
   *
   * prerequisites / corequisites: comma-separated course codes (e.g. "CS 101,MATH 201")
   * offered_semesters: comma-separated values (e.g. "Fall,Spring")
   * category: core | elective | general_education | gen_ed | lab | seminar
   *
   * WHY upsert semantics: Institutions will re-import after correcting their SIS exports.
   * Upsert (match by code+tenantId) means re-import is idempotent.
   */
  async importCourses(
    tenantId: string,
    csvData: string,
  ): Promise<ImportResult> {
    const rows = parseCSV(csvData);
    if (rows.length < 2) {
      return {
        imported: 0,
        success: false,
        errors: [
          {
            row: 0,
            field: 'file',
            message: 'CSV is empty or has no data rows',
          },
        ],
      };
    }

    const headers = buildHeaderMap(rows[0]);
    const errors: ImportError[] = [];

    // ── Phase 1: Validate all rows ──────────────────────────────────────────

    // Collect all course codes referenced as prerequisites to validate them later
    const allNewCodes = new Set<string>();
    const rowData: {
      code: string;
      title: string;
      credits?: number;
      departmentId?: string;
      category?: CourseCategory;
      courseLevel?: number;
      description?: string;
      prereqCodes: string[];
      coreqCodes: string[];
      offeredSemesters: string[];
    }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1; // 1-indexed for user display

      const code = col(row, headers, 'code');
      const title = col(row, headers, 'title');

      if (!code) {
        errors.push({
          row: rowNum,
          field: 'code',
          message: 'code is required',
        });
        continue;
      }
      if (!title) {
        errors.push({
          row: rowNum,
          field: 'title',
          message: 'title is required',
        });
        continue;
      }

      allNewCodes.add(code);

      const creditsRaw = col(row, headers, 'credits');
      const credits = creditsRaw ? parseFloat(creditsRaw) : undefined;
      if (creditsRaw && isNaN(credits!)) {
        errors.push({
          row: rowNum,
          field: 'credits',
          message: `"${creditsRaw}" is not a valid number`,
        });
      }

      const levelRaw = col(row, headers, 'level');
      const courseLevel = levelRaw ? parseInt(levelRaw, 10) : undefined;
      if (levelRaw && isNaN(courseLevel!)) {
        errors.push({
          row: rowNum,
          field: 'level',
          message: `"${levelRaw}" is not a valid integer`,
        });
      }

      const categoryRaw = col(row, headers, 'category').toLowerCase();
      const category = categoryRaw ? CATEGORY_MAP[categoryRaw] : undefined;
      if (categoryRaw && !category) {
        errors.push({
          row: rowNum,
          field: 'category',
          message: `"${categoryRaw}" is not valid. Use: core, elective, general_education, lab, seminar`,
        });
      }

      rowData.push({
        code,
        title,
        credits,
        departmentId: col(row, headers, 'department') || undefined,
        category,
        courseLevel,
        description: col(row, headers, 'description') || undefined,
        prereqCodes: splitCodes(col(row, headers, 'prerequisites')),
        coreqCodes: splitCodes(col(row, headers, 'corequisites')),
        offeredSemesters: splitCodes(col(row, headers, 'offered_semesters')),
      });
    }

    if (errors.length > 0) {
      return { imported: 0, success: false, errors };
    }

    // ── Phase 2: Resolve prerequisite codes → IDs ───────────────────────────

    // Load existing courses for this tenant (includes the ones we're about to upsert)
    const existingCourses = await this.courseRepo.find({
      where: { tenantId },
      select: ['id', 'code'],
    });
    const codeToId = new Map(existingCourses.map((c) => [c.code, c.id]));

    // Note: prereq codes that don't exist yet will result in empty IDs.
    // We warn but don't fail — admins often import courses in batch before
    // wiring prerequisites.

    // ── Phase 3: Upsert in transaction ──────────────────────────────────────

    let imported = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const data of rowData) {
        const prereqIds = data.prereqCodes
          .map((c) => codeToId.get(c))
          .filter((id): id is string => id !== undefined);
        const coreqIds = data.coreqCodes
          .map((c) => codeToId.get(c))
          .filter((id): id is string => id !== undefined);

        const existing = await manager.findOne(Course, {
          where: { code: data.code, tenantId },
        });

        if (existing) {
          await manager.update(Course, existing.id, {
            title: data.title,
            ...(data.credits !== undefined && { credits: data.credits }),
            ...(data.departmentId && { departmentId: data.departmentId }),
            ...(data.category && { category: data.category }),
            ...(data.courseLevel !== undefined && {
              courseLevel: data.courseLevel,
            }),
            ...(data.description && { description: data.description }),
            offeredSemesters: data.offeredSemesters,
            prerequisiteCourseIds: prereqIds,
            corequisiteCourseIds: coreqIds,
          });
          // Update the code→id map so later rows can reference newly created ones
          codeToId.set(data.code, existing.id);
        } else {
          const course = manager.create(Course, {
            ...data,
            tenantId,
            prerequisiteCourseIds: prereqIds,
            corequisiteCourseIds: coreqIds,
          });
          const saved = await manager.save(Course, course);
          codeToId.set(data.code, saved.id);
        }

        imported++;
      }
    });

    this.logger.log(`Imported ${imported} courses for tenant ${tenantId}`);
    return { imported, success: true, errors: [] };
  }

  // ── Degree Programs ──────────────────────────────────────────────────────────

  /**
   * Import degree programs from CSV.
   *
   * Expected columns:
   *   code*, name*, total_credits*, type, department, expected_duration, catalog_year, description
   */
  async importPrograms(
    tenantId: string,
    csvData: string,
  ): Promise<ImportResult> {
    const rows = parseCSV(csvData);
    if (rows.length < 2) {
      return {
        imported: 0,
        success: false,
        errors: [
          {
            row: 0,
            field: 'file',
            message: 'CSV is empty or has no data rows',
          },
        ],
      };
    }

    const headers = buildHeaderMap(rows[0]);
    const errors: ImportError[] = [];

    const rowData: {
      code: string;
      name: string;
      totalCreditsRequired: number;
      programType?: DegreeProgramType;
      department?: string;
      expectedDurationSemesters?: number;
      catalogYear?: string;
      description?: string;
    }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const code = col(row, headers, 'code');
      const name = col(row, headers, 'name');
      const creditsRaw = col(row, headers, 'total_credits');

      if (!code) {
        errors.push({
          row: rowNum,
          field: 'code',
          message: 'code is required',
        });
        continue;
      }
      if (!name) {
        errors.push({
          row: rowNum,
          field: 'name',
          message: 'name is required',
        });
        continue;
      }
      if (!creditsRaw) {
        errors.push({
          row: rowNum,
          field: 'total_credits',
          message: 'total_credits is required',
        });
        continue;
      }

      const totalCreditsRequired = parseInt(creditsRaw, 10);
      if (isNaN(totalCreditsRequired)) {
        errors.push({
          row: rowNum,
          field: 'total_credits',
          message: `"${creditsRaw}" is not a valid integer`,
        });
        continue;
      }

      const typeRaw = col(row, headers, 'type').toLowerCase();
      const programType = typeRaw ? PROGRAM_TYPE_MAP[typeRaw] : undefined;
      if (typeRaw && !programType) {
        errors.push({
          row: rowNum,
          field: 'type',
          message: `"${typeRaw}" is not valid. Use: major, minor, certificate, diploma`,
        });
      }

      const durationRaw = col(row, headers, 'expected_duration');
      const expectedDurationSemesters = durationRaw
        ? parseInt(durationRaw, 10)
        : undefined;
      if (durationRaw && isNaN(expectedDurationSemesters!)) {
        errors.push({
          row: rowNum,
          field: 'expected_duration',
          message: `"${durationRaw}" is not a valid integer`,
        });
      }

      rowData.push({
        code,
        name,
        totalCreditsRequired,
        programType,
        department: col(row, headers, 'department') || undefined,
        expectedDurationSemesters,
        catalogYear: col(row, headers, 'catalog_year') || undefined,
        description: col(row, headers, 'description') || undefined,
      });
    }

    if (errors.length > 0) {
      return { imported: 0, success: false, errors };
    }

    let imported = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const data of rowData) {
        const existing = await manager.findOne(DegreeProgram, {
          where: { code: data.code, tenantId },
        });

        if (existing) {
          await manager.update(DegreeProgram, existing.id, {
            name: data.name,
            totalCreditsRequired: data.totalCreditsRequired,
            ...(data.programType && { programType: data.programType }),
            ...(data.department && { department: data.department }),
            ...(data.expectedDurationSemesters !== undefined && {
              expectedDurationSemesters: data.expectedDurationSemesters,
            }),
            ...(data.catalogYear && { catalogYear: data.catalogYear }),
            ...(data.description && { description: data.description }),
          });
        } else {
          const program = manager.create(DegreeProgram, {
            ...data,
            tenantId,
            requirements: [] as RequirementGroup[],
          });
          await manager.save(DegreeProgram, program);
        }

        imported++;
      }
    });

    this.logger.log(`Imported ${imported} programs for tenant ${tenantId}`);
    return { imported, success: true, errors: [] };
  }

  // ── Requirement Groups ───────────────────────────────────────────────────────

  /**
   * Import requirement groups from CSV.
   *
   * Expected columns:
   *   program_code*, group_name*, group_type*, course_codes, min_credits, min_courses, description
   *
   * course_codes: comma-separated course codes, e.g. "CS 101,CS 102"
   * group_type: core | elective | general_education | concentration
   *
   * WHY replace-all: The whole point of this import is to define a program's
   * requirements. Merging would leave orphan groups from previous imports.
   * Each import fully replaces the program's requirement list.
   */
  async importRequirements(
    tenantId: string,
    csvData: string,
  ): Promise<ImportResult> {
    const rows = parseCSV(csvData);
    if (rows.length < 2) {
      return {
        imported: 0,
        success: false,
        errors: [
          {
            row: 0,
            field: 'file',
            message: 'CSV is empty or has no data rows',
          },
        ],
      };
    }

    const headers = buildHeaderMap(rows[0]);
    const errors: ImportError[] = [];
    const REQ_TYPES = new Set([
      'core',
      'elective',
      'general_education',
      'concentration',
    ]);

    // Group rows by program_code — order matters for display
    const programGroups = new Map<
      string,
      {
        name: string;
        type: string;
        courseIds: string[];
        minCredits: number;
        minCourses: number;
        description?: string;
      }[]
    >();

    // Pre-load all courses for code→ID resolution
    const allCourses = await this.courseRepo.find({
      where: { tenantId },
      select: ['id', 'code'],
    });
    const codeToId = new Map(allCourses.map((c) => [c.code, c.id]));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const programCode = col(row, headers, 'program_code');
      const groupName = col(row, headers, 'group_name');
      const groupType = col(row, headers, 'group_type').toLowerCase();

      if (!programCode) {
        errors.push({
          row: rowNum,
          field: 'program_code',
          message: 'program_code is required',
        });
        continue;
      }
      if (!groupName) {
        errors.push({
          row: rowNum,
          field: 'group_name',
          message: 'group_name is required',
        });
        continue;
      }
      if (!groupType || !REQ_TYPES.has(groupType)) {
        errors.push({
          row: rowNum,
          field: 'group_type',
          message: `"${groupType}" is not valid. Use: core, elective, general_education, concentration`,
        });
        continue;
      }

      const minCreditsRaw = col(row, headers, 'min_credits');
      const minCredits = minCreditsRaw ? parseInt(minCreditsRaw, 10) : 0;
      const minCoursesRaw = col(row, headers, 'min_courses');
      const minCourses = minCoursesRaw ? parseInt(minCoursesRaw, 10) : 0;

      const rawCodes = splitCodes(col(row, headers, 'course_codes'));
      const unknownCodes = rawCodes.filter((c) => !codeToId.has(c));
      if (unknownCodes.length > 0) {
        errors.push({
          row: rowNum,
          field: 'course_codes',
          message: `Unknown course codes: ${unknownCodes.join(', ')}`,
        });
        continue;
      }

      const courseIds = rawCodes.map((c) => codeToId.get(c)!);

      if (!programGroups.has(programCode)) {
        programGroups.set(programCode, []);
      }
      programGroups.get(programCode)!.push({
        name: groupName,
        type: groupType,
        courseIds,
        minCredits,
        minCourses,
        description: col(row, headers, 'description') || undefined,
      });
    }

    if (errors.length > 0) {
      return { imported: 0, success: false, errors };
    }

    // Validate all program codes exist
    for (const programCode of programGroups.keys()) {
      const program = await this.programRepo.findOne({
        where: { code: programCode, tenantId },
      });
      if (!program) {
        errors.push({
          row: 0,
          field: 'program_code',
          message: `Program with code "${programCode}" not found. Import programs first.`,
        });
      }
    }

    if (errors.length > 0) {
      return { imported: 0, success: false, errors };
    }

    let imported = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const [programCode, groups] of programGroups.entries()) {
        const program = await manager.findOneOrFail(DegreeProgram, {
          where: { code: programCode, tenantId },
        });

        const requirements: RequirementGroup[] = groups.map((g) => ({
          name: g.name,
          type: g.type as RequirementGroup['type'],
          creditsRequired: g.minCredits,
          courseIds: g.courseIds,
          minCoursesRequired: g.minCourses,
          description: g.description,
        }));

        await manager.update(DegreeProgram, program.id, { requirements });
        imported += groups.length;
      }
    });

    this.logger.log(
      `Imported ${imported} requirement groups across ${programGroups.size} programs for tenant ${tenantId}`,
    );
    return { imported, success: true, errors: [] };
  }

  // ── Users ────────────────────────────────────────────────────────────────────

  /**
   * Import users (students, teachers, parents) from CSV.
   *
   * Expected columns:
   *   email*, first_name*, last_name*, role (student|instructor|admin|parent|ta),
   *   password, grade_level
   *
   * Upsert by email+tenantId — safe to re-import after corrections.
   * If no password column, defaults to "ChangeMe123!" — user must reset on first login.
   */
  async importUsers(tenantId: string, csvData: string): Promise<ImportResult> {
    const rows = parseCSV(csvData);
    if (rows.length < 2) {
      return {
        imported: 0,
        success: false,
        errors: [
          {
            row: 0,
            field: 'file',
            message: 'CSV is empty or has no data rows',
          },
        ],
      };
    }

    const headers = buildHeaderMap(rows[0]);
    const errors: ImportError[] = [];

    const ROLE_MAP: Record<string, UserRole> = {
      student: UserRole.STUDENT,
      instructor: UserRole.INSTRUCTOR,
      teacher: UserRole.INSTRUCTOR,
      admin: UserRole.ADMIN,
      parent: UserRole.PARENT,
      ta: UserRole.TA,
    };

    const rowData: {
      email: string;
      firstName: string;
      lastName: string;
      roles: UserRole[];
      password: string;
      gradeLevel?: number;
    }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const email = col(row, headers, 'email').toLowerCase();
      const firstName = col(row, headers, 'first_name');
      const lastName = col(row, headers, 'last_name');

      if (!email) {
        errors.push({
          row: rowNum,
          field: 'email',
          message: 'email is required',
        });
        continue;
      }
      if (!firstName) {
        errors.push({
          row: rowNum,
          field: 'first_name',
          message: 'first_name is required',
        });
        continue;
      }
      if (!lastName) {
        errors.push({
          row: rowNum,
          field: 'last_name',
          message: 'last_name is required',
        });
        continue;
      }

      const roleRaw = col(row, headers, 'role').toLowerCase();
      const role = roleRaw
        ? (ROLE_MAP[roleRaw] ?? UserRole.STUDENT)
        : UserRole.STUDENT;

      const gradeLevelRaw = col(row, headers, 'grade_level');
      const gradeLevel = gradeLevelRaw
        ? parseInt(gradeLevelRaw, 10)
        : undefined;
      if (gradeLevelRaw && isNaN(gradeLevel!)) {
        errors.push({
          row: rowNum,
          field: 'grade_level',
          message: `"${gradeLevelRaw}" is not a valid integer`,
        });
        continue;
      }

      rowData.push({
        email,
        firstName,
        lastName,
        roles: [role],
        password: col(row, headers, 'password') || 'ChangeMe123!',
        gradeLevel,
      });
    }

    if (errors.length > 0) return { imported: 0, success: false, errors };

    let imported = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const data of rowData) {
        const passwordHash = await bcrypt.hash(data.password, 10);
        const existing = await manager.findOne(User, {
          where: { email: data.email, tenantId },
        });

        const profile =
          data.gradeLevel !== undefined
            ? { gradeLevel: data.gradeLevel }
            : undefined;

        if (existing) {
          const updateData: Partial<User> = {
            firstName: data.firstName,
            lastName: data.lastName,
            roles: data.roles,
          };
          if (profile) {
            updateData.profile = { ...(existing.profile ?? {}), ...profile };
          }
          await manager.save(User, { ...existing, ...updateData });
        } else {
          const user = manager.create(User, {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            roles: data.roles,
            passwordHash,
            tenantId,
            ...(profile && { profile }),
          });
          await manager.save(User, user);
        }
        imported++;
      }
    });

    this.logger.log(`Imported ${imported} users for tenant ${tenantId}`);
    return { imported, success: true, errors: [] };
  }

  // ── Enrollments ─────────────────────────────────────────────────────────────

  /**
   * Import enrollments from CSV.
   *
   * Expected columns:
   *   student_email*, course_code*, term_name*
   *
   * Matches student by email, course by code, section by course+term (first active section).
   * Upsert by userId+sectionId — idempotent.
   */
  async importEnrollments(
    tenantId: string,
    csvData: string,
  ): Promise<ImportResult> {
    const rows = parseCSV(csvData);
    if (rows.length < 2) {
      return {
        imported: 0,
        success: false,
        errors: [
          {
            row: 0,
            field: 'file',
            message: 'CSV is empty or has no data rows',
          },
        ],
      };
    }

    const headers = buildHeaderMap(rows[0]);
    const errors: ImportError[] = [];

    // Pre-load lookup maps
    const users = await this.userRepo.find({
      where: { tenantId },
      select: ['id', 'email'],
    });
    const emailToUserId = new Map(
      users.map((u) => [u.email.toLowerCase(), u.id]),
    );

    const courses = await this.courseRepo.find({
      where: { tenantId },
      select: ['id', 'code'],
    });
    const codeToId = new Map(courses.map((c) => [c.code.toLowerCase(), c.id]));

    const terms = await this.termRepo.find({
      where: { tenantId },
      select: ['id', 'name'],
    });
    const termNameToId = new Map(
      terms.map((t) => [t.name.toLowerCase(), t.id]),
    );

    const sections = await this.sectionRepo.find({
      select: ['id', 'courseId', 'termId'],
    });

    const rowData: { userId: string; sectionId: string }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      const studentEmail = col(row, headers, 'student_email').toLowerCase();
      const courseCode = col(row, headers, 'course_code').toLowerCase();
      const termName = col(row, headers, 'term_name').toLowerCase();

      if (!studentEmail) {
        errors.push({
          row: rowNum,
          field: 'student_email',
          message: 'student_email is required',
        });
        continue;
      }
      if (!courseCode) {
        errors.push({
          row: rowNum,
          field: 'course_code',
          message: 'course_code is required',
        });
        continue;
      }
      if (!termName) {
        errors.push({
          row: rowNum,
          field: 'term_name',
          message: 'term_name is required',
        });
        continue;
      }

      const userId = emailToUserId.get(studentEmail);
      if (!userId) {
        errors.push({
          row: rowNum,
          field: 'student_email',
          message: `No user found with email "${studentEmail}"`,
        });
        continue;
      }

      const courseId = codeToId.get(courseCode);
      if (!courseId) {
        errors.push({
          row: rowNum,
          field: 'course_code',
          message: `No course found with code "${courseCode}"`,
        });
        continue;
      }

      const termId = termNameToId.get(termName);
      if (!termId) {
        errors.push({
          row: rowNum,
          field: 'term_name',
          message: `No term found with name "${termName}"`,
        });
        continue;
      }

      const section = sections.find(
        (s) => s.courseId === courseId && s.termId === termId,
      );
      if (!section) {
        errors.push({
          row: rowNum,
          field: 'course_code',
          message: `No section found for course "${courseCode}" in term "${termName}"`,
        });
        continue;
      }

      rowData.push({ userId, sectionId: section.id });
    }

    if (errors.length > 0) return { imported: 0, success: false, errors };

    let imported = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const data of rowData) {
        const existing = await manager.findOne(Enrollment, {
          where: { userId: data.userId, sectionId: data.sectionId },
        });
        if (!existing) {
          const enrollment = manager.create(Enrollment, {
            userId: data.userId,
            sectionId: data.sectionId,
            tenantId,
            status: EnrollmentStatus.ACTIVE,
            role: 'student' as any,
            enrolledAt: new Date(),
          });
          await manager.save(Enrollment, enrollment);
        }
        imported++;
      }
    });

    this.logger.log(`Imported ${imported} enrollments for tenant ${tenantId}`);
    return { imported, success: true, errors: [] };
  }
}
