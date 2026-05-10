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
    // Verify degree program exists
    await this.findDegreeProgramOrFail(input.degreeProgramId, tenantId);

    const profile = this.profileRepo.create({
      tenantId,
      userId: input.userId,
      degreeProgramId: input.degreeProgramId,
      enrollmentYear: input.enrollmentYear,
      expectedGraduationYear: input.expectedGraduationYear ?? null,
      completedCourseIds: input.completedCourseIds ?? [],
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
    if (input.currentCourseIds !== undefined) {
      profile.currentCourseIds = input.currentCourseIds;
    }
    if (input.expectedGraduationYear !== undefined) {
      profile.expectedGraduationYear = input.expectedGraduationYear;
    }
    if (input.notes !== undefined) {
      profile.notes = input.notes;
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

    // Load completed courses with their credits
    const completedCourses =
      profile.completedCourseIds.length > 0
        ? await this.courseRepo.find({
            where: { id: In(profile.completedCourseIds) },
          })
        : [];

    const completedMap = new Map(completedCourses.map((c) => [c.id, c]));
    const allCompletedIds = new Set(profile.completedCourseIds);

    // Calculate per-requirement-group progress
    const requirementProgress: RequirementProgress[] = program.requirements.map(
      (req: RequirementGroup) => {
        const completedInGroup = req.courseIds.filter((id) =>
          allCompletedIds.has(id),
        );
        const remainingInGroup = req.courseIds.filter(
          (id) => !allCompletedIds.has(id),
        );

        // Sum credits for completed courses in this group
        const creditsCompleted = completedInGroup.reduce((sum, id) => {
          const course = completedMap.get(id);
          return sum + (course ? Number(course.credits) || 0 : 0);
        }, 0);

        const coursesRequired = req.minCoursesRequired || req.courseIds.length;
        const coursesCompleted = completedInGroup.length;

        // A requirement is fulfilled if BOTH credit and course count thresholds are met
        const creditsFulfilled = creditsCompleted >= req.creditsRequired;
        const coursesFulfilled = coursesCompleted >= coursesRequired;

        return {
          groupName: req.name,
          type: req.type,
          creditsRequired: req.creditsRequired,
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

    const creditsRemaining = Math.max(
      0,
      program.totalCreditsRequired - totalCreditsCompleted,
    );
    const overallPercentage =
      program.totalCreditsRequired > 0
        ? Math.min(
            100,
            (totalCreditsCompleted / program.totalCreditsRequired) * 100,
          )
        : 0;

    const estimatedSemestersRemaining =
      creditsRemaining > 0
        ? Math.ceil(creditsRemaining / this.AVG_CREDITS_PER_SEMESTER)
        : 0;

    return {
      overallPercentage: Math.round(overallPercentage * 10) / 10,
      totalCreditsRequired: program.totalCreditsRequired,
      totalCreditsCompleted: Math.round(totalCreditsCompleted * 100) / 100,
      creditsRemaining,
      requirementProgress,
      estimatedSemestersRemaining,
    };
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

    // Load completed courses
    const completedCourses =
      profile.completedCourseIds.length > 0
        ? await this.courseRepo.find({
            where: { id: In(profile.completedCourseIds) },
          })
        : [];

    const completedMap = new Map(completedCourses.map((c) => [c.id, c]));
    const allCompletedIds = new Set(profile.completedCourseIds);

    // Calculate progress against target program
    const requirementProgress: RequirementProgress[] =
      targetProgram.requirements.map((req: RequirementGroup) => {
        const completedInGroup = req.courseIds.filter((id) =>
          allCompletedIds.has(id),
        );
        const remainingInGroup = req.courseIds.filter(
          (id) => !allCompletedIds.has(id),
        );

        const creditsCompleted = completedInGroup.reduce((sum, id) => {
          const course = completedMap.get(id);
          return sum + (course ? Number(course.credits) || 0 : 0);
        }, 0);

        const coursesRequired = req.minCoursesRequired || req.courseIds.length;

        return {
          groupName: req.name,
          type: req.type,
          creditsRequired: req.creditsRequired,
          creditsCompleted: Math.round(creditsCompleted * 100) / 100,
          coursesRequired,
          coursesCompleted: completedInGroup.length,
          fulfilled:
            creditsCompleted >= req.creditsRequired &&
            completedInGroup.length >= coursesRequired,
          completedCourseIds: completedInGroup,
          remainingCourseIds: remainingInGroup,
        };
      });

    const totalCreditsCompleted = requirementProgress.reduce(
      (sum, rp) => sum + rp.creditsCompleted,
      0,
    );
    const creditsRemaining = Math.max(
      0,
      targetProgram.totalCreditsRequired - totalCreditsCompleted,
    );
    const overallPercentage =
      targetProgram.totalCreditsRequired > 0
        ? Math.min(
            100,
            (totalCreditsCompleted / targetProgram.totalCreditsRequired) * 100,
          )
        : 0;

    return {
      overallPercentage: Math.round(overallPercentage * 10) / 10,
      totalCreditsRequired: targetProgram.totalCreditsRequired,
      totalCreditsCompleted: Math.round(totalCreditsCompleted * 100) / 100,
      creditsRemaining,
      requirementProgress,
      estimatedSemestersRemaining:
        creditsRemaining > 0
          ? Math.ceil(creditsRemaining / this.AVG_CREDITS_PER_SEMESTER)
          : 0,
    };
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
