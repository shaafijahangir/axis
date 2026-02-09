import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AssignmentsService } from './assignments.service';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { NexusEvents } from '../ai/events/ai-events';
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../../test/mocks/repository.mock';
import {
  createAssignment,
  createSubmission,
  createUser,
  createEnrollment,
  resetIdCounter,
  AssignmentType,
  AssignmentStatus,
  SubmissionStatus,
  EnrollmentStatus,
} from '../../test/factories';

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let assignmentRepo: MockRepository<Assignment>;
  let submissionRepo: MockRepository<Submission>;
  let sectionRepo: MockRepository<CourseSection>;
  let enrollmentRepo: MockRepository<Enrollment>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const tenantId = 'tenant-001';
  const sectionId = 'section-001';
  const userId = 'user-001';

  beforeEach(async () => {
    resetIdCounter();

    assignmentRepo = createMockRepository<Assignment>();
    submissionRepo = createMockRepository<Submission>();
    sectionRepo = createMockRepository<CourseSection>();
    enrollmentRepo = createMockRepository<Enrollment>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: getRepositoryToken(Assignment), useValue: assignmentRepo },
        { provide: getRepositoryToken(Submission), useValue: submissionRepo },
        { provide: getRepositoryToken(CourseSection), useValue: sectionRepo },
        { provide: getRepositoryToken(Enrollment), useValue: enrollmentRepo },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('findBySectionId', () => {
    it('should return assignments for a section with tenant scoping', async () => {
      const assignment1 = createAssignment({ sectionId, title: 'HW1' });
      const assignment2 = createAssignment({ sectionId, title: 'HW2' });

      const queryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([assignment1, assignment2]);

      const result = await service.findBySectionId(sectionId, tenantId);

      expect(result).toHaveLength(2);
      expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
        'assignment.section',
        'section',
      );
      expect(queryBuilder.innerJoin).toHaveBeenCalledWith(
        'section.course',
        'course',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'assignment.sectionId = :sectionId',
        { sectionId },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'course.tenantId = :tenantId',
        { tenantId },
      );
    });

    it('should return empty array when no assignments exist', async () => {
      const queryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([]);

      const result = await service.findBySectionId(sectionId, tenantId);

      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('should return assignment when found with tenant scoping', async () => {
      const assignment = createAssignment({ id: 'assign-1', sectionId });

      const queryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getOne!.mockResolvedValue(assignment);

      const result = await service.findById('assign-1', tenantId);

      expect(result).toEqual(assignment);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'course.tenantId = :tenantId',
        { tenantId },
      );
    });

    it('should throw NotFoundException when assignment not found', async () => {
      const queryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getOne!.mockResolvedValue(null);

      await expect(service.findById('nonexistent', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when assignment exists but wrong tenant', async () => {
      const queryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getOne!.mockResolvedValue(null); // Tenant filter excludes it

      await expect(
        service.findById('assign-1', 'wrong-tenant'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create assignment and emit event', async () => {
      const input = {
        sectionId,
        title: 'New Assignment',
        description: 'Description',
        type: AssignmentType.ASSIGNMENT,
        pointsPossible: 100,
      };

      const savedAssignment = createAssignment({
        id: 'new-id',
        sectionId,
        title: 'New Assignment',
      });

      assignmentRepo.create!.mockReturnValue(savedAssignment);
      assignmentRepo.save!.mockResolvedValue(savedAssignment);

      const result = await service.create(tenantId, input);

      expect(result).toEqual(savedAssignment);
      expect(assignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionId,
          title: 'New Assignment',
          tenantId,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        NexusEvents.ASSIGNMENT_CREATED,
        expect.objectContaining({
          assignmentId: savedAssignment.id,
          sectionId,
          tenantId,
          title: savedAssignment.title,
        }),
      );
    });

    it('should parse date strings to Date objects', async () => {
      const dueDate = '2026-03-01T23:59:59Z';
      const input = {
        sectionId,
        title: 'Timed Assignment',
        pointsPossible: 100,
        dueAt: dueDate,
        unlockAt: '2026-02-01T00:00:00Z',
        lockAt: '2026-03-02T00:00:00Z',
      };

      const savedAssignment = createAssignment({ sectionId });
      assignmentRepo.create!.mockReturnValue(savedAssignment);
      assignmentRepo.save!.mockResolvedValue(savedAssignment);

      await service.create(tenantId, input);

      expect(assignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dueAt: new Date(dueDate),
          unlockAt: new Date('2026-02-01T00:00:00Z'),
          lockAt: new Date('2026-03-02T00:00:00Z'),
        }),
      );
    });

    it('should parse JSON rubric and settings', async () => {
      const rubric = JSON.stringify({ criteria: ['test'] });
      const settings = JSON.stringify({ attempts: 3 });
      const input = {
        sectionId,
        title: 'With Rubric',
        pointsPossible: 100,
        rubric,
        settings,
      };

      const savedAssignment = createAssignment({ sectionId });
      assignmentRepo.create!.mockReturnValue(savedAssignment);
      assignmentRepo.save!.mockResolvedValue(savedAssignment);

      await service.create(tenantId, input);

      expect(assignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          rubric: { criteria: ['test'] },
          settings: { attempts: 3 },
        }),
      );
    });
  });

  describe('updateAssignment', () => {
    it('should update assignment fields', async () => {
      const existingAssignment = createAssignment({
        id: 'assign-1',
        sectionId,
        title: 'Old Title',
      });

      assignmentRepo.findOne!.mockResolvedValue(existingAssignment);
      assignmentRepo.save!.mockImplementation((a) => Promise.resolve(a as any));

      const result = await service.updateAssignment({
        id: 'assign-1',
        sectionId,
        title: 'New Title',
        description: 'New Description',
        pointsPossible: 150,
      });

      expect(result.title).toBe('New Title');
      expect(result.description).toBe('New Description');
      expect(result.pointsPossible).toBe(150);
    });

    it('should throw NotFoundException if assignment not found', async () => {
      assignmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.updateAssignment({
          id: 'nonexistent',
          sectionId,
          title: 'New Title',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if assignment not in specified section', async () => {
      assignmentRepo.findOne!.mockResolvedValue(null); // No match for id+sectionId

      await expect(
        service.updateAssignment({
          id: 'assign-1',
          sectionId: 'wrong-section',
          title: 'New Title',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should convert date strings to Date objects', async () => {
      const existingAssignment = createAssignment({
        id: 'assign-1',
        sectionId,
      });

      assignmentRepo.findOne!.mockResolvedValue(existingAssignment);
      assignmentRepo.save!.mockImplementation((a) => Promise.resolve(a as any));

      const newDue = '2026-04-01T23:59:59Z';
      await service.updateAssignment({
        id: 'assign-1',
        sectionId,
        dueAt: newDue,
      });

      expect(existingAssignment.dueAt).toEqual(new Date(newDue));
    });
  });

  describe('extendDeadlines', () => {
    it('should extend deadlines for multiple assignments', async () => {
      const a1 = createAssignment({ id: 'a1', sectionId });
      const a2 = createAssignment({ id: 'a2', sectionId });

      assignmentRepo.find!.mockResolvedValue([a1, a2]);
      assignmentRepo.save!.mockImplementation((arr) =>
        Promise.resolve(arr as any),
      );

      const newDueAt = '2026-05-01T23:59:59Z';
      const result = await service.extendDeadlines({
        sectionId,
        assignmentIds: ['a1', 'a2'],
        newDueAt,
      });

      expect(result).toHaveLength(2);
      expect(result[0].dueAt).toEqual(new Date(newDueAt));
      expect(result[1].dueAt).toEqual(new Date(newDueAt));
    });

    it('should throw NotFoundException if any assignment not in section', async () => {
      // Only return one assignment when two were requested
      const a1 = createAssignment({ id: 'a1', sectionId });
      assignmentRepo.find!.mockResolvedValue([a1]);

      await expect(
        service.extendDeadlines({
          sectionId,
          assignmentIds: ['a1', 'a2'],
          newDueAt: '2026-05-01T23:59:59Z',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findSubmissionsByAssignment', () => {
    it('should return submissions with tenant scoping', async () => {
      const sub1 = createSubmission({ assignmentId: 'assign-1' });
      const sub2 = createSubmission({ assignmentId: 'assign-1' });

      const queryBuilder = createMockQueryBuilder<Submission>();
      submissionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([sub1, sub2]);

      const result = await service.findSubmissionsByAssignment(
        'assign-1',
        tenantId,
      );

      expect(result).toHaveLength(2);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'course.tenantId = :tenantId',
        { tenantId },
      );
    });
  });

  describe('findSubmissionsByUser', () => {
    it('should return user submissions with tenant scoping', async () => {
      const sub = createSubmission({ assignmentId: 'assign-1', userId });

      const queryBuilder = createMockQueryBuilder<Submission>();
      submissionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([sub]);

      const result = await service.findSubmissionsByUser(
        'assign-1',
        userId,
        tenantId,
      );

      expect(result).toHaveLength(1);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'submission.userId = :userId',
        { userId },
      );
    });
  });

  describe('findSubmissionById', () => {
    it('should return submission when found', async () => {
      const submission = createSubmission({ id: 'sub-1' });

      const queryBuilder = createMockQueryBuilder<Submission>();
      submissionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getOne!.mockResolvedValue(submission);

      const result = await service.findSubmissionById('sub-1', tenantId);

      expect(result).toEqual(submission);
    });

    it('should throw NotFoundException when submission not found', async () => {
      const queryBuilder = createMockQueryBuilder<Submission>();
      submissionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getOne!.mockResolvedValue(null);

      await expect(
        service.findSubmissionById('nonexistent', tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createSubmission', () => {
    it('should create submission with correct attempt number', async () => {
      const assignment = createAssignment({ id: 'assign-1', sectionId });

      // Mock findById (called internally)
      const assignmentQueryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(
        assignmentQueryBuilder as any,
      );
      assignmentQueryBuilder.getOne!.mockResolvedValue(assignment);

      // Mock existing submission count
      submissionRepo.count!.mockResolvedValue(2); // Two existing submissions

      const savedSubmission = createSubmission({
        id: 'new-sub',
        assignmentId: 'assign-1',
        userId,
      });
      submissionRepo.create!.mockReturnValue(savedSubmission);
      submissionRepo.save!.mockResolvedValue(savedSubmission);

      const result = await service.createSubmission(userId, tenantId, {
        assignmentId: 'assign-1',
        content: JSON.stringify({ answer: 'test' }),
      });

      expect(result).toEqual(savedSubmission);
      expect(submissionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          assignmentId: 'assign-1',
          userId,
          attempt: 3, // Third attempt
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        NexusEvents.SUBMISSION_CREATED,
        expect.objectContaining({
          submissionId: savedSubmission.id,
          assignmentId: 'assign-1',
          userId,
          tenantId,
        }),
      );
    });

    it('should throw NotFoundException if assignment not found for tenant', async () => {
      const queryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getOne!.mockResolvedValue(null);

      await expect(
        service.createSubmission(userId, tenantId, {
          assignmentId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('gradeSubmission', () => {
    it('should grade submission and emit events', async () => {
      const submission = createSubmission({
        id: 'sub-1',
        score: 80,
        gradedAt: new Date('2026-01-15'),
      });

      const queryBuilder = createMockQueryBuilder<Submission>();
      submissionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getOne!.mockResolvedValue(submission);
      submissionRepo.save!.mockImplementation((s) => Promise.resolve(s as any));

      const graderId = 'instructor-1';
      const result = await service.gradeSubmission(graderId, tenantId, {
        submissionId: 'sub-1',
        score: 95,
        feedback: 'Great work!',
      });

      expect(result.score).toBe(95);
      expect(result.gradedBy).toBe(graderId);
      expect(result.feedback).toBe('Great work!');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        NexusEvents.SUBMISSION_GRADED,
        expect.objectContaining({
          submissionId: 'sub-1',
          gradedBy: graderId,
          score: 95,
          tenantId,
        }),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        NexusEvents.GRADE_UPDATED,
        expect.objectContaining({
          submissionId: 'sub-1',
          oldScore: 80,
          newScore: 95,
          tenantId,
        }),
      );
    });

    it('should handle grading ungraded submission (oldScore is undefined)', async () => {
      const submission = createSubmission({
        id: 'sub-1',
        score: undefined,
        gradedAt: undefined,
      });

      const queryBuilder = createMockQueryBuilder<Submission>();
      submissionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getOne!.mockResolvedValue(submission);
      submissionRepo.save!.mockImplementation((s) => Promise.resolve(s as any));

      await service.gradeSubmission('instructor-1', tenantId, {
        submissionId: 'sub-1',
        score: 85,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        NexusEvents.GRADE_UPDATED,
        expect.objectContaining({
          oldScore: undefined,
          newScore: 85,
        }),
      );
    });
  });

  describe('getSectionGradebook', () => {
    it('should return empty gradebook when no enrollments', async () => {
      const enrollmentQueryBuilder = createMockQueryBuilder<Enrollment>();
      enrollmentRepo.createQueryBuilder!.mockReturnValue(
        enrollmentQueryBuilder as any,
      );
      enrollmentQueryBuilder.getMany!.mockResolvedValue([]);

      const assignmentQueryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(
        assignmentQueryBuilder as any,
      );
      assignmentQueryBuilder.getMany!.mockResolvedValue([]);

      const result = await service.getSectionGradebook(sectionId, tenantId);

      expect(result.students).toHaveLength(0);
      expect(result.assignments).toHaveLength(0);
      expect(result.classAverage).toBe(0);
    });

    it('should return gradebook with no assignments', async () => {
      const student = createUser({
        id: 'student-1',
        firstName: 'John',
        lastName: 'Doe',
      });
      const enrollment = createEnrollment({
        userId: student.id,
        sectionId,
        user: student,
      });

      const enrollmentQueryBuilder = createMockQueryBuilder<Enrollment>();
      enrollmentRepo.createQueryBuilder!.mockReturnValue(
        enrollmentQueryBuilder as any,
      );
      enrollmentQueryBuilder.getMany!.mockResolvedValue([enrollment]);

      const assignmentQueryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(
        assignmentQueryBuilder as any,
      );
      assignmentQueryBuilder.getMany!.mockResolvedValue([]);

      const result = await service.getSectionGradebook(sectionId, tenantId);

      expect(result.students).toHaveLength(1);
      expect(result.students[0].firstName).toBe('John');
      expect(result.students[0].grades).toHaveLength(0);
      expect(result.students[0].totalEarned).toBe(0);
      expect(result.students[0].percentage).toBe(0);
      expect(result.classAverage).toBe(0);
    });

    it('should calculate grades and averages correctly', async () => {
      const student = createUser({
        id: 'student-1',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
      });
      const enrollment = createEnrollment({
        userId: student.id,
        sectionId,
        user: student,
        status: EnrollmentStatus.ACTIVE,
      });

      const assignment = createAssignment({
        id: 'assign-1',
        sectionId,
        title: 'Homework 1',
      });
      // Manually set pointsPossible since factory may use maxPoints
      (assignment as any).pointsPossible = 100;

      const submission = createSubmission({
        id: 'sub-1',
        assignmentId: 'assign-1',
        userId: 'student-1',
        score: 85,
        gradedAt: new Date(),
        submittedAt: new Date(),
      });

      // Mock enrollments query
      const enrollmentQueryBuilder = createMockQueryBuilder<Enrollment>();
      enrollmentRepo.createQueryBuilder!.mockReturnValue(
        enrollmentQueryBuilder as any,
      );
      enrollmentQueryBuilder.getMany!.mockResolvedValue([enrollment]);

      // Mock assignments query
      const assignmentQueryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(
        assignmentQueryBuilder as any,
      );
      assignmentQueryBuilder.getMany!.mockResolvedValue([assignment]);

      // Mock submissions query
      submissionRepo.find!.mockResolvedValue([submission]);

      const result = await service.getSectionGradebook(sectionId, tenantId);

      expect(result.students).toHaveLength(1);
      expect(result.students[0].totalEarned).toBe(85);
      expect(result.students[0].totalPossible).toBe(100);
      expect(result.students[0].percentage).toBe(85);
      expect(result.students[0].grades[0].score).toBe(85);
      expect(result.assignments[0].averageScore).toBe(85);
      expect(result.classAverage).toBe(85);
    });

    it('should prefer graded submissions over ungraded when multiple exist', async () => {
      const student = createUser({ id: 'student-1' });
      const enrollment = createEnrollment({
        userId: student.id,
        sectionId,
        user: student,
      });

      const assignment = createAssignment({
        id: 'assign-1',
        sectionId,
      });
      (assignment as any).pointsPossible = 100;

      // Two submissions: one ungraded (attempt 2), one graded (attempt 1)
      const ungradedSub = createSubmission({
        id: 'sub-2',
        assignmentId: 'assign-1',
        userId: 'student-1',
        score: undefined,
        gradedAt: undefined,
      });
      (ungradedSub as any).attempt = 2;

      const gradedSub = createSubmission({
        id: 'sub-1',
        assignmentId: 'assign-1',
        userId: 'student-1',
        score: 75,
        gradedAt: new Date(),
      });
      (gradedSub as any).attempt = 1;

      const enrollmentQueryBuilder = createMockQueryBuilder<Enrollment>();
      enrollmentRepo.createQueryBuilder!.mockReturnValue(
        enrollmentQueryBuilder as any,
      );
      enrollmentQueryBuilder.getMany!.mockResolvedValue([enrollment]);

      const assignmentQueryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(
        assignmentQueryBuilder as any,
      );
      assignmentQueryBuilder.getMany!.mockResolvedValue([assignment]);

      // Submissions returned in DESC attempt order
      submissionRepo.find!.mockResolvedValue([ungradedSub, gradedSub]);

      const result = await service.getSectionGradebook(sectionId, tenantId);

      // Should use the graded submission's score
      expect(result.students[0].grades[0].score).toBe(75);
      expect(result.students[0].totalEarned).toBe(75);
    });

    it('should sort students by last name, first name', async () => {
      const student1 = createUser({
        id: 's1',
        firstName: 'Zoe',
        lastName: 'Adams',
      });
      const student2 = createUser({
        id: 's2',
        firstName: 'Alice',
        lastName: 'Brown',
      });
      const student3 = createUser({
        id: 's3',
        firstName: 'Bob',
        lastName: 'Adams',
      });

      const enrollments = [
        createEnrollment({ userId: 's1', sectionId, user: student1 }),
        createEnrollment({ userId: 's2', sectionId, user: student2 }),
        createEnrollment({ userId: 's3', sectionId, user: student3 }),
      ];

      const enrollmentQueryBuilder = createMockQueryBuilder<Enrollment>();
      enrollmentRepo.createQueryBuilder!.mockReturnValue(
        enrollmentQueryBuilder as any,
      );
      enrollmentQueryBuilder.getMany!.mockResolvedValue(enrollments);

      const assignmentQueryBuilder = createMockQueryBuilder<Assignment>();
      assignmentRepo.createQueryBuilder!.mockReturnValue(
        assignmentQueryBuilder as any,
      );
      assignmentQueryBuilder.getMany!.mockResolvedValue([]);

      const result = await service.getSectionGradebook(sectionId, tenantId);

      // Should be: Adams Bob, Adams Zoe, Brown Alice
      expect(result.students[0].firstName).toBe('Bob');
      expect(result.students[1].firstName).toBe('Zoe');
      expect(result.students[2].firstName).toBe('Alice');
    });
  });
});
