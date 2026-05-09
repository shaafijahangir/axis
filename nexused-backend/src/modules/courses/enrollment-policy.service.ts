import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CourseSection } from '../../database/entities/course-section.entity';
import { Course } from '../../database/entities/course.entity';
import {
  Enrollment,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import {
  StudentDegreeProfile,
  DegreeProfileStatus,
} from '../../database/entities/student-degree-profile.entity';
import { TenantService } from '../../tenant/tenant.service';
import { PrerequisiteEnforcement } from '../../tenant/enrollment-policy.types';

/**
 * EnrollmentPolicyService — enforces tenant-level enrollment rules.
 *
 * Called by CoursesService.enrollStudent() after existing section-level
 * checks (mode, duplicates, capacity) have passed.
 *
 * WHY separate service: Policy rules are cross-cutting (they apply to
 * UI, AI, and bulk enrollment paths) and depend on different repos than
 * CoursesService manages. Keeping them here prevents the service from
 * becoming a god object.
 *
 * PATTERN: Throws ForbiddenException to abort enrollment. Does not
 * return a value — silence means "all checks passed".
 */
@Injectable()
export class EnrollmentPolicyService {
  private readonly logger = new Logger(EnrollmentPolicyService.name);

  constructor(
    private readonly tenantService: TenantService,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(StudentDegreeProfile)
    private readonly profileRepo: Repository<StudentDegreeProfile>,
  ) {}

  /**
   * Get the enrollment policy for a tenant (for callers that need the
   * policy object itself, e.g. to check waitlistEnabled).
   */
  async getPolicy(tenantId: string) {
    return this.tenantService.getEnrollmentPolicy(tenantId);
  }

  /**
   * Run all policy checks for a pending enrollment.
   *
   * @param tenantId  The tenant the enrollment belongs to
   * @param userId    The student attempting to enroll
   * @param section   The target section (already loaded by CoursesService)
   *
   * Throws ForbiddenException if any STRICT check fails.
   * Logs warnings for WARN-mode violations but allows enrollment.
   */
  async check(
    tenantId: string,
    userId: string,
    section: CourseSection & { course: Course },
  ): Promise<void> {
    const policy = await this.tenantService.getEnrollmentPolicy(tenantId);

    // 1. Enrollment window check
    this.checkEnrollmentWindow(policy, section);

    // 2. Credit hour limit check
    await this.checkCreditHourLimit(policy, tenantId, userId, section);

    // 3. Prerequisite check
    await this.checkPrerequisites(policy, tenantId, userId, section);
  }

  // ─── Window Check ────────────────────────────────────────────────────────

  private checkEnrollmentWindow(
    policy: {
      enrollmentWindowStart: string | null;
      enrollmentWindowEnd: string | null;
    },
    _section: CourseSection,
  ): void {
    const now = new Date();

    if (policy.enrollmentWindowStart) {
      const start = new Date(policy.enrollmentWindowStart);
      if (now < start) {
        throw new ForbiddenException(
          `Enrollment is not yet open. It opens on ${start.toLocaleDateString()}.`,
        );
      }
    }

    if (policy.enrollmentWindowEnd) {
      const end = new Date(policy.enrollmentWindowEnd);
      if (now > end) {
        throw new ForbiddenException(
          `Enrollment has closed. The deadline was ${end.toLocaleDateString()}.`,
        );
      }
    }
  }

  // ─── Credit Hour Limit ────────────────────────────────────────────────────

  /**
   * Sum all course credits the student is actively enrolled in for
   * the same term as the target section. If the total would exceed
   * the policy limit, block enrollment.
   *
   * WHY: We query enrollments by termId (via section join) rather than
   * directly storing credits on Enrollment. This is correct because
   * credits live on Course, not on Enrollment.
   */
  private async checkCreditHourLimit(
    policy: { creditHourLimitPerTerm: number | null },
    tenantId: string,
    userId: string,
    targetSection: CourseSection & { course: Course },
  ): Promise<void> {
    if (!policy.creditHourLimitPerTerm) return;

    // Load all active enrollments for this student in the same term
    const activeEnrollments = await this.enrollmentRepo
      .createQueryBuilder('e')
      .innerJoin('course_sections', 's', 's.id = e."sectionId"')
      .innerJoin('courses', 'c', 'c.id = s."courseId"')
      .select('COALESCE(c.credits, 0)', 'credits')
      .where('e."userId" = :userId', { userId })
      .andWhere('e."tenantId" = :tenantId', { tenantId })
      .andWhere('s."termId" = :termId', { termId: targetSection.termId })
      .andWhere('e.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING],
      })
      .getRawMany<{ credits: string }>();

    const currentCredits = activeEnrollments.reduce(
      (sum, row) => sum + parseFloat(row.credits),
      0,
    );
    const courseCredits = Number(targetSection.course.credits) || 0;
    const total = currentCredits + courseCredits;

    if (total > policy.creditHourLimitPerTerm) {
      throw new ForbiddenException(
        `Enrolling in this course would put you at ${total} credits this term, ` +
          `exceeding the ${policy.creditHourLimitPerTerm}-credit limit. ` +
          `You currently have ${currentCredits} credits scheduled.`,
      );
    }
  }

  // ─── Prerequisite Check ──────────────────────────────────────────────────

  /**
   * Checks whether the student has completed the prerequisite courses
   * for the target section's course.
   *
   * Source of truth: StudentDegreeProfile.completedCourseIds, which includes
   * transfer credits, AP credits, and historical data outside Axis.
   *
   * WHY profile over enrollment records: See StudentDegreeProfile entity
   * comment — transfer/AP/historical credits don't have enrollment rows.
   *
   * If no degree profile exists, we fall through silently — the student
   * may not be enrolled in a degree program but can still take courses.
   */
  private async checkPrerequisites(
    policy: { prerequisiteEnforcement: PrerequisiteEnforcement },
    tenantId: string,
    userId: string,
    section: CourseSection & { course: Course },
  ): Promise<void> {
    if (policy.prerequisiteEnforcement === PrerequisiteEnforcement.OFF) return;

    const course = section.course;
    const prereqIds = course.prerequisiteCourseIds;
    if (!prereqIds || prereqIds.length === 0) return;

    // Load active student degree profile for completion data
    const profile = await this.profileRepo.findOne({
      where: { userId, tenantId, status: DegreeProfileStatus.ACTIVE },
    });

    // No profile → can't verify. In warn mode, log and proceed. In strict, block.
    if (!profile) {
      if (policy.prerequisiteEnforcement === PrerequisiteEnforcement.STRICT) {
        throw new ForbiddenException(
          `You must have a degree profile to enroll in ${course.code}. ` +
            `Please contact your advisor to set up your academic record.`,
        );
      }
      this.logger.warn(
        `No degree profile found for user ${userId} — prerequisite check skipped for ${course.code}`,
      );
      return;
    }

    const completed = new Set(profile.completedCourseIds);
    const missing = prereqIds.filter((id) => !completed.has(id));

    if (missing.length === 0) return;

    // Load course codes for friendly error messages
    const missingCourses = await this.courseRepo.find({
      where: { id: In(missing) },
      select: ['id', 'code', 'title'],
    });
    const missingLabel = missingCourses.map((c) => c.code).join(', ');

    if (policy.prerequisiteEnforcement === PrerequisiteEnforcement.STRICT) {
      throw new ForbiddenException(
        `You have not completed the prerequisites for ${course.code}: ${missingLabel}. ` +
          `Complete these courses before enrolling.`,
      );
    }

    // WARN mode — allow but log
    this.logger.warn(
      `Prerequisite warning: user ${userId} enrolled in ${course.code} ` +
        `without completing: ${missingLabel}`,
    );
  }
}
