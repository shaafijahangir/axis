import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
} from './dto/course.types';
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
