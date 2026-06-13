import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccessControlService, Actor } from './access-control.service';
import { CourseSection } from '../../database/entities/course-section.entity';
import {
  Enrollment,
  EnrollmentRole,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { ParentStudent } from '../../database/entities/parent-student.entity';
import { UserRole } from '../../database/entities/user.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../../test/mocks/repository.mock';

describe('AccessControlService', () => {
  let service: AccessControlService;
  let sectionRepo: MockRepository<CourseSection>;
  let enrollmentRepo: MockRepository<Enrollment>;
  let assignmentRepo: MockRepository<Assignment>;
  let submissionRepo: MockRepository<Submission>;
  let parentStudentRepo: MockRepository<ParentStudent>;

  const tenantId = 'tenant-1';
  const instructor: Actor = { id: 'instr-1', roles: [UserRole.INSTRUCTOR] };
  const otherInstructor: Actor = {
    id: 'instr-2',
    roles: [UserRole.INSTRUCTOR],
  };
  const admin: Actor = { id: 'admin-1', roles: [UserRole.ADMIN] };
  const ta: Actor = { id: 'ta-1', roles: [UserRole.TA] };
  const student: Actor = { id: 'stud-1', roles: [UserRole.STUDENT] };

  beforeEach(async () => {
    sectionRepo = createMockRepository<CourseSection>();
    enrollmentRepo = createMockRepository<Enrollment>();
    assignmentRepo = createMockRepository<Assignment>();
    submissionRepo = createMockRepository<Submission>();
    parentStudentRepo = createMockRepository<ParentStudent>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessControlService,
        { provide: getRepositoryToken(CourseSection), useValue: sectionRepo },
        { provide: getRepositoryToken(Enrollment), useValue: enrollmentRepo },
        { provide: getRepositoryToken(Assignment), useValue: assignmentRepo },
        { provide: getRepositoryToken(Submission), useValue: submissionRepo },
        {
          provide: getRepositoryToken(ParentStudent),
          useValue: parentStudentRepo,
        },
      ],
    }).compile();

    service = module.get(AccessControlService);
  });

  // Wire the section query builder so getOne resolves to `section`.
  function mockSectionLookup(section: Partial<CourseSection> | null) {
    const qb = createMockQueryBuilder<CourseSection>();
    qb.getOne!.mockResolvedValue(section);
    sectionRepo.createQueryBuilder!.mockReturnValue(qb as never);
  }

  describe('assertSectionStaff', () => {
    it('passes for the section instructor', async () => {
      mockSectionLookup({ id: 'sec-1', instructorId: instructor.id });
      await expect(
        service.assertSectionStaff(instructor, 'sec-1', tenantId),
      ).resolves.toBeUndefined();
    });

    it('passes for an admin without any DB lookup', async () => {
      await expect(
        service.assertSectionStaff(admin, 'sec-1', tenantId),
      ).resolves.toBeUndefined();
      expect(sectionRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('passes for an active TA enrolled in the section', async () => {
      mockSectionLookup({ id: 'sec-1', instructorId: instructor.id });
      enrollmentRepo.findOne!.mockResolvedValue({ id: 'enr-1' });
      await expect(
        service.assertSectionStaff(ta, 'sec-1', tenantId),
      ).resolves.toBeUndefined();
      expect(enrollmentRepo.findOne).toHaveBeenCalledWith({
        where: {
          sectionId: 'sec-1',
          tenantId,
          userId: ta.id,
          role: EnrollmentRole.TA,
          status: EnrollmentStatus.ACTIVE,
        },
      });
    });

    it('throws Forbidden for an instructor who does not own the section', async () => {
      mockSectionLookup({ id: 'sec-1', instructorId: instructor.id });
      enrollmentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.assertSectionStaff(otherInstructor, 'sec-1', tenantId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFound when the section is not in the tenant', async () => {
      mockSectionLookup(null);
      await expect(
        service.assertSectionStaff(instructor, 'sec-x', tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertCanGradeAssignment', () => {
    it('throws NotFound for an assignment outside the tenant', async () => {
      assignmentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.assertCanGradeAssignment(instructor, 'a-x', tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('delegates to section staff check on the assignment section', async () => {
      assignmentRepo.findOne!.mockResolvedValue({
        id: 'a-1',
        sectionId: 'sec-1',
      });
      mockSectionLookup({ id: 'sec-1', instructorId: otherInstructor.id });
      enrollmentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.assertCanGradeAssignment(instructor, 'a-1', tenantId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('short-circuits for admin', async () => {
      await expect(
        service.assertCanGradeAssignment(admin, 'a-1', tenantId),
      ).resolves.toBeUndefined();
      expect(assignmentRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('assertCanViewSubmission', () => {
    it('passes for the submission owner', async () => {
      submissionRepo.findOne!.mockResolvedValue({
        id: 's-1',
        userId: student.id,
        assignmentId: 'a-1',
      });
      await expect(
        service.assertCanViewSubmission(student, 's-1', tenantId),
      ).resolves.toBeUndefined();
      // Owner short-circuits before any assignment/section lookup
      expect(assignmentRepo.findOne).not.toHaveBeenCalled();
    });

    it('passes for staff of the submission section', async () => {
      submissionRepo.findOne!.mockResolvedValue({
        id: 's-1',
        userId: 'other-student',
        assignmentId: 'a-1',
      });
      assignmentRepo.findOne!.mockResolvedValue({
        id: 'a-1',
        sectionId: 'sec-1',
      });
      mockSectionLookup({ id: 'sec-1', instructorId: instructor.id });
      await expect(
        service.assertCanViewSubmission(instructor, 's-1', tenantId),
      ).resolves.toBeUndefined();
    });

    it('throws Forbidden for a non-owner student', async () => {
      submissionRepo.findOne!.mockResolvedValue({
        id: 's-1',
        userId: 'other-student',
        assignmentId: 'a-1',
      });
      assignmentRepo.findOne!.mockResolvedValue({
        id: 'a-1',
        sectionId: 'sec-1',
      });
      mockSectionLookup({ id: 'sec-1', instructorId: instructor.id });
      enrollmentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.assertCanViewSubmission(student, 's-1', tenantId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFound for a submission outside the tenant', async () => {
      submissionRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.assertCanViewSubmission(student, 's-x', tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertParentOfStudent', () => {
    it('passes when a link exists', async () => {
      parentStudentRepo.findOne!.mockResolvedValue({ id: 'link-1' });
      await expect(
        service.assertParentOfStudent('parent-1', 'stud-1', tenantId),
      ).resolves.toBeUndefined();
    });

    it('throws Forbidden with no link', async () => {
      parentStudentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.assertParentOfStudent('parent-1', 'stud-1', tenantId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
