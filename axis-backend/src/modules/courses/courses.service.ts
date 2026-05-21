import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  CatalogCourse,
  CatalogSection,
  StudentCatalogFilter,
  StudentCatalogPage,
} from './dto/catalog-student.types';
import {
  SectionStatus,
  EnrollmentMode,
} from '../../database/entities/course-section.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Course,
  CourseSection,
  Enrollment,
  EnrollmentRole,
  EnrollmentStatus,
} from '../../database/entities';
import {
  CreateCourseInput,
  CreateSectionInput,
  UpdateCourseInput,
  CatalogFilterInput,
  CatalogPage,
  BatchCourseItem,
} from './dto/course.types';
import { ImportResult } from './dto/course.types';
import {
  UpdateSectionInput,
  AdminEnrollInput,
  AdminUpdateEnrollmentInput,
  BulkEnrollInput,
  BulkDropInput,
  BulkMoveInput,
  AdminCreateSectionInput,
} from './dto/admin-course.types';
import { NexusEvents } from '../ai/events/ai-events';
import { EnrollmentPolicyService } from './enrollment-policy.service';
import { WaitlistService } from './waitlist.service';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    @InjectRepository(CourseSection)
    private sectionsRepository: Repository<CourseSection>,
    @InjectRepository(Enrollment)
    private enrollmentsRepository: Repository<Enrollment>,
    private eventEmitter: EventEmitter2,
    private dataSource: DataSource,
    private enrollmentPolicyService: EnrollmentPolicyService,
    private waitlistService: WaitlistService,
  ) {}

  async findAllForTenant(tenantId: string): Promise<Course[]> {
    return this.coursesRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<Course> {
    const course = await this.coursesRepository.findOne({
      where: { id, tenantId },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(tenantId: string, input: CreateCourseInput): Promise<Course> {
    const course = this.coursesRepository.create({ ...input, tenantId });
    const saved = await this.coursesRepository.save(course);

    this.eventEmitter.emit(NexusEvents.COURSE_CREATED, {
      courseId: saved.id,
      tenantId,
      createdBy: tenantId, // Will be replaced with actual userId when resolver passes it
      title: saved.title,
      code: saved.code,
    });

    return saved;
  }

  /**
   * Batch-create courses from AI extraction review.
   *
   * Best-effort semantics (not all-or-nothing): each course is attempted
   * independently so a single duplicate doesn't block 199 valid imports.
   * The admin has already reviewed the data, so partial success is acceptable.
   *
   * Prerequisite codes are resolved to IDs from the existing tenant catalog.
   * Unmatched codes are silently dropped (flagged in the UI before this call).
   */
  async batchCreate(
    tenantId: string,
    items: BatchCourseItem[],
  ): Promise<ImportResult> {
    const existing = await this.coursesRepository.find({
      where: { tenantId },
      select: ['id', 'code'],
    });
    const codeToId = new Map(existing.map((c) => [c.code, c.id]));

    let imported = 0;
    const errors: { row: number; field: string; message: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const prereqIds = (item.prerequisiteCodes ?? [])
          .filter((code) => codeToId.has(code))
          .map((code) => codeToId.get(code)!);

        const coreqIds = (item.corequisiteCodes ?? [])
          .filter((code) => codeToId.has(code))
          .map((code) => codeToId.get(code)!);

        await this.create(tenantId, {
          code: item.code,
          title: item.title,
          description: item.description,
          credits: item.credits,
          departmentId: item.department,
          category: item.category,
          courseLevel: item.courseLevel,
          offeredSemesters: item.offeredSemesters,
          prerequisiteCourseIds: prereqIds,
          corequisiteCourseIds: coreqIds,
        });

        // Keep code→ID map current so later courses can reference earlier ones
        imported++;
      } catch (err) {
        errors.push({
          row: i + 1,
          field: 'general',
          message:
            err instanceof Error ? err.message : 'Failed to create course',
        });
      }
    }

    return { imported, success: errors.length === 0, errors };
  }

  async findSectionsForCourse(
    courseId: string,
    tenantId: string,
  ): Promise<CourseSection[]> {
    // Join through course to verify tenant ownership
    return this.sectionsRepository
      .createQueryBuilder('section')
      .innerJoinAndSelect('section.course', 'course')
      .leftJoinAndSelect('section.instructor', 'instructor')
      .where('section.courseId = :courseId', { courseId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .orderBy('section.createdAt', 'DESC')
      .getMany();
  }

  async findSectionsForInstructor(
    instructorId: string,
    tenantId: string,
  ): Promise<CourseSection[]> {
    // Join through course to verify tenant ownership
    return this.sectionsRepository
      .createQueryBuilder('section')
      .innerJoinAndSelect('section.course', 'course')
      .leftJoinAndSelect('section.instructor', 'instructor')
      .where('section.instructorId = :instructorId', { instructorId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .orderBy('section.createdAt', 'DESC')
      .getMany();
  }

  async findSectionById(id: string, tenantId: string): Promise<CourseSection> {
    const section = await this.sectionsRepository
      .createQueryBuilder('section')
      .innerJoinAndSelect('section.course', 'course')
      .leftJoinAndSelect('section.instructor', 'instructor')
      .where('section.id = :id', { id })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .getOne();
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }

  /**
   * SPRINT-1: Cross-field validation for the typed schedule columns.
   *  - If any of meetingDays/startTime/endTime is provided, the others must be too
   *  - endTime must be strictly after startTime
   *
   * `null` or `undefined` values are treated as unset.
   */
  private validateSchedule(input: {
    meetingDays?: string[] | null;
    startTime?: string | null;
    endTime?: string | null;
  }): void {
    const hasDays = !!input.meetingDays && input.meetingDays.length > 0;
    const hasStart = !!input.startTime;
    const hasEnd = !!input.endTime;

    if (!hasDays && !hasStart && !hasEnd) return; // all unset is fine

    if (!hasDays || !hasStart || !hasEnd) {
      throw new BadRequestException(
        'meetingDays, startTime, and endTime must all be set together (or all left blank)',
      );
    }

    if (input.startTime! >= input.endTime!) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  async createSection(
    instructorId: string,
    input: CreateSectionInput,
  ): Promise<CourseSection> {
    this.validateSchedule(input);

    const section = this.sectionsRepository.create({
      courseId: input.courseId,
      termId: input.termId,
      instructorId,
      location: input.location,
      capacity: input.capacity,
      meetingDays: input.meetingDays ?? [],
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      room: input.room ?? null,
      schedule: input.schedule ?? null,
    });
    const saved = await this.sectionsRepository.save(section);

    // Look up course to get tenantId for the event
    const course = await this.coursesRepository.findOne({
      where: { id: input.courseId },
    });
    if (course) {
      this.eventEmitter.emit(NexusEvents.SECTION_CREATED, {
        sectionId: saved.id,
        courseId: input.courseId,
        tenantId: course.tenantId,
        instructorId,
      });
    }

    return saved;
  }

  async findEnrollmentsForUser(
    userId: string,
    tenantId: string,
  ): Promise<Enrollment[]> {
    // Join through section → course to verify tenant ownership
    return this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.section', 'section')
      .innerJoinAndSelect('section.course', 'course')
      .leftJoinAndSelect('section.instructor', 'instructor')
      .where('enrollment.userId = :userId', { userId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .orderBy('enrollment.enrolledAt', 'DESC')
      .getMany();
  }

  /**
   * ENROLL-002: Student self-enrollment with full validation.
   *
   * Validates in order:
   *  1. Section exists in this tenant
   *  2. Enrollment mode (invite_only → code must match)
   *  3. No duplicate active/pending enrollment
   *  4. Seat availability (skipped when capacity is null)
   *  5. Creates enrollment — status depends on section.autoApprove
   *
   * WHY: The old enrollStudent() had none of these checks. Admin-forced
   * enrollment (adminEnroll) bypasses this for manual overrides.
   */
  async enrollStudent(
    tenantId: string,
    userId: string,
    sectionId: string,
    inviteCode?: string,
  ): Promise<Enrollment> {
    // 1. Load section + course for tenant validation
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });
    if (!section || section.course.tenantId !== tenantId) {
      throw new NotFoundException('Section not found');
    }

    // 2. Invite code check
    if (section.enrollmentMode === EnrollmentMode.INVITE_ONLY) {
      if (!inviteCode || inviteCode.toUpperCase() !== section.inviteCode) {
        throw new ForbiddenException('Invalid or missing invite code');
      }
    }

    // 3. Duplicate enrollment check (ignore dropped/withdrawn/rejected)
    const duplicate = await this.enrollmentsRepository.findOne({
      where: {
        userId,
        sectionId,
        status: In([
          EnrollmentStatus.ACTIVE,
          EnrollmentStatus.PENDING,
          EnrollmentStatus.WAITLISTED,
        ]),
      },
    });
    if (duplicate) {
      throw new ConflictException(
        'You are already enrolled or have a pending enrollment in this section',
      );
    }

    // 4. Seat availability check — waitlist if full and enabled
    if (section.capacity != null) {
      const seatOccupied = await this.enrollmentsRepository.count({
        where: {
          sectionId,
          status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING]),
        },
      });
      if (seatOccupied >= section.capacity) {
        // Section is full — try waitlist
        const policy = await this.enrollmentPolicyService.getPolicy(tenantId);
        if (policy.waitlistEnabled) {
          // Run policy checks before waitlisting (window, credits, prereqs)
          await this.enrollmentPolicyService.check(tenantId, userId, section);
          return this.waitlistService.placeOnWaitlist(
            tenantId,
            userId,
            sectionId,
          );
        }
        throw new ForbiddenException(
          'This section is full — no seats available',
        );
      }
    }

    // 5. Tenant enrollment policy checks (window, credit limit, prerequisites)
    await this.enrollmentPolicyService.check(tenantId, userId, section);

    // 6. Create enrollment — active if autoApprove, pending if manual approval required
    const status = section.autoApprove
      ? EnrollmentStatus.ACTIVE
      : EnrollmentStatus.PENDING;

    const enrollment = this.enrollmentsRepository.create({
      tenantId,
      userId,
      sectionId,
      status,
      enrolledAt: new Date(),
    });
    const saved = await this.enrollmentsRepository.save(enrollment);

    // Only trigger the Study Coach welcome for confirmed (active) enrollments.
    // Pending enrollments fire the event when approved (see approveEnrollment).
    if (status === EnrollmentStatus.ACTIVE) {
      this.eventEmitter.emit(NexusEvents.ENROLLMENT_CREATED, {
        enrollmentId: saved.id,
        userId,
        sectionId,
        tenantId,
      });
    }

    return saved;
  }

  // ─── ENROLL-002: Invite codes & approval ─────────────────────────────────────

  /**
   * Generates a new random 6-character alphanumeric invite code for a section
   * and switches the section's enrollment mode to invite_only.
   *
   * WHY: Instructor calls this when they want to restrict self-enrollment to
   * students who have the code (shared out-of-band).
   */
  async generateInviteCode(
    sectionId: string,
    tenantId: string,
  ): Promise<CourseSection> {
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });
    if (!section || section.course.tenantId !== tenantId) {
      throw new NotFoundException('Section not found');
    }

    // 6-char base-36 code, uppercased. Collision probability is negligible at scale.
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    await this.sectionsRepository.update(sectionId, {
      inviteCode: code,
      enrollmentMode: EnrollmentMode.INVITE_ONLY,
    });

    return this.sectionsRepository.findOneOrFail({
      where: { id: sectionId },
      relations: ['course', 'instructor'],
    });
  }

  /**
   * Updates the enrollment mode and autoApprove settings for a section.
   * If switching to OPEN, the invite code is cleared.
   */
  async updateSectionEnrollmentSettings(
    sectionId: string,
    tenantId: string,
    mode: EnrollmentMode,
    autoApprove: boolean,
  ): Promise<CourseSection> {
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });
    if (!section || section.course.tenantId !== tenantId) {
      throw new NotFoundException('Section not found');
    }

    await this.sectionsRepository.update(sectionId, {
      enrollmentMode: mode,
      autoApprove,
    });

    return this.sectionsRepository.findOneOrFail({
      where: { id: sectionId },
      relations: ['course', 'instructor'],
    });
  }

  /** Approve a pending enrollment → active. Fires ENROLLMENT_CREATED event. */
  async approveEnrollment(
    enrollmentId: string,
    tenantId: string,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { id: enrollmentId, tenantId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new ForbiddenException('Only pending enrollments can be approved');
    }

    await this.enrollmentsRepository.update(enrollmentId, {
      status: EnrollmentStatus.ACTIVE,
    });
    const updated = await this.enrollmentsRepository.findOneOrFail({
      where: { id: enrollmentId },
      relations: ['user', 'section'],
    });

    this.eventEmitter.emit(NexusEvents.ENROLLMENT_CREATED, {
      enrollmentId: updated.id,
      userId: updated.userId,
      sectionId: updated.sectionId,
      tenantId,
    });

    return updated;
  }

  /** Reject a pending enrollment. */
  async rejectEnrollment(
    enrollmentId: string,
    tenantId: string,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { id: enrollmentId, tenantId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.status !== EnrollmentStatus.PENDING) {
      throw new ForbiddenException('Only pending enrollments can be rejected');
    }

    await this.enrollmentsRepository.update(enrollmentId, {
      status: EnrollmentStatus.REJECTED,
    });
    return this.enrollmentsRepository.findOneOrFail({
      where: { id: enrollmentId },
      relations: ['user'],
    });
  }

  /** Returns all pending enrollments for a section (for instructor review). */
  async pendingEnrollmentsForSection(
    sectionId: string,
    tenantId: string,
  ): Promise<Enrollment[]> {
    return this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.user', 'user')
      .innerJoin('enrollment.section', 'section')
      .innerJoin('section.course', 'course')
      .where('enrollment.sectionId = :sectionId', { sectionId })
      .andWhere('enrollment.status = :status', {
        status: EnrollmentStatus.PENDING,
      })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .orderBy('enrollment.enrolledAt', 'ASC')
      .getMany();
  }

  // ─── ENROLL-003: Enrollment lifecycle ────────────────────────────────────────

  /** Returns the calling student's enrollment for a specific section, or null. */
  async getMyEnrollmentForSection(
    userId: string,
    sectionId: string,
    tenantId: string,
  ): Promise<Enrollment | null> {
    return this.enrollmentsRepository.findOne({
      where: { userId, sectionId, tenantId },
    });
  }

  /**
   * ENROLL-003: Student drops an active enrollment before the drop deadline.
   *
   * Drop = clean removal, no transcript record.
   * Only valid before the term's dropDeadline (if set).
   */
  async dropCourse(
    enrollmentId: string,
    userId: string,
    tenantId: string,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { id: enrollmentId, tenantId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.userId !== userId) {
      throw new ForbiddenException('You can only drop your own enrollments');
    }
    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('Only active enrollments can be dropped');
    }

    // Load section + term to validate deadline
    const section = await this.sectionsRepository.findOne({
      where: { id: enrollment.sectionId },
      relations: ['term'],
    });
    const now = new Date();
    if (
      section?.term?.dropDeadline &&
      now > new Date(section.term.dropDeadline)
    ) {
      throw new ForbiddenException(
        'The drop deadline has passed. You may be able to withdraw instead.',
      );
    }

    await this.enrollmentsRepository.update(enrollmentId, {
      status: EnrollmentStatus.DROPPED,
    });

    this.eventEmitter.emit(NexusEvents.ENROLLMENT_DROPPED, {
      enrollmentId,
      userId,
      sectionId: enrollment.sectionId,
      tenantId,
    });

    // ENROLL-010: A seat freed up — try to promote the next waitlisted student
    await this.waitlistService.promoteFromWaitlist(
      enrollment.sectionId,
      tenantId,
    );

    return this.enrollmentsRepository.findOneOrFail({
      where: { id: enrollmentId },
    });
  }

  /**
   * ENROLL-003: Student withdraws from an active enrollment.
   *
   * Withdraw = "W" on transcript. Only valid before the term's withdrawDeadline.
   * After the drop deadline, withdraw is the only option.
   */
  async withdrawFromCourse(
    enrollmentId: string,
    userId: string,
    tenantId: string,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { id: enrollmentId, tenantId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.userId !== userId) {
      throw new ForbiddenException(
        'You can only withdraw from your own enrollments',
      );
    }
    if (enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException(
        'Only active enrollments can be withdrawn from',
      );
    }

    // Load section + term to validate deadline
    const section = await this.sectionsRepository.findOne({
      where: { id: enrollment.sectionId },
      relations: ['term'],
    });
    const now = new Date();
    if (
      section?.term?.withdrawDeadline &&
      now > new Date(section.term.withdrawDeadline)
    ) {
      throw new ForbiddenException(
        'The withdrawal deadline has passed. Contact your institution for assistance.',
      );
    }

    await this.enrollmentsRepository.update(enrollmentId, {
      status: EnrollmentStatus.WITHDRAWN,
    });

    this.eventEmitter.emit(NexusEvents.ENROLLMENT_WITHDRAWN, {
      enrollmentId,
      userId,
      sectionId: enrollment.sectionId,
      tenantId,
    });

    // ENROLL-010: A seat freed up — try to promote the next waitlisted student
    await this.waitlistService.promoteFromWaitlist(
      enrollment.sectionId,
      tenantId,
    );

    return this.enrollmentsRepository.findOneOrFail({
      where: { id: enrollmentId },
    });
  }

  /**
   * ENROLL-003: Admin forces any enrollment to any status, bypassing deadlines.
   * Fires the appropriate event so downstream listeners stay consistent.
   */
  async adminForceEnrollmentStatus(
    enrollmentId: string,
    tenantId: string,
    status: EnrollmentStatus,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { id: enrollmentId, tenantId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    await this.enrollmentsRepository.update(enrollmentId, { status });

    // Emit the relevant lifecycle event
    if (status === EnrollmentStatus.ACTIVE) {
      this.eventEmitter.emit(NexusEvents.ENROLLMENT_CREATED, {
        enrollmentId,
        userId: enrollment.userId,
        sectionId: enrollment.sectionId,
        tenantId,
      });
    } else if (status === EnrollmentStatus.DROPPED) {
      this.eventEmitter.emit(NexusEvents.ENROLLMENT_DROPPED, {
        enrollmentId,
        userId: enrollment.userId,
        sectionId: enrollment.sectionId,
        tenantId,
      });
      // ENROLL-010: seat freed — promote next waitlisted student
      await this.waitlistService.promoteFromWaitlist(
        enrollment.sectionId,
        tenantId,
      );
    } else if (status === EnrollmentStatus.WITHDRAWN) {
      this.eventEmitter.emit(NexusEvents.ENROLLMENT_WITHDRAWN, {
        enrollmentId,
        userId: enrollment.userId,
        sectionId: enrollment.sectionId,
        tenantId,
      });
      // ENROLL-010: seat freed — promote next waitlisted student
      await this.waitlistService.promoteFromWaitlist(
        enrollment.sectionId,
        tenantId,
      );
    }

    return this.enrollmentsRepository.findOneOrFail({
      where: { id: enrollmentId },
      relations: ['user'],
    });
  }

  async findEnrollmentsForSection(
    sectionId: string,
    tenantId: string,
  ): Promise<Enrollment[]> {
    // Join through section → course to verify tenant ownership
    return this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.user', 'user')
      .innerJoinAndSelect('enrollment.section', 'section')
      .innerJoin('section.course', 'course')
      .where('enrollment.sectionId = :sectionId', { sectionId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .orderBy('enrollment.enrolledAt', 'ASC')
      .getMany();
  }

  async countCourses(tenantId: string): Promise<number> {
    return this.coursesRepository.count({ where: { tenantId } });
  }

  async countSections(tenantId: string): Promise<number> {
    const sections = await this.sectionsRepository
      .createQueryBuilder('section')
      .innerJoin('section.course', 'course')
      .where('course.tenantId = :tenantId', { tenantId })
      .getCount();
    return sections;
  }

  async countEnrollments(tenantId: string): Promise<number> {
    const enrollments = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.section', 'section')
      .innerJoin('section.course', 'course')
      .where('course.tenantId = :tenantId', { tenantId })
      .getCount();
    return enrollments;
  }

  // --- Catalog methods ---

  /**
   * ONBOARD-002: Paginated catalog search with filters.
   * WHY: Admins need to browse/search the full course catalog, not just a
   * flat list. ILIKE search on title+code, plus enum/level filters.
   */
  async catalogCourses(
    tenantId: string,
    filters: CatalogFilterInput,
  ): Promise<CatalogPage> {
    const qb = this.coursesRepository
      .createQueryBuilder('course')
      .where('course.tenantId = :tenantId', { tenantId });

    if (filters.search) {
      qb.andWhere('(course.title ILIKE :search OR course.code ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }
    if (filters.departmentId) {
      qb.andWhere('course.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      });
    }
    if (filters.category) {
      qb.andWhere('course.category = :category', {
        category: filters.category,
      });
    }
    if (filters.courseLevel) {
      qb.andWhere('course.courseLevel = :courseLevel', {
        courseLevel: filters.courseLevel,
      });
    }

    const total = await qb.getCount();

    const items = await qb
      .orderBy('course.code', 'ASC')
      .skip(filters.offset ?? 0)
      .take(filters.limit ?? 50)
      .getMany();

    return { items, total };
  }

  /**
   * ONBOARD-002: Distinct department IDs for filter dropdowns.
   * WHY: The catalog filter UI needs a list of departments that actually
   * have courses — not a static list.
   */
  async distinctDepartments(tenantId: string): Promise<string[]> {
    const rows = await this.coursesRepository
      .createQueryBuilder('course')
      .select('DISTINCT course.departmentId', 'departmentId')
      .where('course.tenantId = :tenantId', { tenantId })
      .andWhere('course.departmentId IS NOT NULL')
      .orderBy('course.departmentId', 'ASC')
      .getRawMany<{ departmentId: string }>();
    return rows.map((r) => r.departmentId);
  }

  // --- Admin methods ---

  async updateCourse(
    id: string,
    tenantId: string,
    input: UpdateCourseInput,
  ): Promise<Course> {
    const course = await this.coursesRepository.findOne({
      where: { id, tenantId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const updateData: Partial<Course> = {};
    if (input.code !== undefined) updateData.code = input.code;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.credits !== undefined) updateData.credits = input.credits;
    if (input.departmentId !== undefined)
      updateData.departmentId = input.departmentId;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.courseLevel !== undefined)
      updateData.courseLevel = input.courseLevel;
    if (input.offeredSemesters !== undefined)
      updateData.offeredSemesters = input.offeredSemesters;
    if (input.prerequisiteCourseIds !== undefined)
      updateData.prerequisiteCourseIds = input.prerequisiteCourseIds;
    if (input.corequisiteCourseIds !== undefined)
      updateData.corequisiteCourseIds = input.corequisiteCourseIds;

    await this.coursesRepository.update(id, updateData);
    return this.coursesRepository.findOneOrFail({ where: { id } });
  }

  async removeCourse(id: string, tenantId: string): Promise<boolean> {
    const course = await this.coursesRepository.findOne({
      where: { id, tenantId },
    });
    if (!course) throw new NotFoundException('Course not found');

    // Check if any sections reference this course
    const sectionCount = await this.sectionsRepository.count({
      where: { courseId: id },
    });
    if (sectionCount > 0) {
      throw new ForbiddenException(
        `Cannot delete course: ${sectionCount} section(s) still reference it`,
      );
    }

    await this.coursesRepository.remove(course);
    return true;
  }

  async findAllSectionsForTenant(tenantId: string): Promise<CourseSection[]> {
    return this.sectionsRepository
      .createQueryBuilder('section')
      .innerJoinAndSelect('section.course', 'course')
      .leftJoinAndSelect('section.instructor', 'instructor')
      .where('course.tenantId = :tenantId', { tenantId })
      .orderBy('section.createdAt', 'DESC')
      .getMany();
  }

  async adminCreateSection(
    input: AdminCreateSectionInput,
  ): Promise<CourseSection> {
    this.validateSchedule(input);

    const section = this.sectionsRepository.create({
      courseId: input.courseId,
      termId: input.termId,
      instructorId: input.instructorId,
      location: input.location,
      capacity: input.capacity,
      meetingDays: input.meetingDays ?? [],
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      room: input.room ?? null,
      schedule: input.schedule ?? undefined,
    });
    return this.sectionsRepository.save(section);
  }

  async updateSection(
    id: string,
    tenantId: string,
    input: UpdateSectionInput,
  ): Promise<CourseSection> {
    // Verify section belongs to a course in this tenant
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: ['course'],
    });
    if (!section || section.course.tenantId !== tenantId) {
      throw new NotFoundException('Section not found');
    }

    // SPRINT-1: validate the merged schedule state — if any field is touched,
    // we need to look at the FINAL state (existing values + incoming patch)
    const merged = {
      meetingDays:
        input.meetingDays !== undefined
          ? input.meetingDays
          : section.meetingDays,
      startTime:
        input.startTime !== undefined ? input.startTime : section.startTime,
      endTime: input.endTime !== undefined ? input.endTime : section.endTime,
    };
    this.validateSchedule(merged);

    const updateData: Partial<CourseSection> = {};
    if (input.location !== undefined) updateData.location = input.location;
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.instructorId !== undefined)
      updateData.instructorId = input.instructorId;
    if (input.meetingDays !== undefined)
      updateData.meetingDays = input.meetingDays;
    if (input.startTime !== undefined)
      updateData.startTime = input.startTime ?? null;
    if (input.endTime !== undefined) updateData.endTime = input.endTime ?? null;
    if (input.room !== undefined) updateData.room = input.room ?? null;
    if (input.schedule !== undefined)
      updateData.schedule = input.schedule ?? undefined;

    await this.sectionsRepository.update(id, updateData);
    return this.sectionsRepository.findOneOrFail({
      where: { id },
      relations: ['course', 'instructor'],
    });
  }

  async removeSection(id: string, tenantId: string): Promise<boolean> {
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: ['course'],
    });
    if (!section || section.course.tenantId !== tenantId) {
      throw new NotFoundException('Section not found');
    }

    // Check if any enrollments reference this section
    const enrollmentCount = await this.enrollmentsRepository.count({
      where: { sectionId: id },
    });
    if (enrollmentCount > 0) {
      throw new ForbiddenException(
        `Cannot delete section: ${enrollmentCount} enrollment(s) still reference it`,
      );
    }

    await this.sectionsRepository.remove(section);
    return true;
  }

  async adminEnroll(
    tenantId: string,
    input: AdminEnrollInput,
  ): Promise<Enrollment> {
    // Check for duplicate enrollment
    const existing = await this.enrollmentsRepository.findOne({
      where: { userId: input.userId, sectionId: input.sectionId },
    });
    if (existing) {
      throw new ConflictException('User is already enrolled in this section');
    }

    const enrollment = this.enrollmentsRepository.create({
      tenantId,
      userId: input.userId,
      sectionId: input.sectionId,
      role: input.role ?? EnrollmentRole.STUDENT,
      status: EnrollmentStatus.ACTIVE,
      enrolledAt: new Date(),
    });
    return this.enrollmentsRepository.save(enrollment);
  }

  async adminUpdateEnrollment(
    id: string,
    tenantId: string,
    input: AdminUpdateEnrollmentInput,
  ): Promise<Enrollment> {
    // Verify enrollment belongs to a section in this tenant
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { id },
      relations: ['section', 'section.course'],
    });
    if (!enrollment || enrollment.section.course.tenantId !== tenantId) {
      throw new NotFoundException('Enrollment not found');
    }

    const updateData: Partial<Enrollment> = {};
    if (input.status !== undefined) updateData.status = input.status;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.finalGrade !== undefined)
      updateData.finalGrade = input.finalGrade;

    await this.enrollmentsRepository.update(id, updateData);
    return this.enrollmentsRepository.findOneOrFail({
      where: { id },
      relations: ['user', 'section', 'section.course'],
    });
  }

  async bulkEnroll(
    tenantId: string,
    input: BulkEnrollInput,
  ): Promise<Enrollment[]> {
    // Check for existing enrollments to avoid duplicates
    const existing = await this.enrollmentsRepository.find({
      where: {
        sectionId: input.sectionId,
        userId: In(input.userIds),
      },
    });
    const existingUserIds = new Set(existing.map((e) => e.userId));

    const newUserIds = input.userIds.filter((uid) => !existingUserIds.has(uid));
    if (newUserIds.length === 0) {
      return existing;
    }

    const enrollments = newUserIds.map((userId) =>
      this.enrollmentsRepository.create({
        tenantId,
        userId,
        sectionId: input.sectionId,
        role: input.role ?? EnrollmentRole.STUDENT,
        status: EnrollmentStatus.ACTIVE,
        enrolledAt: new Date(),
      }),
    );

    const saved = await this.enrollmentsRepository.save(enrollments);
    return [...existing, ...saved];
  }

  /**
   * Drop a batch of enrollments atomically.
   * Only affects enrollments belonging to this tenant (verified via section.course.tenantId).
   * Returns the count of enrollments actually dropped.
   */
  async bulkDropEnrollments(
    tenantId: string,
    input: BulkDropInput,
  ): Promise<number> {
    if (input.enrollmentIds.length === 0) return 0;

    const enrollments = await this.enrollmentsRepository.find({
      where: { id: In(input.enrollmentIds) },
      relations: ['section', 'section.course'],
    });

    const tenantOwned = enrollments.filter(
      (e) => e.section.course.tenantId === tenantId,
    );
    if (tenantOwned.length === 0) return 0;

    await this.enrollmentsRepository.update(
      { id: In(tenantOwned.map((e) => e.id)) },
      { status: EnrollmentStatus.DROPPED },
    );

    return tenantOwned.length;
  }

  /**
   * Move a batch of enrollments to a different section.
   * Drops the current enrollment and creates a new active one in the target section.
   * If the student is already enrolled in the target section the drop still happens
   * but no duplicate is created.
   * All writes are wrapped in a transaction.
   */
  async bulkMoveEnrollments(
    tenantId: string,
    input: BulkMoveInput,
  ): Promise<number> {
    if (input.enrollmentIds.length === 0) return 0;

    // Verify target section belongs to this tenant
    const targetSection = await this.sectionsRepository.findOne({
      where: { id: input.targetSectionId },
      relations: ['course'],
    });
    if (!targetSection || targetSection.course.tenantId !== tenantId) {
      throw new NotFoundException('Target section not found');
    }

    const enrollments = await this.enrollmentsRepository.find({
      where: { id: In(input.enrollmentIds) },
      relations: ['section', 'section.course'],
    });

    const tenantOwned = enrollments.filter(
      (e) => e.section.course.tenantId === tenantId,
    );
    if (tenantOwned.length === 0) return 0;

    await this.dataSource.manager.transaction(async (manager) => {
      for (const enrollment of tenantOwned) {
        // Drop the existing enrollment
        await manager.update(Enrollment, enrollment.id, {
          status: EnrollmentStatus.DROPPED,
        });

        // Skip if already enrolled in the target section
        const alreadyEnrolled = await manager.findOne(Enrollment, {
          where: {
            userId: enrollment.userId,
            sectionId: input.targetSectionId,
            status: EnrollmentStatus.ACTIVE,
          },
        });
        if (alreadyEnrolled) continue;

        await manager.save(
          manager.create(Enrollment, {
            tenantId,
            userId: enrollment.userId,
            sectionId: input.targetSectionId,
            role: enrollment.role,
            status: EnrollmentStatus.ACTIVE,
            enrolledAt: new Date(),
          }),
        );
      }
    });

    return tenantOwned.length;
  }

  // ─── Student Catalog ──────────────────────────────────────────────────────

  /**
   * ENROLL-001: Student-facing course catalog.
   *
   * Returns courses that have at least one active section in the requested
   * term (or the current term if none specified), enriched with:
   *  - Live seat counts (capacity − active/pending/waitlisted enrollments)
   *  - Instructor display names
   *  - Section schedule/location
   *
   * WHY two queries (sections + enrollment counts) instead of a GROUP BY?
   * TypeORM's QueryBuilder doesn't compose aggregate subqueries cleanly with
   * entity hydration. A separate count query is simpler to read, maintain,
   * and test. At catalog scale (~200 courses × 2 sections each = 400 rows)
   * the overhead is negligible.
   *
   * TRADEOFF: hasSeats filter is applied in-memory after fetching counts
   * because the count is not a column. For very large catalogs this could be
   * optimised with a raw SQL subquery, but it's acceptable here.
   */
  async studentCatalog(
    tenantId: string,
    filters: StudentCatalogFilter,
  ): Promise<StudentCatalogPage> {
    const {
      search,
      termId,
      department,
      category,
      courseLevel,
      hasSeats,
      limit = 20,
      offset = 0,
    } = filters;

    // 1. Load sections with course + instructor + term joined
    const qb = this.sectionsRepository
      .createQueryBuilder('section')
      .innerJoinAndSelect('section.course', 'course')
      .innerJoinAndSelect('section.instructor', 'instructor')
      .leftJoinAndSelect('section.term', 'term')
      .where('course.tenantId = :tenantId', { tenantId })
      .andWhere('section.status = :status', { status: SectionStatus.ACTIVE });

    if (termId) {
      qb.andWhere('section.termId = :termId', { termId });
    } else {
      qb.andWhere('term.isCurrent = true');
    }

    if (search) {
      qb.andWhere(
        "(course.code ILIKE :search OR course.title ILIKE :search OR CONCAT(instructor.firstName, ' ', instructor.lastName) ILIKE :search)",
        { search: `%${search}%` },
      );
    }
    if (department) {
      qb.andWhere('course.departmentId = :department', { department });
    }
    if (category) {
      qb.andWhere('course.category = :category', { category });
    }
    if (courseLevel) {
      qb.andWhere('course.courseLevel = :courseLevel', { courseLevel });
    }

    const sections = await qb.orderBy('course.code', 'ASC').getMany();

    if (sections.length === 0) {
      return { items: [], total: 0 };
    }

    // 2. Batch-load enrollment counts for all matching sections
    const sectionIds = sections.map((s) => s.id);
    const rawCounts = await this.enrollmentsRepository
      .createQueryBuilder('e')
      .select('e.sectionId', 'sectionId')
      .addSelect('COUNT(e.id)::int', 'count')
      .where('e.sectionId IN (:...sectionIds)', { sectionIds })
      .andWhere('e.status IN (:...statuses)', {
        statuses: [
          EnrollmentStatus.ACTIVE,
          EnrollmentStatus.PENDING,
          EnrollmentStatus.WAITLISTED,
        ],
      })
      .groupBy('e.sectionId')
      .getRawMany<{ sectionId: string; count: number }>();

    const countMap = new Map(
      rawCounts.map((r) => [r.sectionId, Number(r.count)]),
    );

    // 3. Group sections by course, applying hasSeats filter in-memory
    const courseMap = new Map<
      string,
      { course: (typeof sections)[0]['course']; sections: CatalogSection[] }
    >();

    for (const section of sections) {
      const enrolledCount = countMap.get(section.id) ?? 0;
      const seatsAvailable =
        section.capacity != null ? section.capacity - enrolledCount : null;

      if (hasSeats && (seatsAvailable === null || seatsAvailable <= 0)) {
        continue;
      }

      const catalogSection: CatalogSection = {
        id: section.id,
        schedule: section.schedule ?? null,
        location: section.location,
        capacity: section.capacity ?? null,
        enrolledCount,
        seatsAvailable,
        enrollmentMode: section.enrollmentMode,
        instructor: {
          id: section.instructor.id,
          firstName: section.instructor.firstName,
          lastName: section.instructor.lastName,
        },
        termId: section.termId,
        termName: section.term?.name ?? '',
      };

      if (!courseMap.has(section.courseId)) {
        courseMap.set(section.courseId, {
          course: section.course,
          sections: [],
        });
      }
      courseMap.get(section.courseId)!.sections.push(catalogSection);
    }

    // 4. Flatten to sorted array and paginate
    const allItems: CatalogCourse[] = [...courseMap.values()].map(
      ({ course, sections: courseSections }) => ({
        id: course.id,
        code: course.code,
        title: course.title,
        description: course.description,
        credits: course.credits,
        department: course.departmentId ?? null,
        category: course.category,
        courseLevel: course.courseLevel,
        prerequisiteCourseIds: course.prerequisiteCourseIds ?? [],
        sections: courseSections,
      }),
    );

    const total = allItems.length;
    const items = allItems.slice(offset, offset + limit);

    return { items, total };
  }

  async findAllEnrollmentsForTenant(
    tenantId: string,
    sectionId?: string,
  ): Promise<Enrollment[]> {
    const qb = this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.user', 'user')
      .innerJoinAndSelect('enrollment.section', 'section')
      .innerJoinAndSelect('section.course', 'course')
      .where('course.tenantId = :tenantId', { tenantId });

    if (sectionId) {
      qb.andWhere('enrollment.sectionId = :sectionId', { sectionId });
    }

    return qb.orderBy('enrollment.enrolledAt', 'DESC').getMany();
  }
}
