import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  DegreeProgram,
  DegreeProgramStatus,
} from '../../database/entities/degree-program.entity';
import { StudentDegreeProfile } from '../../database/entities/student-degree-profile.entity';
import { Course } from '../../database/entities/course.entity';
import { RequirementGroup } from '../../database/entities/degree-program.entity';
import {
  CreateDegreeProgramInput,
  UpdateDegreeProgramInput,
  CreateStudentProfileInput,
  UpdateStudentProfileInput,
  DegreeProgress,
  RequirementProgress,
  EligibleCourse,
  PrerequisiteCheckResult,
  PrerequisiteStatus,
  PrerequisiteStatusType,
} from './dto/planner.types';
import { meetsMinGrade } from './grade-scale';

/**
 * Service for degree planning and progress calculation.
 *
 * WHY: The AI Course Planner agent needs structured computations
 * (credits remaining, prerequisite checking, course eligibility)
 * that are too complex for the AI to reason about from raw data.
 * This service provides those calculations as tool-callable methods.
 *
 * PATTERN: The service handles both admin CRUD (degree programs) and
 * student-facing calculations (progress, eligibility). AI tools
 * wrap the calculation methods.
 */
@Injectable()
export class PlannerService {
  /** Average credits per semester for estimation */
  private readonly AVG_CREDITS_PER_SEMESTER = 15;

  constructor(
    @InjectRepository(DegreeProgram)
    private degreeProgramRepo: Repository<DegreeProgram>,
    @InjectRepository(StudentDegreeProfile)
    private profileRepo: Repository<StudentDegreeProfile>,
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
  ) {}

  // ─── Degree Program CRUD ──────────────────────────────────────────────

  async createDegreeProgram(
    tenantId: string,
    input: CreateDegreeProgramInput,
  ): Promise<DegreeProgram> {
    const program = this.degreeProgramRepo.create({
      tenantId,
      name: input.name,
      code: input.code,
      department: input.department ?? undefined,
      description: input.description ?? undefined,
      totalCreditsRequired: input.totalCreditsRequired,
      requirements: input.requirements as RequirementGroup[],
      status: DegreeProgramStatus.DRAFT,
    });
    return this.degreeProgramRepo.save(program);
  }

  async updateDegreeProgram(
    tenantId: string,
    input: UpdateDegreeProgramInput,
  ): Promise<DegreeProgram> {
    const program = await this.findDegreeProgramOrFail(input.id, tenantId);

    if (input.name !== undefined) program.name = input.name;
    if (input.code !== undefined) program.code = input.code;
    if (input.department !== undefined) program.department = input.department;
    if (input.description !== undefined)
      program.description = input.description;
    if (input.totalCreditsRequired !== undefined) {
      program.totalCreditsRequired = input.totalCreditsRequired;
    }
    if (input.requirements !== undefined) {
      program.requirements = input.requirements as RequirementGroup[];
    }
    if (input.status !== undefined) program.status = input.status;

    return this.degreeProgramRepo.save(program);
  }

  async findDegreeProgramOrFail(
    id: string,
    tenantId: string,
  ): Promise<DegreeProgram> {
    const program = await this.degreeProgramRepo.findOne({
      where: { id, tenantId },
    });
    if (!program) {
      throw new NotFoundException(`Degree program not found: ${id}`);
    }
    return program;
  }

  async findDegreePrograms(tenantId: string): Promise<DegreeProgram[]> {
    return this.degreeProgramRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async findActivePrograms(tenantId: string): Promise<DegreeProgram[]> {
    return this.degreeProgramRepo.find({
      where: { tenantId, status: DegreeProgramStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  // ─── Student Degree Profile CRUD ──────────────────────────────────────

  async createStudentProfile(
    tenantId: string,
    input: CreateStudentProfileInput,
  ): Promise<StudentDegreeProfile> {
    // Verify degree program exists, then switch to the version for the
    // student's catalog year (same code, matching catalogYear).
    const requested = await this.findDegreeProgramOrFail(
      input.degreeProgramId,
      tenantId,
    );
    const version = await this.resolveProgramVersion(
      tenantId,
      requested,
      input.catalogYear ?? input.enrollmentYear,
    );

    const profile = this.profileRepo.create({
      tenantId,
      userId: input.userId,
      degreeProgramId: version.id,
      enrollmentYear: input.enrollmentYear,
      catalogYear: input.catalogYear ?? null,
      expectedGraduationYear: input.expectedGraduationYear ?? null,
      completedCourseIds: input.completedCourses
        ? input.completedCourses.map((c) => c.courseId)
        : (input.completedCourseIds ?? []),
      completedCourses: (input.completedCourses ?? []).map((c) => ({
        courseId: c.courseId,
        grade: c.grade ?? null,
      })),
      currentCourseIds: [],
    });
    return this.profileRepo.save(profile);
  }

  async updateStudentProfile(
    tenantId: string,
    input: UpdateStudentProfileInput,
  ): Promise<StudentDegreeProfile> {
    const profile = await this.findStudentProfileOrFail(input.id, tenantId);

    if (input.completedCourseIds !== undefined) {
      profile.completedCourseIds = input.completedCourseIds;
    }
    if (input.completedCourses !== undefined) {
      profile.completedCourses = input.completedCourses.map((c) => ({
        courseId: c.courseId,
        grade: c.grade ?? null,
      }));
      profile.completedCourseIds = profile.completedCourses.map(
        (c) => c.courseId,
      );
    }
    if (input.currentCourseIds !== undefined) {
      profile.currentCourseIds = input.currentCourseIds;
    }
    if (input.expectedGraduationYear !== undefined) {
      profile.expectedGraduationYear = input.expectedGraduationYear;
    }
    if (input.notes !== undefined) {
      profile.notes = input.notes;
    }
    if (input.catalogYear !== undefined) {
      if (!profile.degreeProgram) {
        throw new NotFoundException(
          `Degree program for profile ${profile.id} not found`,
        );
      }
      profile.catalogYear = input.catalogYear;
      const version = await this.resolveProgramVersion(
        tenantId,
        profile.degreeProgram,
        input.catalogYear,
      );
      profile.degreeProgramId = version.id;
      profile.degreeProgram = version;
    }

    return this.profileRepo.save(profile);
  }

  async findStudentProfileOrFail(
    id: string,
    tenantId: string,
  ): Promise<StudentDegreeProfile> {
    const profile = await this.profileRepo.findOne({
      where: { id, tenantId },
      relations: ['degreeProgram'],
    });
    if (!profile) {
      throw new NotFoundException(`Student degree profile not found: ${id}`);
    }
    return profile;
  }

  async findStudentProfiles(
    tenantId: string,
    userId: string,
  ): Promise<StudentDegreeProfile[]> {
    return this.profileRepo.find({
      where: { tenantId, userId },
      relations: ['degreeProgram'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Progress Calculation ─────────────────────────────────────────────

  /**
   * Calculate a student's progress toward their degree.
   *
   * WHY: This is the core computation the Course Planner agent uses.
   * It walks each requirement group, checks which courses are completed,
   * calculates credits, and determines fulfillment status.
   */
  async calculateProgress(
    profileId: string,
    tenantId: string,
  ): Promise<DegreeProgress> {
    const profile = await this.findStudentProfileOrFail(profileId, tenantId);
    const program = profile.degreeProgram;

    if (!program) {
      throw new NotFoundException(
        `Degree program not found for profile: ${profileId}`,
      );
    }

    return this.computeProgress(profile, program);
  }

  // ─── Catalog Year Versioning ──────────────────────────────────────────

  /**
   * Pick the version of a program (same code) whose catalogYear matches
   * the given year. Fallback: latest version at or before the year, else
   * the latest version. Programs without a parseable year sort last.
   *
   * WHY: a student is judged by the worksheet of the year they entered,
   * not the current one.
   */
  async resolveProgramVersion(
    tenantId: string,
    program: DegreeProgram,
    year: number,
  ): Promise<DegreeProgram> {
    const versions = await this.degreeProgramRepo.find({
      where: { tenantId, code: program.code },
    });
    if (versions.length === 0) return program;
    // Prefer ACTIVE versions; use the others only when none is active
    const active = versions.filter(
      (v) => v.status === DegreeProgramStatus.ACTIVE,
    );
    const pool = active.length > 0 ? active : versions;
    const dated = pool
      .map((v) => ({ v, y: parseCatalogYear(v.catalogYear) }))
      .filter((x): x is { v: DegreeProgram; y: number } => x.y !== null)
      .sort((a, b) => b.y - a.y);
    if (dated.length === 0) return program;
    const exact = dated.find((x) => x.y === year);
    const atOrBefore = dated.find((x) => x.y <= year);
    return (exact ?? atOrBefore ?? dated[0]).v;
  }

  // ─── Course Eligibility ───────────────────────────────────────────────

  /**
   * Find courses the student is eligible to take based on:
   * 1. Not already completed or currently taking
   * 2. Prerequisites are met
   * 3. Course satisfies an unfulfilled requirement
   */
  async findEligibleCourses(
    profileId: string,
    tenantId: string,
  ): Promise<EligibleCourse[]> {
    const profile = await this.findStudentProfileOrFail(profileId, tenantId);
    const program = profile.degreeProgram;

    if (!program) {
      throw new NotFoundException(
        `Degree program not found for profile: ${profileId}`,
      );
    }

    const allCompletedIds = new Set([
      ...profile.completedCourseIds,
      ...profile.currentCourseIds,
    ]);

    // Collect all course IDs from unfulfilled requirements
    const progress = await this.calculateProgress(profileId, tenantId);
    const unfulfilledReqs = progress.requirementProgress.filter(
      (rp) => !rp.fulfilled,
    );

    const candidateCourseIds = new Set<string>();
    const courseToRequirement = new Map<string, string>();

    for (const req of unfulfilledReqs) {
      for (const courseId of req.remainingCourseIds) {
        if (!allCompletedIds.has(courseId)) {
          candidateCourseIds.add(courseId);
          courseToRequirement.set(courseId, req.groupName);
        }
      }
    }

    if (candidateCourseIds.size === 0) {
      return [];
    }

    // Load candidate courses
    const courses = await this.courseRepo.find({
      where: { id: In([...candidateCourseIds]) },
    });

    // Check prerequisites for each candidate
    return courses.map((course) => {
      const prerequisitesMet = this.checkPrerequisites(course, allCompletedIds);

      return {
        id: course.id,
        code: course.code,
        title: course.title,
        credits: Number(course.credits) || 0,
        fulfillsRequirement: courseToRequirement.get(course.id) || 'Unknown',
        prerequisitesMet,
      };
    });
  }

  /**
   * Simulate switching to a different degree program.
   * Shows how many existing credits would transfer.
   */
  async simulateMajorChange(
    profileId: string,
    targetProgramId: string,
    tenantId: string,
  ): Promise<DegreeProgress> {
    const profile = await this.findStudentProfileOrFail(profileId, tenantId);
    const targetProgram = await this.findDegreeProgramOrFail(
      targetProgramId,
      tenantId,
    );

    return this.computeProgress(profile, targetProgram);
  }

  // ─── ENROLL-006: Public prerequisite check ────────────────────────────

  /**
   * Returns detailed prerequisite status for a course relative to the student.
   *
   * WHY public: The private checkPrerequisites() only returns boolean. AI tools
   * and the enrollment dialog need per-prerequisite status (completed /
   * in_progress / missing) plus human-readable course codes and titles.
   *
   * PATTERN: Uses the student's degree profile(s) as the source of truth for
   * completed/current courses. If the student has no profile, all prerequisites
   * show as MISSING — a safe conservative default.
   *
   * TRADEOFF: Requires prerequisite courses to be in the same tenant; cross-
   * tenant prerequisite references are not supported (return "Unknown").
   */
  async checkCoursePrerequisites(
    courseId: string,
    userId: string,
    tenantId: string,
  ): Promise<PrerequisiteCheckResult> {
    const course = await this.courseRepo.findOne({
      where: { id: courseId, tenantId },
    });
    if (!course) {
      throw new NotFoundException(`Course not found: ${courseId}`);
    }

    // Build prerequisite ID list: prefer structured field (ONBOARD-001),
    // fall back to legacy freeform JSONB.
    const prereqIds: string[] = [...(course.prerequisiteCourseIds ?? [])];
    let minRequired = prereqIds.length;

    if (prereqIds.length === 0 && course.prerequisites) {
      const legacy = course.prerequisites as Record<string, unknown>;
      const legacyIds = (legacy.courseIds as string[]) ?? [];
      prereqIds.push(...legacyIds);
      minRequired = (legacy.minRequired as number) ?? legacyIds.length;
    }

    // No prerequisites — fast path
    if (prereqIds.length === 0) {
      return {
        courseId: course.id,
        courseCode: course.code,
        allMet: true,
        metCount: 0,
        totalRequired: 0,
        prerequisites: [],
      };
    }

    // Aggregate completed/current course IDs from all the student's profiles
    const profiles = await this.profileRepo.find({
      where: { userId, tenantId },
    });
    const completedIds = new Set<string>();
    const currentIds = new Set<string>();
    for (const profile of profiles) {
      profile.completedCourseIds.forEach((id) => completedIds.add(id));
      profile.currentCourseIds.forEach((id) => currentIds.add(id));
    }

    // Load course details for human-readable output
    const prereqCourses =
      prereqIds.length > 0
        ? await this.courseRepo.find({ where: { id: In(prereqIds) } })
        : [];
    const prereqMap = new Map(prereqCourses.map((c) => [c.id, c]));

    const prerequisites: PrerequisiteStatus[] = prereqIds.map((id) => {
      const prereqCourse = prereqMap.get(id);
      let status: PrerequisiteStatusType;
      if (completedIds.has(id)) {
        status = PrerequisiteStatusType.COMPLETED;
      } else if (currentIds.has(id)) {
        status = PrerequisiteStatusType.IN_PROGRESS;
      } else {
        status = PrerequisiteStatusType.MISSING;
      }
      return {
        courseId: id,
        courseCode: prereqCourse?.code ?? 'Unknown',
        courseTitle: prereqCourse?.title ?? 'Unknown',
        status,
      };
    });

    const metCount = prerequisites.filter(
      (p) => p.status === PrerequisiteStatusType.COMPLETED,
    ).length;

    return {
      courseId: course.id,
      courseCode: course.code,
      allMet: metCount >= minRequired,
      metCount,
      totalRequired: minRequired,
      prerequisites,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Walk each requirement group and compute per-group and overall progress.
   *
   * WHY overall from groups: summing raw credits let surplus electives push
   * the total to 100% while core groups were still unmet. Each group now
   * contributes at most its own creditsRequired, so the percentage can't
   * exceed true completion.
   *
   * A completed course counts toward a group only if its grade meets the
   * group's minGrade (COM/CR pass; ungraded legacy records count).
   */
  private async computeProgress(
    profile: StudentDegreeProfile,
    program: DegreeProgram,
  ): Promise<DegreeProgress> {
    const requirements: RequirementGroup[] = program.requirements;
    const totalCreditsRequired = Number(program.totalCreditsRequired);
    const completedCourses =
      profile.completedCourseIds.length > 0
        ? await this.courseRepo.find({
            where: { id: In(profile.completedCourseIds) },
          })
        : [];

    const completedMap = new Map(completedCourses.map((c) => [c.id, c]));
    const allCompletedIds = new Set(profile.completedCourseIds);
    const gradeById = new Map(
      (profile.completedCourses ?? []).map((cc) => [cc.courseId, cc.grade]),
    );

    let cappedCreditsTotal = 0;
    let groupCreditsRequiredTotal = 0;

    const requirementProgress: RequirementProgress[] = requirements.map(
      (req: RequirementGroup) => {
        const counts = (id: string) =>
          allCompletedIds.has(id) &&
          meetsMinGrade(gradeById.get(id) ?? null, req.minGrade ?? null);
        const completedInGroup = req.courseIds.filter(counts);
        const remainingInGroup = req.courseIds.filter((id) => !counts(id));

        // Sum credits for completed courses in this group
        const creditsCompleted = completedInGroup.reduce((sum, id) => {
          const course = completedMap.get(id);
          return sum + (course ? Number(course.credits) || 0 : 0);
        }, 0);

        const creditsRequired = Number(req.creditsRequired) || 0;
        // minCoursesRequired 0 with credits set means credits only. With no
        // credits either (old stored groups), fall back to "all in the list"
        // so an empty threshold never passes silently.
        const coursesRequired =
          req.minCoursesRequired == null ||
          (req.minCoursesRequired === 0 && creditsRequired <= 0)
            ? req.courseIds.length
            : req.minCoursesRequired;
        const coursesCompleted = completedInGroup.length;

        // A requirement is fulfilled if BOTH credit and course count thresholds are met
        const creditsFulfilled = creditsCompleted >= creditsRequired;
        const coursesFulfilled = coursesCompleted >= coursesRequired;

        cappedCreditsTotal += Math.min(creditsCompleted, creditsRequired);
        groupCreditsRequiredTotal += creditsRequired;

        return {
          groupName: req.name,
          type: req.type,
          creditsRequired,
          creditsCompleted: Math.round(creditsCompleted * 100) / 100,
          coursesRequired,
          coursesCompleted,
          fulfilled: creditsFulfilled && coursesFulfilled,
          completedCourseIds: completedInGroup,
          remainingCourseIds: remainingInGroup,
        };
      },
    );

    // Sum total credits completed across all requirement groups
    // (a course might satisfy only one group, so we sum group-level credits)
    const totalCreditsCompleted = requirementProgress.reduce(
      (sum, rp) => sum + rp.creditsCompleted,
      0,
    );

    // Remaining is what the groups still need, so surplus credits in one
    // group can't hide a gap in another.
    const creditsRemaining = Math.max(
      0,
      Math.max(totalCreditsRequired, groupCreditsRequiredTotal) -
        cappedCreditsTotal,
    );
    const overallPercentage =
      groupCreditsRequiredTotal > 0
        ? Math.min(100, (cappedCreditsTotal / groupCreditsRequiredTotal) * 100)
        : 0;

    const estimatedSemestersRemaining =
      creditsRemaining > 0
        ? Math.ceil(creditsRemaining / this.AVG_CREDITS_PER_SEMESTER)
        : 0;

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const countedCredits = round2(cappedCreditsTotal);
    const rawCredits = round2(totalCreditsCompleted);

    const ruleYear = parseCatalogYear(program.catalogYear);
    const entryYear = profile.catalogYear ?? profile.enrollmentYear ?? null;
    const catalogFallback =
      ruleYear !== null && entryYear !== null && ruleYear !== entryYear;

    return {
      overallPercentage: Math.round(overallPercentage * 10) / 10,
      totalCreditsRequired,
      totalCreditsCompleted: rawCredits,
      countedCredits,
      extraCredits: round2(Math.max(0, rawCredits - countedCredits)),
      creditsRemaining: round2(creditsRemaining),
      ruleYear,
      entryYear,
      catalogFallback,
      catalogNotice: catalogFallback
        ? `Using ${ruleYear} rules; your entry year ${entryYear} worksheet is not on file.`
        : null,
      requirementProgress,
      estimatedSemestersRemaining,
    };
  }

  /**
   * Check if a course's prerequisites are satisfied by completed courses.
   * Prerequisites are stored as JSONB on the Course entity.
   *
   * Supported formats:
   * - { courseIds: ["uuid1", "uuid2"] } — all courses required
   * - { courseIds: ["uuid1", "uuid2"], minRequired: 1 } — any N from list
   * - null/undefined/empty — no prerequisites
   */
  private checkPrerequisites(
    course: Course,
    completedIds: Set<string>,
  ): boolean {
    const prereqs = course.prerequisites;
    if (!prereqs) return true;

    const requiredIds: string[] =
      ((prereqs as Record<string, unknown>).courseIds as string[]) ?? [];
    if (requiredIds.length === 0) return true;

    const minRequired =
      ((prereqs as Record<string, unknown>).minRequired as number) ??
      requiredIds.length;
    const metCount = requiredIds.filter((id) => completedIds.has(id)).length;

    return metCount >= minRequired;
  }
}

/** Leading 4-digit year of a catalogYear string ("2026-2027" -> 2026). */
export function parseCatalogYear(
  catalogYear: string | null | undefined,
): number | null {
  const m = /^\s*(\d{4})/.exec(catalogYear ?? '');
  return m ? Number(m[1]) : null;
}
