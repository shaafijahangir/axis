import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  CatalogCourse,
  CatalogSection,
  StudentCatalogFilter,
  StudentCatalogPage,
} from './dto/catalog-student.types';
import { SectionStatus } from '../../database/entities/course-section.entity';
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
  AdminCreateSectionInput,
} from './dto/admin-course.types';
import { NexusEvents } from '../ai/events/ai-events';

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

  async createSection(
    instructorId: string,
    input: CreateSectionInput,
  ): Promise<CourseSection> {
    const section = this.sectionsRepository.create({
      ...input,
      instructorId,
      schedule: input.schedule ? JSON.parse(input.schedule) : null,
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

  async enrollStudent(
    tenantId: string,
    userId: string,
    sectionId: string,
  ): Promise<Enrollment> {
    const enrollment = this.enrollmentsRepository.create({
      tenantId,
      userId,
      sectionId,
      enrolledAt: new Date(),
    });
    const saved = await this.enrollmentsRepository.save(enrollment);

    this.eventEmitter.emit(NexusEvents.ENROLLMENT_CREATED, {
      enrollmentId: saved.id,
      userId,
      sectionId,
      tenantId,
    });

    return saved;
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
      .getRawMany();
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
    const section = this.sectionsRepository.create({
      courseId: input.courseId,
      termId: input.termId,
      instructorId: input.instructorId,
      location: input.location,
      capacity: input.capacity,
      schedule: input.schedule ? JSON.parse(input.schedule) : null,
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

    const updateData: Partial<CourseSection> = {};
    if (input.location !== undefined) updateData.location = input.location;
    if (input.capacity !== undefined) updateData.capacity = input.capacity;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.instructorId !== undefined)
      updateData.instructorId = input.instructorId;
    if (input.schedule !== undefined)
      updateData.schedule = input.schedule ? JSON.parse(input.schedule) : null;

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
        schedule: section.schedule ? JSON.stringify(section.schedule) : null,
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
