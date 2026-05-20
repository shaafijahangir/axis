import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import {
  Enrollment,
  EnrollmentRole,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { NexusEvents } from '../ai/events/ai-events';
import { UploadsService } from '../uploads/uploads.service';
import {
  FileUpload,
  UploadContext,
} from '../uploads/entities/file-upload.entity';
import {
  CreateAssignmentInput,
  UpdateAssignmentInput,
  ExtendDeadlinesInput,
  CreateSubmissionInput,
  GradeSubmissionInput,
  OverrideGradeInput,
  StudentCourseGrades,
  StudentGradeAssignment,
  SectionGradebook,
} from './dto/assignment.types';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(FileUpload)
    private fileUploadRepo: Repository<FileUpload>,
    private eventEmitter: EventEmitter2,
    private dataSource: DataSource,
    private uploadsService: UploadsService,
  ) {}

  /**
   * SPRINT-2: Link confirmed FileUploads to a context entity inside a
   * transaction. Idempotent: re-running with the same fileIds is a no-op
   * because attachToContext sets contextId unconditionally.
   *
   * Skips files the user did not upload (ForbiddenException from
   * attachToContext bubbles up). Skips already-attached-elsewhere files
   * silently to avoid creating cross-context links.
   */
  private async linkAttachments(
    fileIds: string[],
    context: UploadContext,
    contextId: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    if (!fileIds.length) return;
    for (const fileId of fileIds) {
      await this.uploadsService.attachToContext(
        fileId,
        contextId,
        userId,
        tenantId,
      );
    }
    // Sanity: ensure all linked files match the expected context. Reject
    // attempts to pass a SUBMISSION upload as instructions (or vice versa).
    const linked = await this.fileUploadRepo.find({
      where: { id: In(fileIds), tenantId, contextId },
    });
    const wrongContext = linked.filter((f) => f.context !== context);
    if (wrongContext.length) {
      throw new NotFoundException(
        `One or more files were uploaded with the wrong context — expected ${context}`,
      );
    }
  }

  /**
   * SPRINT-2: Find attachments for a given context entity. Used by the
   * GraphQL field resolvers on Submission/Assignment.
   */
  async findAttachments(
    context: UploadContext,
    contextId: string,
    tenantId: string,
  ): Promise<FileUpload[]> {
    return this.fileUploadRepo.find({
      where: { context, contextId, tenantId, confirmed: true },
      order: { createdAt: 'ASC' },
    });
  }

  // ─── Assignments ────────────────────────────────────────────────────

  async findBySectionId(
    sectionId: string,
    tenantId: string,
  ): Promise<Assignment[]> {
    // Join through section → course to verify tenant ownership
    return this.assignmentRepo
      .createQueryBuilder('assignment')
      .innerJoin('assignment.section', 'section')
      .innerJoin('section.course', 'course')
      .where('assignment.sectionId = :sectionId', { sectionId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .orderBy('assignment.dueAt', 'ASC')
      .addOrderBy('assignment.createdAt', 'DESC')
      .getMany();
  }

  async findById(id: string, tenantId: string): Promise<Assignment> {
    const assignment = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .innerJoin('assignment.section', 'section')
      .innerJoin('section.course', 'course')
      .where('assignment.id = :id', { id })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .getOne();
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async create(
    tenantId: string,
    input: CreateAssignmentInput,
    userId?: string,
  ): Promise<Assignment> {
    const { fileUploadIds, ...assignmentFields } = input;

    const saved = await this.dataSource.manager.transaction(async (manager) => {
      const assignment = manager.create(Assignment, {
        ...assignmentFields,
        tenantId,
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        unlockAt: input.unlockAt ? new Date(input.unlockAt) : undefined,
        lockAt: input.lockAt ? new Date(input.lockAt) : undefined,
        rubric: input.rubric
          ? (JSON.parse(input.rubric) as Record<string, unknown>)
          : undefined,
        settings: input.settings
          ? (JSON.parse(input.settings) as Record<string, unknown>)
          : undefined,
      });
      return manager.save(assignment);
    });

    if (fileUploadIds?.length && userId) {
      await this.linkAttachments(
        fileUploadIds,
        UploadContext.ASSIGNMENT_INSTRUCTIONS,
        saved.id,
        userId,
        tenantId,
      );
    }

    this.eventEmitter.emit(NexusEvents.ASSIGNMENT_CREATED, {
      assignmentId: saved.id,
      sectionId: input.sectionId,
      tenantId,
      title: saved.title,
    });

    return saved;
  }

  async updateAssignment(
    input: UpdateAssignmentInput,
    userId?: string,
    tenantId?: string,
  ): Promise<Assignment> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: input.id, sectionId: input.sectionId },
    });
    if (!assignment) {
      throw new NotFoundException(
        'Assignment not found in the specified section',
      );
    }

    if (input.title !== undefined) assignment.title = input.title;
    if (input.description !== undefined)
      assignment.description = input.description;
    if (input.dueAt !== undefined) assignment.dueAt = new Date(input.dueAt);
    if (input.unlockAt !== undefined)
      assignment.unlockAt = new Date(input.unlockAt);
    if (input.lockAt !== undefined) assignment.lockAt = new Date(input.lockAt);
    if (input.pointsPossible !== undefined)
      assignment.pointsPossible = input.pointsPossible;

    const saved = await this.assignmentRepo.save(assignment);

    // SPRINT-2: Full-replace semantics on instruction attachments.
    if (input.fileUploadIds !== undefined && userId && tenantId) {
      // Unlink any current instruction attachments by clearing their contextId
      await this.fileUploadRepo.update(
        {
          context: UploadContext.ASSIGNMENT_INSTRUCTIONS,
          contextId: saved.id,
          tenantId,
        },
        { contextId: null },
      );
      if (input.fileUploadIds.length) {
        await this.linkAttachments(
          input.fileUploadIds,
          UploadContext.ASSIGNMENT_INSTRUCTIONS,
          saved.id,
          userId,
          tenantId,
        );
      }
    }

    return saved;
  }

  async extendDeadlines(input: ExtendDeadlinesInput): Promise<Assignment[]> {
    // Validate all assignments belong to the specified section
    const assignments = await this.assignmentRepo.find({
      where: { id: In(input.assignmentIds), sectionId: input.sectionId },
    });

    if (assignments.length !== input.assignmentIds.length) {
      throw new NotFoundException(
        'One or more assignments not found in the specified section',
      );
    }

    const newDueAt = new Date(input.newDueAt);
    for (const assignment of assignments) {
      assignment.dueAt = newDueAt;
    }

    return this.assignmentRepo.save(assignments);
  }

  // ─── Submissions ────────────────────────────────────────────────────

  async findSubmissionsByAssignment(
    assignmentId: string,
    tenantId: string,
  ): Promise<Submission[]> {
    // Join through assignment → section → course to verify tenant ownership
    return this.submissionRepo
      .createQueryBuilder('submission')
      .innerJoin('submission.assignment', 'assignment')
      .innerJoin('assignment.section', 'section')
      .innerJoin('section.course', 'course')
      .innerJoinAndSelect('submission.user', 'user')
      .where('submission.assignmentId = :assignmentId', { assignmentId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .orderBy('submission.submittedAt', 'DESC')
      .getMany();
  }

  async findSubmissionsByUser(
    assignmentId: string,
    userId: string,
    tenantId: string,
  ): Promise<Submission[]> {
    // Join through assignment → section → course to verify tenant ownership
    return this.submissionRepo
      .createQueryBuilder('submission')
      .innerJoin('submission.assignment', 'assignment')
      .innerJoin('assignment.section', 'section')
      .innerJoin('section.course', 'course')
      .where('submission.assignmentId = :assignmentId', { assignmentId })
      .andWhere('submission.userId = :userId', { userId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .orderBy('submission.attempt', 'DESC')
      .getMany();
  }

  async findSubmissionById(id: string, tenantId: string): Promise<Submission> {
    const submission = await this.submissionRepo
      .createQueryBuilder('submission')
      .innerJoinAndSelect('submission.assignment', 'assignment')
      .innerJoin('assignment.section', 'section')
      .innerJoin('section.course', 'course')
      .innerJoinAndSelect('submission.user', 'user')
      .where('submission.id = :id', { id })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .getOne();
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async createSubmission(
    userId: string,
    tenantId: string,
    input: CreateSubmissionInput,
  ): Promise<Submission> {
    // Verify assignment belongs to this tenant (throws NotFoundException if missing)
    await this.findById(input.assignmentId, tenantId);

    // Determine attempt number
    const existingCount = await this.submissionRepo.count({
      where: { assignmentId: input.assignmentId, userId },
    });

    const submission = this.submissionRepo.create({
      tenantId,
      assignmentId: input.assignmentId,
      userId,
      attempt: existingCount + 1,
      content: input.content
        ? (JSON.parse(input.content) as Record<string, unknown>)
        : undefined,
      submittedAt: new Date(),
    });
    const saved = await this.submissionRepo.save(submission);

    // SPRINT-2: Attach uploaded files (PDFs, docs, images) to this submission.
    // Each attempt has its own attachment set — previous attempts' files
    // stay linked to those attempts for audit.
    if (input.fileUploadIds?.length) {
      await this.linkAttachments(
        input.fileUploadIds,
        UploadContext.ASSIGNMENT_SUBMISSION,
        saved.id,
        userId,
        tenantId,
      );
    }

    this.eventEmitter.emit(NexusEvents.SUBMISSION_CREATED, {
      submissionId: saved.id,
      assignmentId: input.assignmentId,
      userId,
      tenantId,
    });

    return saved;
  }

  // ─── Grading ────────────────────────────────────────────────────────

  async gradeSubmission(
    graderId: string,
    tenantId: string,
    input: GradeSubmissionInput,
  ): Promise<Submission> {
    const submission = await this.findSubmissionById(
      input.submissionId,
      tenantId,
    );
    const oldScore = submission.score;

    submission.score = input.score;
    submission.gradedBy = graderId;
    submission.gradedAt = new Date();
    if (input.feedback) {
      submission.feedback = input.feedback;
    }

    const saved = await this.submissionRepo.save(submission);

    this.eventEmitter.emit(NexusEvents.SUBMISSION_GRADED, {
      submissionId: saved.id,
      gradedBy: graderId,
      score: input.score,
      tenantId,
    });

    this.eventEmitter.emit(NexusEvents.GRADE_UPDATED, {
      submissionId: saved.id,
      oldScore,
      newScore: input.score,
      tenantId,
    });

    return saved;
  }

  // ─── Gradebook ──────────────────────────────────────────────────────

  async getSectionGradebook(
    sectionId: string,
    tenantId: string,
  ): Promise<SectionGradebook> {
    // 1. Active student enrollments (verify tenant through section → course)
    const enrollments = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.user', 'user')
      .innerJoin('enrollment.section', 'section')
      .innerJoin('section.course', 'course')
      .where('enrollment.sectionId = :sectionId', { sectionId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .andWhere('enrollment.status = :status', {
        status: EnrollmentStatus.ACTIVE,
      })
      .andWhere('enrollment.role = :role', { role: EnrollmentRole.STUDENT })
      .getMany();

    // Sort by last name, first name in memory (avoids TypeORM join-order quirks)
    enrollments.sort((a, b) =>
      `${a.user.lastName} ${a.user.firstName}`.localeCompare(
        `${b.user.lastName} ${b.user.firstName}`,
      ),
    );

    // 2. All assignments for the section (tenant-scoped)
    const assignments = await this.findBySectionId(sectionId, tenantId);

    if (assignments.length === 0) {
      return {
        assignments: [],
        students: enrollments.map((e) => ({
          studentId: e.userId,
          firstName: e.user.firstName,
          lastName: e.user.lastName,
          email: e.user.email,
          grades: [],
          totalEarned: 0,
          totalPossible: 0,
          percentage: 0,
        })),
        classAverage: 0,
      };
    }

    const assignmentIds = assignments.map((a) => a.id);

    // 3. All submissions across those assignments (newest attempt first)
    const submissions = await this.submissionRepo.find({
      where: { assignmentId: In(assignmentIds) },
      order: { attempt: 'DESC' },
    });

    // 4. Build grade map: assignmentId → userId → best submission
    //    PATTERN: prefer graded over ungraded; among graded, prefer highest score
    const gradeMap = new Map<
      string,
      Map<
        string,
        {
          score: number | null;
          submittedAt: Date | null;
          gradedAt: Date | null;
          submissionId: string;
        }
      >
    >();

    for (const sub of submissions) {
      if (!gradeMap.has(sub.assignmentId)) {
        gradeMap.set(sub.assignmentId, new Map());
      }
      const assignmentMap = gradeMap.get(sub.assignmentId)!;
      const existing = assignmentMap.get(sub.userId);
      const subScore = sub.score != null ? Number(sub.score) : null;

      if (!existing) {
        assignmentMap.set(sub.userId, {
          score: subScore,
          submittedAt: sub.submittedAt,
          gradedAt: sub.gradedAt,
          submissionId: sub.id,
        });
      } else {
        // Replace if this submission is graded and the existing one isn't,
        // or if both are graded and this one has a higher score
        const existingGraded = existing.gradedAt != null;
        const newGraded = sub.gradedAt != null;
        if (
          (newGraded && !existingGraded) ||
          (newGraded &&
            existingGraded &&
            subScore != null &&
            existing.score != null &&
            subScore > existing.score)
        ) {
          assignmentMap.set(sub.userId, {
            score: subScore,
            submittedAt: sub.submittedAt,
            gradedAt: sub.gradedAt,
            submissionId: sub.id,
          });
        }
      }
    }

    // 5. Build student rows
    const totalPossible = assignments.reduce(
      (sum, a) => sum + Number(a.pointsPossible),
      0,
    );

    const students = enrollments.map((enrollment) => {
      let totalEarned = 0;

      const grades = assignments.map((assignment) => {
        const gradeInfo = gradeMap.get(assignment.id)?.get(enrollment.userId);

        if (gradeInfo?.score != null) {
          totalEarned += gradeInfo.score;
        }

        return {
          assignmentId: assignment.id,
          submissionId: gradeInfo?.submissionId ?? undefined,
          score: gradeInfo?.score ?? undefined,
          submittedAt: gradeInfo?.submittedAt ?? undefined,
          gradedAt: gradeInfo?.gradedAt ?? undefined,
        };
      });

      const percentage =
        totalPossible > 0
          ? Math.round((totalEarned / totalPossible) * 10000) / 100
          : 0;

      return {
        studentId: enrollment.userId,
        firstName: enrollment.user.firstName,
        lastName: enrollment.user.lastName,
        email: enrollment.user.email,
        grades,
        totalEarned,
        totalPossible,
        percentage,
      };
    });

    // 6. Assignment column stats
    const assignmentColumns = assignments.map((assignment) => {
      const assignmentGrades = gradeMap.get(assignment.id);
      const gradedScores: number[] = [];

      if (assignmentGrades) {
        for (const grade of assignmentGrades.values()) {
          if (grade.score != null) {
            gradedScores.push(grade.score);
          }
        }
      }

      let averageScore: number | undefined;
      let medianScore: number | undefined;

      if (gradedScores.length > 0) {
        averageScore =
          Math.round(
            (gradedScores.reduce((sum, s) => sum + s, 0) /
              gradedScores.length) *
              100,
          ) / 100;

        const sorted = [...gradedScores].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        medianScore =
          sorted.length % 2 === 0
            ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100
            : sorted[mid];
      }

      return {
        id: assignment.id,
        title: assignment.title,
        type: assignment.type,
        pointsPossible: Number(assignment.pointsPossible),
        dueAt: assignment.dueAt ?? undefined,
        averageScore,
        medianScore,
      };
    });

    // 7. Class average
    const studentPercentages = students.map((s) => s.percentage);
    const classAverage =
      studentPercentages.length > 0
        ? Math.round(
            (studentPercentages.reduce((sum, p) => sum + p, 0) /
              studentPercentages.length) *
              100,
          ) / 100
        : 0;

    return {
      assignments: assignmentColumns,
      students,
      classAverage,
    };
  }

  // ─── Override Grade ─────────────────────────────────────────────────

  async overrideGrade(
    graderId: string,
    tenantId: string,
    input: OverrideGradeInput,
  ): Promise<Submission> {
    return this.dataSource.manager.transaction(async (manager) => {
      const assignment = await manager.findOne(Assignment, {
        where: { id: input.assignmentId, sectionId: input.sectionId },
      });
      if (!assignment)
        throw new NotFoundException('Assignment not found in this section');

      // Find or create a stub submission for this student
      let submission = await manager.findOne(Submission, {
        where: {
          assignmentId: input.assignmentId,
          userId: input.studentId,
          tenantId,
        },
        order: { attempt: 'DESC' },
      });

      if (!submission) {
        const count = await manager.count(Submission, {
          where: { assignmentId: input.assignmentId, userId: input.studentId },
        });
        submission = manager.create(Submission, {
          tenantId,
          assignmentId: input.assignmentId,
          userId: input.studentId,
          attempt: count + 1,
          submittedAt: new Date(),
        });
        submission = await manager.save(Submission, submission);
      }

      submission.score = input.score;
      submission.gradedBy = graderId;
      submission.gradedAt = new Date();
      if (input.feedback !== undefined) submission.feedback = input.feedback;

      const saved = await manager.save(Submission, submission);

      this.eventEmitter.emit(NexusEvents.GRADE_UPDATED, {
        submissionId: saved.id,
        oldScore: null,
        newScore: input.score,
        tenantId,
      });

      return saved;
    });
  }

  // ─── Student Grades ─────────────────────────────────────────────────

  async getStudentGrades(
    userId: string,
    tenantId: string,
  ): Promise<StudentCourseGrades[]> {
    const enrollments = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.section', 'section')
      .innerJoinAndSelect('section.course', 'course')
      .leftJoinAndSelect('section.instructor', 'instructor')
      .where('enrollment.userId = :userId', { userId })
      .andWhere('enrollment.tenantId = :tenantId', { tenantId })
      .andWhere('enrollment.status = :status', {
        status: EnrollmentStatus.ACTIVE,
      })
      .andWhere('enrollment.role = :role', { role: EnrollmentRole.STUDENT })
      .getMany();

    const results: StudentCourseGrades[] = [];

    for (const enrollment of enrollments) {
      const section = enrollment.section;
      const course = section.course;

      const assignments = await this.findBySectionId(section.id, tenantId);

      if (assignments.length === 0) continue;

      const assignmentIds = assignments.map((a) => a.id);

      // Best (highest-scored, graded) submission per assignment
      const submissions = await this.submissionRepo.find({
        where: {
          assignmentId: In(assignmentIds),
          userId,
          tenantId,
        },
        order: { attempt: 'DESC' },
      });

      // assignment id → best graded submission
      const bestMap = new Map<
        string,
        { score: number; gradedAt: Date; feedback?: string }
      >();
      for (const sub of submissions) {
        if (sub.score == null || sub.gradedAt == null) continue;
        const score = Number(sub.score);
        const existing = bestMap.get(sub.assignmentId);
        if (!existing || score > existing.score) {
          bestMap.set(sub.assignmentId, {
            score,
            gradedAt: sub.gradedAt,
            feedback: sub.feedback ?? undefined,
          });
        }
      }

      const gradedAssignments: StudentGradeAssignment[] = [];
      let totalEarned = 0;
      let totalPossible = 0;

      for (const a of assignments) {
        const best = bestMap.get(a.id);
        if (!best) continue;
        const pts = Number(a.pointsPossible);
        totalEarned += best.score;
        totalPossible += pts;
        gradedAssignments.push({
          assignmentId: a.id,
          assignmentTitle: a.title,
          assignmentType: a.type ?? 'assignment',
          pointsPossible: pts,
          score: best.score,
          percentage:
            pts > 0 ? Math.round((best.score / pts) * 10000) / 100 : 0,
          gradedAt: best.gradedAt,
          feedback: best.feedback,
        });
      }

      if (gradedAssignments.length === 0) continue;

      const instructorName = section.instructor
        ? `${section.instructor.firstName} ${section.instructor.lastName}`
        : undefined;

      results.push({
        sectionId: section.id,
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        sectionInstructor: instructorName,
        totalPointsEarned: totalEarned,
        totalPointsPossible: totalPossible,
        overallPercentage:
          totalPossible > 0
            ? Math.round((totalEarned / totalPossible) * 10000) / 100
            : 0,
        assignments: gradedAssignments,
      });
    }

    return results;
  }
}
