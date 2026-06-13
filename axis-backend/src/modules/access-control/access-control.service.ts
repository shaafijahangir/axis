import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

/**
 * ARCH-008: Resource-level authorization, one source of truth.
 *
 * WHY: `@Roles()` proves the caller IS an instructor — not that they are the
 * instructor OF THIS SECTION. Before this service, that second check was
 * invented ad-hoc per resolver (and usually forgotten): any instructor in a
 * tenant could read any section's gradebook, grade any submission, or mark
 * any section's attendance.
 *
 * PATTERN: Assertion methods. Each loads the minimal row it needs (always
 * tenant-scoped) and throws ForbiddenException on failure, NotFoundException
 * when the resource doesn't exist in the tenant. Resolvers call exactly one
 * assertion before delegating to the feature service — grep `accessControl.`
 * to audit coverage.
 *
 * STAFF DEFINITION: a user is "staff" of a section when any of:
 *   - they are the section's instructor (section.instructorId)
 *   - they hold an active TA enrollment in the section
 *   - they are a tenant ADMIN (admins administer every section)
 */
export interface Actor {
  id: string;
  roles: UserRole[] | string[];
}

@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(CourseSection)
    private readonly sectionRepo: Repository<CourseSection>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(ParentStudent)
    private readonly parentStudentRepo: Repository<ParentStudent>,
  ) {}

  private isAdmin(actor: Actor): boolean {
    return (actor.roles as string[]).includes(UserRole.ADMIN);
  }

  /**
   * Caller must be instructor of the section, an active TA in it, or a
   * tenant admin.
   */
  async assertSectionStaff(
    actor: Actor,
    sectionId: string,
    tenantId: string,
  ): Promise<void> {
    if (this.isAdmin(actor)) return;

    const section = await this.sectionRepo
      .createQueryBuilder('section')
      .innerJoin('section.course', 'course')
      .where('section.id = :sectionId', { sectionId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .getOne();
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    if (section.instructorId === actor.id) return;

    const taEnrollment = await this.enrollmentRepo.findOne({
      where: {
        sectionId,
        tenantId,
        userId: actor.id,
        role: EnrollmentRole.TA,
        status: EnrollmentStatus.ACTIVE,
      },
    });
    if (taEnrollment) return;

    throw new ForbiddenException(
      'You do not have staff access to this section',
    );
  }

  /**
   * Caller must hold an active enrollment in the section (any enrollment
   * role) or be section staff.
   */
  async assertEnrolledInSection(
    actor: Actor,
    sectionId: string,
    tenantId: string,
  ): Promise<void> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: {
        sectionId,
        tenantId,
        userId: actor.id,
        status: EnrollmentStatus.ACTIVE,
      },
    });
    if (enrollment) return;

    // Fall through to staff access — instructors aren't enrolled in their
    // own sections, but they obviously belong there.
    await this.assertSectionStaff(actor, sectionId, tenantId);
  }

  /**
   * Caller must be staff of the section the assignment belongs to.
   * Use before creating/listing submissions or mutating the assignment.
   */
  async assertCanGradeAssignment(
    actor: Actor,
    assignmentId: string,
    tenantId: string,
  ): Promise<void> {
    if (this.isAdmin(actor)) return;

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId, tenantId },
      select: ['id', 'sectionId'],
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }
    await this.assertSectionStaff(actor, assignment.sectionId, tenantId);
  }

  /**
   * Caller must be staff of the section the submission's assignment belongs
   * to. Use before grading.
   */
  async assertCanGradeSubmission(
    actor: Actor,
    submissionId: string,
    tenantId: string,
  ): Promise<void> {
    if (this.isAdmin(actor)) return;

    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, tenantId },
      select: ['id', 'assignmentId'],
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    await this.assertCanGradeAssignment(
      actor,
      submission.assignmentId,
      tenantId,
    );
  }

  /**
   * Caller must own the submission OR be staff of its section. Use on any
   * query that returns a single submission by id.
   */
  async assertCanViewSubmission(
    actor: Actor,
    submissionId: string,
    tenantId: string,
  ): Promise<void> {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId, tenantId },
      select: ['id', 'userId', 'assignmentId'],
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    if (submission.userId === actor.id) return;

    await this.assertCanGradeAssignment(
      actor,
      submission.assignmentId,
      tenantId,
    );
  }

  /**
   * Caller must hold a parent/guardian link to the student.
   * (Migrated from the ad-hoc check in parent.service.ts.)
   */
  async assertParentOfStudent(
    parentId: string,
    studentId: string,
    tenantId: string,
  ): Promise<void> {
    const link = await this.parentStudentRepo.findOne({
      where: { parentId, studentId, tenantId },
    });
    if (!link) {
      throw new ForbiddenException('You do not have access to this student');
    }
  }
}
