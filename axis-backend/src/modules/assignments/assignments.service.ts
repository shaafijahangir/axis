import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import {
  Enrollment,
  EnrollmentRole,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { NexusEvents } from '../ai/events/ai-events';
import {
  CreateAssignmentInput,
  UpdateAssignmentInput,
  ExtendDeadlinesInput,
  CreateSubmissionInput,
  GradeSubmissionInput,
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
    private eventEmitter: EventEmitter2,
  ) {}

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
  ): Promise<Assignment> {
    const assignment = this.assignmentRepo.create({
      ...input,
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
    const saved = await this.assignmentRepo.save(assignment);

    this.eventEmitter.emit(NexusEvents.ASSIGNMENT_CREATED, {
      assignmentId: saved.id,
      sectionId: input.sectionId,
      tenantId,
      title: saved.title,
    });

    return saved;
  }

  async updateAssignment(input: UpdateAssignmentInput): Promise<Assignment> {
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

    return this.assignmentRepo.save(assignment);
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
}
