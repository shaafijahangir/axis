import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { CoursesService } from './courses.service';
import { EnrollmentPolicyService } from './enrollment-policy.service';
import { WaitlistService } from './waitlist.service';
import {
  Course,
  CourseSection,
  Enrollment,
  EnrollmentRole,
  EnrollmentStatus,
} from '../../database/entities';
import { NexusEvents } from '../ai/events/ai-events';
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../../test/mocks/repository.mock';
import {
  createCourse,
  createCourseSection,
  createEnrollment,
  resetIdCounter,
} from '../../test/factories';

describe('CoursesService', () => {
  let service: CoursesService;
  let courseRepo: MockRepository<Course>;
  let sectionRepo: MockRepository<CourseSection>;
  let enrollmentRepo: MockRepository<Enrollment>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const tenantId = 'tenant-001';
  const userId = 'user-001';
  const instructorId = 'instructor-001';

  beforeEach(async () => {
    resetIdCounter();

    courseRepo = createMockRepository<Course>();
    sectionRepo = createMockRepository<CourseSection>();
    enrollmentRepo = createMockRepository<Enrollment>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: getRepositoryToken(Course), useValue: courseRepo },
        { provide: getRepositoryToken(CourseSection), useValue: sectionRepo },
        { provide: getRepositoryToken(Enrollment), useValue: enrollmentRepo },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: { save: jest.fn(), findOne: jest.fn() },
            }),
          },
        },
        {
          provide: EnrollmentPolicyService,
          useValue: {
            checkAll: jest.fn().mockResolvedValue(undefined),
            check: jest.fn().mockResolvedValue(undefined),
            getPolicy: jest.fn().mockResolvedValue({ waitlistEnabled: false }),
          },
        },
        {
          provide: WaitlistService,
          useValue: {
            placeOnWaitlist: jest.fn(),
            promoteFromWaitlist: jest.fn(),
            getWaitlistCount: jest.fn().mockResolvedValue(0),
          },
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('findAllForTenant', () => {
    it('should return all courses for a tenant', async () => {
      const course1 = createCourse({ tenantId, code: 'CS101' });
      const course2 = createCourse({ tenantId, code: 'CS102' });

      courseRepo.find!.mockResolvedValue([course1, course2]);

      const result = await service.findAllForTenant(tenantId);

      expect(result).toHaveLength(2);
      expect(courseRepo.find).toHaveBeenCalledWith({
        where: { tenantId },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no courses exist', async () => {
      courseRepo.find!.mockResolvedValue([]);

      const result = await service.findAllForTenant(tenantId);

      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return course when found', async () => {
      const course = createCourse({ id: 'course-1', tenantId });
      courseRepo.findOne!.mockResolvedValue(course);

      const result = await service.findById('course-1', tenantId);

      expect(result).toEqual(course);
      expect(courseRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'course-1', tenantId },
      });
    });

    it('should throw NotFoundException when course not found', async () => {
      courseRepo.findOne!.mockResolvedValue(null);

      await expect(service.findById('nonexistent', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      courseRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.findById('course-1', 'wrong-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create course and emit event', async () => {
      const input = {
        code: 'CS101',
        title: 'Intro to CS',
        description: 'Learn programming',
      };

      const savedCourse = createCourse({
        id: 'new-course',
        tenantId,
        code: 'CS101',
        name: 'Intro to CS',
      });
      (savedCourse as unknown as Record<string, unknown>).title = 'Intro to CS';

      courseRepo.create!.mockReturnValue(savedCourse);
      courseRepo.save!.mockResolvedValue(savedCourse);

      const result = await service.create(tenantId, input);

      expect(result).toEqual(savedCourse);
      expect(courseRepo.create).toHaveBeenCalledWith({
        ...input,
        tenantId,
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        NexusEvents.COURSE_CREATED,
        expect.objectContaining({
          courseId: savedCourse.id,
          tenantId,
        }),
      );
    });
  });

  describe('findSectionsForCourse', () => {
    it('should return sections with tenant scoping', async () => {
      const course = createCourse({ id: 'course-1', tenantId });
      const section = createCourseSection({ courseId: 'course-1', course });

      const queryBuilder = createMockQueryBuilder<CourseSection>();
      sectionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([section]);

      const result = await service.findSectionsForCourse('course-1', tenantId);

      expect(result).toHaveLength(1);
      expect(queryBuilder.innerJoinAndSelect).toHaveBeenCalledWith(
        'section.course',
        'course',
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'course.tenantId = :tenantId',
        { tenantId },
      );
    });
  });

  describe('findSectionsForInstructor', () => {
    it('should return sections for instructor with tenant scoping', async () => {
      const section = createCourseSection({ instructorId });

      const queryBuilder = createMockQueryBuilder<CourseSection>();
      sectionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([section]);

      const result = await service.findSectionsForInstructor(
        instructorId,
        tenantId,
      );

      expect(result).toHaveLength(1);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'section.instructorId = :instructorId',
        { instructorId },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'course.tenantId = :tenantId',
        { tenantId },
      );
    });
  });

  describe('findSectionById', () => {
    it('should return section when found', async () => {
      const section = createCourseSection({ id: 'section-1' });

      const queryBuilder = createMockQueryBuilder<CourseSection>();
      sectionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getOne!.mockResolvedValue(section);

      const result = await service.findSectionById('section-1', tenantId);

      expect(result).toEqual(section);
    });

    it('should throw NotFoundException when section not found', async () => {
      const queryBuilder = createMockQueryBuilder<CourseSection>();
      sectionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getOne!.mockResolvedValue(null);

      await expect(
        service.findSectionById('nonexistent', tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSection', () => {
    it('should create section and emit event', async () => {
      const course = createCourse({ id: 'course-1', tenantId });
      const input = {
        courseId: 'course-1',
        termId: 'term-1',
        location: 'Room 101',
      };

      const savedSection = createCourseSection({
        id: 'new-section',
        courseId: 'course-1',
        instructorId,
      });

      sectionRepo.create!.mockReturnValue(savedSection);
      sectionRepo.save!.mockResolvedValue(savedSection);
      courseRepo.findOne!.mockResolvedValue(course);

      const result = await service.createSection(instructorId, input);

      expect(result).toEqual(savedSection);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        NexusEvents.SECTION_CREATED,
        expect.objectContaining({
          sectionId: savedSection.id,
          courseId: 'course-1',
          tenantId,
          instructorId,
        }),
      );
    });

    it('passes the legacy schedule JSON string through unchanged', async () => {
      // SPRINT-1: the schedule JSONB column is now read-only legacy; the
      // service no longer parses it. The TypeORM column transformer handles
      // conversion on the way to/from the DB.
      const schedule = JSON.stringify({ days: ['Mon', 'Wed'], time: '10:00' });
      const input = {
        courseId: 'course-1',
        termId: 'term-1',
        schedule,
      };

      const savedSection = createCourseSection({ courseId: 'course-1' });
      sectionRepo.create!.mockReturnValue(savedSection);
      sectionRepo.save!.mockResolvedValue(savedSection);
      courseRepo.findOne!.mockResolvedValue(null);

      await service.createSection(instructorId, input);

      expect(sectionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ schedule }),
      );
    });
  });

  describe('findEnrollmentsForUser', () => {
    it('should return enrollments with tenant scoping', async () => {
      const enrollment = createEnrollment({ userId });

      const queryBuilder = createMockQueryBuilder<Enrollment>();
      enrollmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([enrollment]);

      const result = await service.findEnrollmentsForUser(userId, tenantId);

      expect(result).toHaveLength(1);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'course.tenantId = :tenantId',
        { tenantId },
      );
    });
  });

  describe('enrollStudent', () => {
    it('should create enrollment and emit event', async () => {
      const section = createCourseSection({
        id: 'section-1',
      }) as unknown as Record<string, unknown>;
      section.autoApprove = true;
      section.course = { tenantId };
      const savedEnrollment = createEnrollment({
        id: 'enrollment-1',
        userId,
        sectionId: 'section-1',
        tenantId,
      });

      sectionRepo.findOne!.mockResolvedValue(section);
      enrollmentRepo.findOne!.mockResolvedValue(null); // no duplicate
      enrollmentRepo.count!.mockResolvedValue(0); // no seats occupied
      enrollmentRepo.create!.mockReturnValue(savedEnrollment);
      enrollmentRepo.save!.mockResolvedValue(savedEnrollment);

      const result = await service.enrollStudent(tenantId, userId, 'section-1');

      expect(result).toEqual(savedEnrollment);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        NexusEvents.ENROLLMENT_CREATED,
        expect.objectContaining({
          enrollmentId: savedEnrollment.id,
          userId,
          sectionId: 'section-1',
          tenantId,
        }),
      );
    });
  });

  describe('findEnrollmentsForSection', () => {
    it('should return enrollments with tenant scoping', async () => {
      const enrollment = createEnrollment({ sectionId: 'section-1' });

      const queryBuilder = createMockQueryBuilder<Enrollment>();
      enrollmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([enrollment]);

      const result = await service.findEnrollmentsForSection(
        'section-1',
        tenantId,
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('countCourses', () => {
    it('should return course count for tenant', async () => {
      courseRepo.count!.mockResolvedValue(5);

      const result = await service.countCourses(tenantId);

      expect(result).toBe(5);
      expect(courseRepo.count).toHaveBeenCalledWith({ where: { tenantId } });
    });
  });

  describe('countSections', () => {
    it('should return section count with tenant scoping', async () => {
      const queryBuilder = createMockQueryBuilder<CourseSection>();
      sectionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getCount!.mockResolvedValue(10);

      const result = await service.countSections(tenantId);

      expect(result).toBe(10);
    });
  });

  describe('countEnrollments', () => {
    it('should return enrollment count with tenant scoping', async () => {
      const queryBuilder = createMockQueryBuilder<Enrollment>();
      enrollmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getCount!.mockResolvedValue(50);

      const result = await service.countEnrollments(tenantId);

      expect(result).toBe(50);
    });
  });

  describe('updateCourse', () => {
    it('should update course fields', async () => {
      const existingCourse = createCourse({
        id: 'course-1',
        tenantId,
        code: 'CS101',
      });

      courseRepo.findOne!.mockResolvedValue(existingCourse);
      courseRepo.update!.mockResolvedValue({} as any);
      courseRepo.findOneOrFail!.mockResolvedValue({
        ...existingCourse,
        code: 'CS102',
        title: 'New Title',
      });

      const result = await service.updateCourse('course-1', tenantId, {
        code: 'CS102',
        title: 'New Title',
      });

      expect(result.code).toBe('CS102');
      expect(result.title).toBe('New Title');
      expect(courseRepo.update).toHaveBeenCalledWith('course-1', {
        code: 'CS102',
        title: 'New Title',
      });
    });

    it('should throw NotFoundException when course not found', async () => {
      courseRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateCourse('nonexistent', tenantId, { title: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeCourse', () => {
    it('should delete course when no sections exist', async () => {
      const course = createCourse({ id: 'course-1', tenantId });
      courseRepo.findOne!.mockResolvedValue(course);
      sectionRepo.count!.mockResolvedValue(0);
      courseRepo.remove!.mockResolvedValue(course);

      const result = await service.removeCourse('course-1', tenantId);

      expect(result).toBe(true);
      expect(courseRepo.remove).toHaveBeenCalledWith(course);
    });

    it('should throw ForbiddenException when sections exist', async () => {
      const course = createCourse({ id: 'course-1', tenantId });
      courseRepo.findOne!.mockResolvedValue(course);
      sectionRepo.count!.mockResolvedValue(3);

      await expect(service.removeCourse('course-1', tenantId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when course not found', async () => {
      courseRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.removeCourse('nonexistent', tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSection', () => {
    it('should update section fields', async () => {
      const course = createCourse({ id: 'course-1', tenantId });
      const section = createCourseSection({
        id: 'section-1',
        courseId: 'course-1',
        course,
      });

      sectionRepo.findOne!.mockResolvedValue(section);
      sectionRepo.update!.mockResolvedValue({} as any);
      sectionRepo.findOneOrFail!.mockResolvedValue({
        ...section,
        location: 'Room 202',
        capacity: 35,
      });

      const result = await service.updateSection('section-1', tenantId, {
        location: 'Room 202',
        capacity: 35,
      });

      expect(result.location).toBe('Room 202');
      expect(result.capacity).toBe(35);
    });

    it('should throw NotFoundException when section not found', async () => {
      sectionRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateSection('nonexistent', tenantId, { location: 'Room' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when section belongs to wrong tenant', async () => {
      const wrongTenantCourse = createCourse({ tenantId: 'other-tenant' });
      const section = createCourseSection({
        id: 'section-1',
        course: wrongTenantCourse,
      });

      sectionRepo.findOne!.mockResolvedValue(section);

      await expect(
        service.updateSection('section-1', tenantId, { location: 'Room' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeSection', () => {
    it('should delete section when no enrollments exist', async () => {
      const course = createCourse({ id: 'course-1', tenantId });
      const section = createCourseSection({
        id: 'section-1',
        courseId: 'course-1',
        course,
      });

      sectionRepo.findOne!.mockResolvedValue(section);
      enrollmentRepo.count!.mockResolvedValue(0);
      sectionRepo.remove!.mockResolvedValue(section);

      const result = await service.removeSection('section-1', tenantId);

      expect(result).toBe(true);
      expect(sectionRepo.remove).toHaveBeenCalledWith(section);
    });

    it('should throw ForbiddenException when enrollments exist', async () => {
      const course = createCourse({ id: 'course-1', tenantId });
      const section = createCourseSection({
        id: 'section-1',
        course,
      });

      sectionRepo.findOne!.mockResolvedValue(section);
      enrollmentRepo.count!.mockResolvedValue(15);

      await expect(
        service.removeSection('section-1', tenantId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when section not found', async () => {
      sectionRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.removeSection('nonexistent', tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adminEnroll', () => {
    it('should create enrollment', async () => {
      enrollmentRepo.findOne!.mockResolvedValue(null); // No existing enrollment

      const savedEnrollment = createEnrollment({
        id: 'enrollment-1',
        userId,
        sectionId: 'section-1',
        tenantId,
      });
      enrollmentRepo.create!.mockReturnValue(savedEnrollment);
      enrollmentRepo.save!.mockResolvedValue(savedEnrollment);

      const result = await service.adminEnroll(tenantId, {
        userId,
        sectionId: 'section-1',
      });

      expect(result).toEqual(savedEnrollment);
    });

    it('should throw ConflictException when already enrolled', async () => {
      const existingEnrollment = createEnrollment({
        userId,
        sectionId: 'section-1',
      });
      enrollmentRepo.findOne!.mockResolvedValue(existingEnrollment);

      await expect(
        service.adminEnroll(tenantId, { userId, sectionId: 'section-1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should set default role to STUDENT', async () => {
      enrollmentRepo.findOne!.mockResolvedValue(null);

      const savedEnrollment = createEnrollment({
        userId,
        sectionId: 'section-1',
      });
      enrollmentRepo.create!.mockReturnValue(savedEnrollment);
      enrollmentRepo.save!.mockResolvedValue(savedEnrollment);

      await service.adminEnroll(tenantId, {
        userId,
        sectionId: 'section-1',
      });

      expect(enrollmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: EnrollmentRole.STUDENT,
        }),
      );
    });

    it('should allow custom role', async () => {
      enrollmentRepo.findOne!.mockResolvedValue(null);

      const savedEnrollment = createEnrollment({
        userId,
        sectionId: 'section-1',
      });
      enrollmentRepo.create!.mockReturnValue(savedEnrollment);
      enrollmentRepo.save!.mockResolvedValue(savedEnrollment);

      await service.adminEnroll(tenantId, {
        userId,
        sectionId: 'section-1',
        role: EnrollmentRole.TA,
      });

      expect(enrollmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: EnrollmentRole.TA,
        }),
      );
    });
  });

  describe('adminUpdateEnrollment', () => {
    it('should update enrollment fields', async () => {
      const course = createCourse({ id: 'course-1', tenantId });
      const section = createCourseSection({
        id: 'section-1',
        course,
      });
      const enrollment = createEnrollment({
        id: 'enrollment-1',
        sectionId: 'section-1',
        section,
      });
      (enrollment.section as unknown as Record<string, unknown>).course =
        course;

      enrollmentRepo.findOne!.mockResolvedValue(enrollment);
      enrollmentRepo.update!.mockResolvedValue({} as any);
      enrollmentRepo.findOneOrFail!.mockResolvedValue({
        ...enrollment,
        status: EnrollmentStatus.DROPPED,
        finalGrade: 'B+',
      });

      const result = await service.adminUpdateEnrollment(
        'enrollment-1',
        tenantId,
        {
          status: EnrollmentStatus.DROPPED,
          finalGrade: 'B+',
        },
      );

      expect(result.status).toBe(EnrollmentStatus.DROPPED);
      expect(result.finalGrade).toBe('B+');
    });

    it('should throw NotFoundException when enrollment not found', async () => {
      enrollmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.adminUpdateEnrollment('nonexistent', tenantId, {
          status: EnrollmentStatus.DROPPED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when enrollment belongs to wrong tenant', async () => {
      const wrongTenantCourse = createCourse({ tenantId: 'other-tenant' });
      const section = createCourseSection({ course: wrongTenantCourse });
      const enrollment = createEnrollment({ section });
      (enrollment.section as unknown as Record<string, unknown>).course =
        wrongTenantCourse;

      enrollmentRepo.findOne!.mockResolvedValue(enrollment);

      await expect(
        service.adminUpdateEnrollment('enrollment-1', tenantId, {
          status: EnrollmentStatus.DROPPED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkEnroll', () => {
    it('should create enrollments for new users only', async () => {
      const existingEnrollment = createEnrollment({
        userId: 'user-1',
        sectionId: 'section-1',
      });

      enrollmentRepo.find!.mockResolvedValue([existingEnrollment]);

      const newEnrollment = createEnrollment({
        userId: 'user-2',
        sectionId: 'section-1',
      });
      enrollmentRepo.create!.mockReturnValue(newEnrollment);
      enrollmentRepo.save!.mockResolvedValue([newEnrollment]);

      const result = await service.bulkEnroll(tenantId, {
        sectionId: 'section-1',
        userIds: ['user-1', 'user-2'], // user-1 already enrolled
      });

      expect(result).toHaveLength(2); // Includes both existing and new
      expect(enrollmentRepo.create).toHaveBeenCalledTimes(1); // Only creates for user-2
    });

    it('should return existing enrollments when all users already enrolled', async () => {
      const existing1 = createEnrollment({
        userId: 'user-1',
        sectionId: 'section-1',
      });
      const existing2 = createEnrollment({
        userId: 'user-2',
        sectionId: 'section-1',
      });

      enrollmentRepo.find!.mockResolvedValue([existing1, existing2]);

      const result = await service.bulkEnroll(tenantId, {
        sectionId: 'section-1',
        userIds: ['user-1', 'user-2'],
      });

      expect(result).toHaveLength(2);
      expect(enrollmentRepo.save).not.toHaveBeenCalled();
    });

    it('should set default role to STUDENT for bulk enrollments', async () => {
      enrollmentRepo.find!.mockResolvedValue([]);

      const saved = [
        createEnrollment({ userId: 'user-1', sectionId: 'section-1' }),
      ];
      enrollmentRepo.create!.mockImplementation((data: unknown) => data);
      enrollmentRepo.save!.mockResolvedValue(saved);

      await service.bulkEnroll(tenantId, {
        sectionId: 'section-1',
        userIds: ['user-1'],
      });

      expect(enrollmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: EnrollmentRole.STUDENT,
          status: EnrollmentStatus.ACTIVE,
        }),
      );
    });
  });

  describe('findAllEnrollmentsForTenant', () => {
    it('should return all enrollments for tenant', async () => {
      const enrollment = createEnrollment({ tenantId });

      const queryBuilder = createMockQueryBuilder<Enrollment>();
      enrollmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([enrollment]);

      const result = await service.findAllEnrollmentsForTenant(tenantId);

      expect(result).toHaveLength(1);
    });

    it('should filter by sectionId when provided', async () => {
      const enrollment = createEnrollment({
        tenantId,
        sectionId: 'section-1',
      });

      const queryBuilder = createMockQueryBuilder<Enrollment>();
      enrollmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([enrollment]);

      await service.findAllEnrollmentsForTenant(tenantId, 'section-1');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'enrollment.sectionId = :sectionId',
        { sectionId: 'section-1' },
      );
    });
  });

  // ============================================================================
  // SPRINT-1: schedule validation + structured fields
  // ============================================================================

  describe('createSection — schedule validation', () => {
    const buildInput = (overrides: Record<string, unknown> = {}) => ({
      courseId: 'course-1',
      termId: 'term-1',
      ...overrides,
    });

    it('persists meetingDays + startTime + endTime + room when all set', async () => {
      const section = createCourseSection({
        courseId: 'course-1',
        instructorId,
      });
      sectionRepo.create!.mockReturnValue(section);
      sectionRepo.save!.mockResolvedValue(section);
      courseRepo.findOne!.mockResolvedValue(createCourse({ tenantId }));

      await service.createSection(
        instructorId,
        buildInput({
          meetingDays: ['MON', 'WED', 'FRI'],
          startTime: '09:00',
          endTime: '10:30',
          room: 'Room 204',
        }),
      );

      expect(sectionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          meetingDays: ['MON', 'WED', 'FRI'],
          startTime: '09:00',
          endTime: '10:30',
          room: 'Room 204',
        }),
      );
    });

    it('accepts a section with no schedule fields at all', async () => {
      const section = createCourseSection({
        courseId: 'course-1',
        instructorId,
      });
      sectionRepo.create!.mockReturnValue(section);
      sectionRepo.save!.mockResolvedValue(section);
      courseRepo.findOne!.mockResolvedValue(createCourse({ tenantId }));

      await expect(
        service.createSection(instructorId, buildInput()),
      ).resolves.toBeDefined();
    });

    it('rejects partial schedule (meetingDays without times)', async () => {
      await expect(
        service.createSection(
          instructorId,
          buildInput({ meetingDays: ['MON'] }),
        ),
      ).rejects.toThrow(/all be set together/i);
      expect(sectionRepo.create).not.toHaveBeenCalled();
    });

    it('rejects partial schedule (times without meetingDays)', async () => {
      await expect(
        service.createSection(
          instructorId,
          buildInput({ startTime: '09:00', endTime: '10:00' }),
        ),
      ).rejects.toThrow(/all be set together/i);
    });

    it('rejects endTime <= startTime', async () => {
      await expect(
        service.createSection(
          instructorId,
          buildInput({
            meetingDays: ['MON'],
            startTime: '10:00',
            endTime: '09:00',
          }),
        ),
      ).rejects.toThrow(/endTime must be after startTime/i);
    });

    it('rejects endTime === startTime', async () => {
      await expect(
        service.createSection(
          instructorId,
          buildInput({
            meetingDays: ['MON'],
            startTime: '09:00',
            endTime: '09:00',
          }),
        ),
      ).rejects.toThrow(/endTime must be after startTime/i);
    });
  });

  describe('updateSection — schedule validation (merged state)', () => {
    const sectionId = 'section-1';

    it('rejects an update that would yield endTime <= existing startTime', async () => {
      const existing = createCourseSection({
        id: sectionId,
        courseId: 'course-1',
        meetingDays: ['MON'],
        startTime: '09:00',
        endTime: '10:00',
      });
      const course = createCourse({ id: 'course-1', tenantId });
      sectionRepo.findOne!.mockResolvedValue({ ...existing, course });

      await expect(
        service.updateSection(sectionId, tenantId, { endTime: '08:00' }),
      ).rejects.toThrow(/endTime must be after startTime/i);
      expect(sectionRepo.update).not.toHaveBeenCalled();
    });

    it('accepts a patch that flips both times together', async () => {
      const existing = createCourseSection({
        id: sectionId,
        courseId: 'course-1',
        meetingDays: ['MON'],
        startTime: '09:00',
        endTime: '10:00',
      });
      const course = createCourse({ id: 'course-1', tenantId });
      sectionRepo.findOne!.mockResolvedValue({ ...existing, course });
      sectionRepo.update!.mockResolvedValue({ affected: 1 });
      sectionRepo.findOneOrFail!.mockResolvedValue(existing);

      await expect(
        service.updateSection(sectionId, tenantId, {
          startTime: '13:00',
          endTime: '14:30',
        }),
      ).resolves.toBeDefined();
    });
  });
});
