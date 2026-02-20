import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  GraduationPlan,
  GraduationPlanStatus,
  PlannedCourseData,
  PlannedSemesterData,
} from './entities/graduation-plan.entity';
import { StudentDegreeProfile } from '../../database/entities/student-degree-profile.entity';
import { DegreeProgram } from '../../database/entities/degree-program.entity';
import { Course } from '../../database/entities/course.entity';
import { RequirementGroup } from '../../database/entities/degree-program.entity';
import {
  GenerateGraduationPlanInput,
  GraduationPlanResult,
  PlannedCourse,
  PlannedSemester,
  GraduationPlanConstraintsResult,
  PlanDiff,
  DiffCourse,
  MovedCourse,
} from './dto/graduation-planner.types';

/**
 * Constraint-based graduation plan generator.
 *
 * WHY: The AI Course Planner agent and student roadmap page both need a
 * semester-by-semester schedule that respects prerequisites, course
 * availability, credit limits, and personal constraints (time off, etc.).
 * A simple "divide remaining credits by credits-per-semester" estimate is
 * not enough — prerequisites can create long chains that force certain
 * orderings regardless of credit count.
 *
 * ALGORITHM: Topological sort of the prerequisite DAG → priority-based
 * scoring → greedy bin-packing into semesters. This produces a valid
 * (constraint-respecting) plan without the exponential cost of full
 * backtracking. The greedy approach is good enough for degree planning
 * because most programs have limited branching in their prereq graphs.
 *
 * PATTERN: The service does not call PlannerService to avoid circular
 * dependencies. It reimplements the credit-sum logic directly.
 */
@Injectable()
export class GraduationPlannerService {
  private readonly logger = new Logger(GraduationPlannerService.name);

  /** Safety valve: never schedule more than this many semesters */
  private readonly MAX_SEMESTERS = 20;

  /** Default credits/semester when no input is provided */
  private readonly DEFAULT_MAX_CREDITS = 15;

  constructor(
    @InjectRepository(GraduationPlan)
    private planRepo: Repository<GraduationPlan>,
    @InjectRepository(StudentDegreeProfile)
    private profileRepo: Repository<StudentDegreeProfile>,
    @InjectRepository(DegreeProgram)
    private programRepo: Repository<DegreeProgram>,
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
  ) {}

  // ─── Plan Generation ──────────────────────────────────────────────────

  /**
   * Generate (or regenerate) a semester-by-semester graduation plan.
   *
   * The generated plan is persisted as ACTIVE, and any previously active
   * plan for this profile is archived. The student always has exactly one
   * ACTIVE plan per profile.
   *
   * Returns the new plan entity AND a diff vs. the previous plan (null on
   * first-ever generation when there's nothing to diff against).
   *
   * @throws NotFoundException if the profile doesn't belong to this user/tenant
   */
  async generatePlan(
    userId: string,
    tenantId: string,
    input: GenerateGraduationPlanInput,
  ): Promise<{ plan: GraduationPlan; diff: PlanDiff | null }> {
    // ── 1. Load profile + program ────────────────────────────────────────
    const profile = await this.profileRepo.findOne({
      where: { id: input.profileId, tenantId, userId },
      relations: ['degreeProgram'],
    });
    if (!profile) {
      throw new NotFoundException(
        `Degree profile not found or does not belong to this user: ${input.profileId}`,
      );
    }
    const program = profile.degreeProgram;
    if (!program) {
      throw new NotFoundException(
        `Degree program not found for profile: ${input.profileId}`,
      );
    }

    // ── 2. Collect all course IDs required by the degree ────────────────
    //   Build two maps:
    //   - allRequiredIds: full set of course IDs across all requirement groups
    //   - courseToRequirement: first requirement group that lists this course
    const allRequiredIds = new Set<string>();
    const courseToRequirement = new Map<string, string>();
    for (const req of program.requirements as RequirementGroup[]) {
      for (const id of req.courseIds) {
        allRequiredIds.add(id);
        if (!courseToRequirement.has(id)) {
          courseToRequirement.set(id, req.name);
        }
      }
    }

    const completedIds = new Set(profile.completedCourseIds);
    const currentIds = new Set(profile.currentCourseIds);

    // ── 3. Remaining = required minus completed/current ──────────────────
    const remainingIds = [...allRequiredIds].filter(
      (id) => !completedIds.has(id) && !currentIds.has(id),
    );

    // ── 4. Load course data ──────────────────────────────────────────────
    //   Load both remaining AND completed so we can sum completed credits.
    const allNeededIds = [
      ...new Set([...remainingIds, ...profile.completedCourseIds]),
    ];
    const allCourses =
      allNeededIds.length > 0
        ? await this.courseRepo.find({ where: { id: In(allNeededIds) } })
        : [];

    const courseMap = new Map(allCourses.map((c) => [c.id, c]));

    // Baseline: sum credits already completed (for cumulativeCredits offset)
    const completedCredits = profile.completedCourseIds.reduce((sum, id) => {
      const c = courseMap.get(id);
      return sum + (c ? Number(c.credits) || 0 : 0);
    }, 0);

    // ── 5. Build constraint inputs ───────────────────────────────────────
    const maxCredits = input.maxCreditsPerSemester ?? this.DEFAULT_MAX_CREDITS;
    const { term: defaultStartTerm, year: defaultStartYear } =
      this.inferStartTerm();
    const startTerm = input.startTerm ?? defaultStartTerm;
    const startYear = input.startYear ?? defaultStartYear;
    const includeSummer = input.includeSummer ?? false;
    const excludedTermKeys = new Set(input.excludedTermKeys ?? []);

    // If nothing left to schedule, save a trivially empty (already graduated) plan
    if (remainingIds.length === 0) {
      return this.savePlan(userId, tenantId, input.profileId, program.id, {
        constraints: {
          maxCreditsPerSemester: maxCredits,
          startTerm,
          startYear,
          includeSummer,
          excludedTermKeys: [...excludedTermKeys],
        },
        semesters: [],
        completedCredits,
        totalRequired: program.totalCreditsRequired,
      });
    }

    // Capture the current active plan BEFORE the algorithm runs, so we can
    // diff the old vs. new semester layout after generation completes.
    const previousActivePlan = await this.planRepo.findOne({
      where: {
        userId,
        profileId: input.profileId,
        tenantId,
        status: GraduationPlanStatus.ACTIVE,
      },
    });

    // ── 6. Build prerequisite graph (over remaining courses only) ────────
    //   prereqsFor[id]  = prereq IDs that must be scheduled BEFORE id
    //   prereqOf[id]    = IDs that have id as a prerequisite (dependents)
    const remainingSet = new Set(remainingIds);
    const prereqsFor = new Map<string, string[]>();
    const prereqOf = new Map<string, string[]>();

    for (const id of remainingIds) {
      const course = courseMap.get(id);
      if (!course) continue;

      // Prefer structured field (ONBOARD-001), fall back to legacy JSONB
      const rawPrereqs = course.prerequisiteCourseIds ?? [];
      const legacyPrereqs: string[] =
        rawPrereqs.length === 0 && course.prerequisites
          ? (((course.prerequisites as Record<string, unknown>)
              .courseIds as string[]) ?? [])
          : [];

      const allPrereqIds = rawPrereqs.length > 0 ? rawPrereqs : legacyPrereqs;

      // Only include prereqs that are also remaining (completed ones are already done)
      const activePrereqs = allPrereqIds.filter(
        (pid) => remainingSet.has(pid) && !completedIds.has(pid),
      );

      prereqsFor.set(id, activePrereqs);
      for (const pid of activePrereqs) {
        if (!prereqOf.has(pid)) prereqOf.set(pid, []);
        prereqOf.get(pid)!.push(id);
      }
    }

    // ── 7. Kahn's topological sort ───────────────────────────────────────
    //   Courses with no pending prerequisites start in the queue.
    //   Each time we process a course, we decrement its dependents' in-degrees.
    const inDegree = new Map<string, number>(
      remainingIds.map((id) => [id, prereqsFor.get(id)?.length ?? 0]),
    );

    const topoQueue: string[] = remainingIds.filter(
      (id) => (inDegree.get(id) ?? 0) === 0,
    );
    const topoOrder: string[] = [];

    while (topoQueue.length > 0) {
      const id = topoQueue.shift()!;
      topoOrder.push(id);
      for (const dep of prereqOf.get(id) ?? []) {
        const newDeg = (inDegree.get(dep) ?? 1) - 1;
        inDegree.set(dep, newDeg);
        if (newDeg === 0) topoQueue.push(dep);
      }
    }

    // Append any courses involved in cycles (shouldn't happen in real data)
    for (const [id, deg] of inDegree) {
      if (deg > 0) {
        this.logger.warn(`Cycle detected in prerequisite graph: ${id}`);
        topoOrder.push(id);
      }
    }

    // ── 8. Score courses for priority ────────────────────────────────────
    //   Higher score = schedule earlier.
    //   Factors: requirement type (core > concentration > gen_ed > elective),
    //            unlocking power (# of direct dependents),
    //            course level (lower = earlier).
    const reqTypeWeight = (groupName: string): number => {
      const req = (program.requirements as RequirementGroup[]).find(
        (r) => r.name === groupName,
      );
      switch (req?.type) {
        case 'core':
          return 200;
        case 'concentration':
          return 100;
        case 'general_education':
          return 50;
        default:
          return 0;
      }
    };

    const scoreOf = (id: string): number => {
      const course = courseMap.get(id);
      // Lower course level → higher priority (100-level before 400-level)
      const levelScore = Math.max(0, 500 - (course?.courseLevel ?? 300));
      // Dependents: each downstream course adds 30 points
      const unlockScore = (prereqOf.get(id)?.length ?? 0) * 30;
      const typeScore = reqTypeWeight(courseToRequirement.get(id) ?? '');
      return levelScore + unlockScore + typeScore;
    };

    // ── 9. Greedy semester bin-packing ───────────────────────────────────
    const scheduled = new Set<string>();
    // "satisfiedPrereqs" = courses whose prerequisites are met:
    // either completed originally or already placed in a prior semester
    const satisfiedSet = new Set<string>([
      ...completedIds,
      ...currentIds, // current courses finish before next semester
    ]);

    const semesters: PlannedSemesterData[] = [];
    let cumulativeCredits = completedCredits;
    let term = startTerm;
    let year = startYear;

    while (
      scheduled.size < remainingIds.length &&
      semesters.length < this.MAX_SEMESTERS
    ) {
      const termKey = `${term}_${year}`;

      // Skip excluded terms and summers (if not enabled)
      if (
        !excludedTermKeys.has(termKey) &&
        (term !== 'summer' || includeSummer)
      ) {
        // ── Eligible courses for this semester ────────────────────────
        //   A course is eligible if:
        //   1. Not yet scheduled
        //   2. All its pending prereqs are satisfied
        //   3. offeredSemesters allows this term type (null/empty = always available)
        const eligible = topoOrder.filter((id) => {
          if (scheduled.has(id)) return false;
          const prereqs = prereqsFor.get(id) ?? [];
          if (!prereqs.every((pid) => satisfiedSet.has(pid))) return false;
          const course = courseMap.get(id);
          const offered = course?.offeredSemesters;
          if (offered && offered.length > 0 && !offered.includes(term)) {
            return false;
          }
          return true;
        });

        // Sort descending by score so we pack highest-priority courses first
        eligible.sort((a, b) => scoreOf(b) - scoreOf(a));

        // ── Pack courses into this semester ───────────────────────────
        const semCourses: PlannedCourseData[] = [];
        let semCredits = 0;

        for (const id of eligible) {
          if (semCredits >= maxCredits) break;

          const course = courseMap.get(id);
          if (!course) continue;
          const credits = Number(course.credits) || 3;

          // Corequisites: any coreq that is also remaining and unscheduled
          // must fit in the same semester.
          const coreqIds = (course.corequisiteCourseIds ?? []).filter(
            (cid) =>
              remainingSet.has(cid) &&
              !scheduled.has(cid) &&
              !satisfiedSet.has(cid),
          );

          let coreqCredits = 0;
          const coreqsToAdd: Course[] = [];
          for (const cid of coreqIds) {
            const coreqCourse = courseMap.get(cid);
            if (!coreqCourse) continue;
            coreqCredits += Number(coreqCourse.credits) || 3;
            coreqsToAdd.push(coreqCourse);
          }

          // If this course + its coreqs don't fit, defer to a later semester
          if (semCredits + credits + coreqCredits > maxCredits) continue;

          // ── Place the course ──────────────────────────────────────
          scheduled.add(id);
          satisfiedSet.add(id);
          semCredits += credits;
          semCourses.push({
            courseId: id,
            code: course.code,
            title: course.title,
            credits,
            fulfillsRequirement:
              courseToRequirement.get(id) ?? 'General Elective',
          });

          // ── Place corequisites in the same semester ───────────────
          for (const coreqCourse of coreqsToAdd) {
            const coreqCr = Number(coreqCourse.credits) || 3;
            scheduled.add(coreqCourse.id);
            satisfiedSet.add(coreqCourse.id);
            semCredits += coreqCr;
            semCourses.push({
              courseId: coreqCourse.id,
              code: coreqCourse.code,
              title: coreqCourse.title,
              credits: coreqCr,
              fulfillsRequirement:
                courseToRequirement.get(coreqCourse.id) ?? 'General Elective',
            });
          }
        }

        // Only emit this semester if at least one course was scheduled
        if (semCourses.length > 0) {
          cumulativeCredits += semCredits;
          const pct =
            program.totalCreditsRequired > 0
              ? Math.min(
                  100,
                  Math.round(
                    (cumulativeCredits / program.totalCreditsRequired) * 1000,
                  ) / 10,
                )
              : 0;

          semesters.push({
            termKey,
            term,
            year,
            courses: semCourses,
            totalCredits: Math.round(semCredits * 100) / 100,
            cumulativeCredits: Math.round(cumulativeCredits * 100) / 100,
            completionPercentage: pct,
          });
        }
      }

      // Advance to next term
      [term, year] = this.advanceTerm(term, year);
    }

    const unscheduledCount = remainingIds.length - scheduled.size;
    if (unscheduledCount > 0) {
      this.logger.warn(
        `${unscheduledCount} courses could not be scheduled within ${this.MAX_SEMESTERS} semesters for profile ${input.profileId}`,
      );
    }

    return this.savePlan(userId, tenantId, input.profileId, program.id, {
      constraints: {
        maxCreditsPerSemester: maxCredits,
        startTerm,
        startYear,
        includeSummer,
        excludedTermKeys: [...excludedTermKeys],
      },
      semesters,
      completedCredits,
      totalRequired: program.totalCreditsRequired,
      previousActivePlan: previousActivePlan ?? null,
    });
  }

  // ─── Plan Queries ──────────────────────────────────────────────────────

  async findPlansForProfile(
    profileId: string,
    userId: string,
    tenantId: string,
  ): Promise<GraduationPlan[]> {
    return this.planRepo.find({
      where: { profileId, userId, tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async activatePlan(
    planId: string,
    userId: string,
    tenantId: string,
  ): Promise<GraduationPlan> {
    const plan = await this.planRepo.findOne({
      where: { id: planId, userId, tenantId },
    });
    if (!plan) {
      throw new NotFoundException(`Graduation plan not found: ${planId}`);
    }

    // Archive any other active plan for this profile
    await this.planRepo.update(
      {
        profileId: plan.profileId,
        userId,
        tenantId,
        status: GraduationPlanStatus.ACTIVE,
      },
      { status: GraduationPlanStatus.ARCHIVED },
    );

    plan.status = GraduationPlanStatus.ACTIVE;
    return this.planRepo.save(plan);
  }

  // ─── Mapping ──────────────────────────────────────────────────────────

  /** Map a GraduationPlan entity to the GraphQL result type. */
  toResult(plan: GraduationPlan, diff?: PlanDiff | null): GraduationPlanResult {
    return {
      id: plan.id,
      profileId: plan.profileId,
      degreeProgramId: plan.degreeProgramId,
      status: plan.status,
      constraints: plan.constraints as GraduationPlanConstraintsResult,
      semesters: (plan.semesters ?? []).map(
        (s): PlannedSemester => ({
          termKey: s.termKey,
          term: s.term,
          year: s.year,
          totalCredits: Number(s.totalCredits),
          cumulativeCredits: Number(s.cumulativeCredits),
          completionPercentage: Number(s.completionPercentage),
          courses: (s.courses ?? []).map(
            (c): PlannedCourse => ({
              courseId: c.courseId,
              code: c.code,
              title: c.title,
              credits: Number(c.credits),
              fulfillsRequirement: c.fulfillsRequirement,
            }),
          ),
        }),
      ),
      totalSemesters: plan.totalSemesters,
      estimatedGraduationTerm: plan.estimatedGraduationTerm,
      estimatedGraduationYear: plan.estimatedGraduationYear,
      totalCreditsPlanned: Number(plan.totalCreditsPlanned),
      totalCreditsCompleted: Number(plan.totalCreditsCompleted),
      overallCompletionPercentage: Number(plan.overallCompletionPercentage),
      createdAt: plan.createdAt,
      diff: diff ?? null,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Persist the generated plan. Archives any existing ACTIVE plan for the
   * same profile first (idempotent — safe to call on re-generation).
   *
   * Returns the newly saved plan AND a diff vs. the previous plan (null when
   * there was no prior active plan to compare against).
   */
  private async savePlan(
    userId: string,
    tenantId: string,
    profileId: string,
    degreeProgramId: string,
    computed: {
      constraints: GraduationPlan['constraints'];
      semesters: PlannedSemesterData[];
      completedCredits: number;
      totalRequired: number;
      previousActivePlan?: GraduationPlan | null;
    },
  ): Promise<{ plan: GraduationPlan; diff: PlanDiff | null }> {
    const {
      semesters,
      completedCredits,
      totalRequired,
      constraints,
      previousActivePlan,
    } = computed;

    const lastSemester = semesters[semesters.length - 1];
    const plannedCredits = semesters.reduce(
      (sum, s) => sum + s.totalCredits,
      0,
    );
    const totalCreditsAtEnd = completedCredits + plannedCredits;
    const pct =
      totalRequired > 0
        ? Math.min(
            100,
            Math.round((totalCreditsAtEnd / totalRequired) * 1000) / 10,
          )
        : 100;

    const newGradTerm = lastSemester?.term ?? constraints.startTerm;
    const newGradYear = lastSemester?.year ?? constraints.startYear;

    // Compute diff against the previous active plan before archiving it
    const diff = previousActivePlan
      ? this.computeDiff(
          previousActivePlan.semesters ?? [],
          semesters,
          previousActivePlan.estimatedGraduationTerm,
          previousActivePlan.estimatedGraduationYear,
          previousActivePlan.totalSemesters,
          newGradTerm,
          newGradYear,
          semesters.length,
        )
      : null;

    // Archive existing active plan (after diff is computed — order matters)
    await this.planRepo.update(
      { userId, profileId, tenantId, status: GraduationPlanStatus.ACTIVE },
      { status: GraduationPlanStatus.ARCHIVED },
    );

    const plan = this.planRepo.create({
      tenantId,
      userId,
      profileId,
      degreeProgramId,
      status: GraduationPlanStatus.ACTIVE,
      constraints,
      semesters,
      totalSemesters: semesters.length,
      estimatedGraduationTerm: newGradTerm,
      estimatedGraduationYear: newGradYear,
      totalCreditsPlanned: Math.round(plannedCredits * 100) / 100,
      totalCreditsCompleted: Math.round(completedCredits * 100) / 100,
      overallCompletionPercentage: pct,
    });

    return { plan: await this.planRepo.save(plan), diff };
  }

  /**
   * Compute a structural diff between two plan semester layouts.
   *
   * ALGORITHM:
   *   1. Build courseId → termKey maps for old and new semesters.
   *   2. New courses not in old map = added.
   *   3. Old courses not in new map = removed.
   *   4. Courses in both maps with different termKey = moved.
   *   5. Semester-slot count delta = semestersAdded / semestersRemoved.
   *   6. Graduation date change = human-readable delta string.
   *
   * WHY: Students need to understand the *impact* of changing a constraint.
   * "3 courses moved, graduation pushed 1 semester" is more actionable than
   * a silent full plan replacement.
   */
  private computeDiff(
    oldSemesters: PlannedSemesterData[],
    newSemesters: PlannedSemesterData[],
    oldGradTerm: string,
    oldGradYear: number,
    oldTotalSemesters: number,
    newGradTerm: string,
    newGradYear: number,
    newTotalSemesters: number,
  ): PlanDiff {
    // ── Build course → termKey lookup maps ───────────────────────────
    type CourseInfo = { termKey: string; code: string; title: string };
    const oldMap = new Map<string, CourseInfo>();
    for (const sem of oldSemesters) {
      for (const c of sem.courses) {
        oldMap.set(c.courseId, {
          termKey: sem.termKey,
          code: c.code,
          title: c.title,
        });
      }
    }
    const newMap = new Map<string, CourseInfo>();
    for (const sem of newSemesters) {
      for (const c of sem.courses) {
        newMap.set(c.courseId, {
          termKey: sem.termKey,
          code: c.code,
          title: c.title,
        });
      }
    }

    // ── Categorize changes ────────────────────────────────────────────
    const added: DiffCourse[] = [];
    const removed: DiffCourse[] = [];
    const moved: MovedCourse[] = [];

    for (const [id, info] of newMap) {
      if (!oldMap.has(id)) {
        added.push({
          courseId: id,
          code: info.code,
          title: info.title,
          termKey: info.termKey,
        });
      }
    }
    for (const [id, info] of oldMap) {
      if (!newMap.has(id)) {
        removed.push({
          courseId: id,
          code: info.code,
          title: info.title,
          termKey: info.termKey,
        });
      }
    }
    for (const [id, oldInfo] of oldMap) {
      const newInfo = newMap.get(id);
      if (newInfo && oldInfo.termKey !== newInfo.termKey) {
        moved.push({
          courseId: id,
          code: oldInfo.code,
          title: oldInfo.title,
          fromTermKey: oldInfo.termKey,
          toTermKey: newInfo.termKey,
        });
      }
    }

    // ── Semester slot delta ───────────────────────────────────────────
    const oldTermKeys = new Set(oldSemesters.map((s) => s.termKey));
    const newTermKeys = new Set(newSemesters.map((s) => s.termKey));
    const semestersAdded = [...newTermKeys].filter(
      (k) => !oldTermKeys.has(k),
    ).length;
    const semestersRemoved = [...oldTermKeys].filter(
      (k) => !newTermKeys.has(k),
    ).length;

    // ── Graduation date change ────────────────────────────────────────
    const oldLabel = `${this.capitalize(oldGradTerm)} ${oldGradYear}`;
    const newLabel = `${this.capitalize(newGradTerm)} ${newGradYear}`;
    let graduationDateChange: string | undefined;
    if (oldLabel !== newLabel) {
      const delta = newTotalSemesters - oldTotalSemesters;
      const sign = delta > 0 ? '+' : '';
      const semWord = Math.abs(delta) === 1 ? 'semester' : 'semesters';
      if (delta !== 0) {
        graduationDateChange = `${sign}${delta} ${semWord} (${oldLabel} → ${newLabel})`;
      } else {
        graduationDateChange = `Same duration, different schedule (${oldLabel} → ${newLabel})`;
      }
    }

    return {
      added,
      removed,
      moved,
      semestersAdded,
      semestersRemoved,
      graduationDateChange,
    };
  }

  private capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  /**
   * Advance to the next term in the Fall → Spring → Summer → Fall cycle.
   *
   * Fall  → Spring next year
   * Spring → Summer same year
   * Summer → Fall same year
   */
  private advanceTerm(term: string, year: number): [string, number] {
    if (term === 'fall') return ['spring', year + 1];
    if (term === 'spring') return ['summer', year];
    return ['fall', year]; // summer → fall
  }

  /**
   * Infer the next upcoming term based on the current calendar date.
   *
   * Jan–Aug → Fall of the current year (next major term after spring)
   * Sep–Dec → Spring of next year
   */
  private inferStartTerm(): { term: string; year: number } {
    const now = new Date();
    const month = now.getMonth(); // 0 = Jan, 11 = Dec
    const year = now.getFullYear();
    if (month <= 7) return { term: 'fall', year };
    return { term: 'spring', year: year + 1 };
  }
}
