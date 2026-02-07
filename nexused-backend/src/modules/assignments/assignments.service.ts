import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
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
    @InjectRepository(CourseSection)
    private sectionRepo: Repository<CourseSection>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Assignments ────────────────────────────────────────────────────

  async findBySectionId(sectionId: string): Promise<Assignment[]> {
    return this.assignmentRepo.find({
      where: { sectionId },
      order: { dueAt: 'ASC', createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Assignment> {
    const assignment = await this.assignmentRepo.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async create(input: CreateAssignmentInput): Promise<Assignment> {
    const assignment = this.assignmentRepo.create({
      ...input,
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      unlockAt: input.unlockAt ? new Date(input.unlockAt) : undefined,
      lockAt: input.lockAt ? new Date(input.lockAt) : undefined,
      rubric: input.rubric ? JSON.parse(input.rubric) : undefined,
      settings: input.settings ? JSON.parse(input.settings) : undefined,
    });
    const saved = await this.assignmentRepo.save(assignment);

    // Get tenantId from the section's course
    const section = await this.sectionRepo.findOne({
      where: { id: input.sectionId },
      relations: ['course'],
    });

    this.eventEmitter.emit(NexusEvents.ASSIGNMENT_CREATED, {
      assignmentId: saved.id,
      sectionId: input.sectionId,
      tenantId: section?.course?.tenantId || '',
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
  ): Promise<Submission[]> {
    return this.submissionRepo.find({
      where: { assignmentId },
      relations: ['user'],
      order: { submittedAt: 'DESC' },
    });
  }

  async findSubmissionsByUser(
    assignmentId: string,
    userId: string,
  ): Promise<Submission[]> {
    return this.submissionRepo.find({
      where: { assignmentId, userId },
      order: { attempt: 'DESC' },
    });
  }

  async findSubmissionById(id: string): Promise<Submission> {
    const submission = await this.submissionRepo.findOne({
      where: { id },
      relations: ['assignment', 'user'],
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async createSubmission(
    userId: string,
    input: CreateSubmissionInput,
  ): Promise<Submission> {
    // Determine attempt number
    const existingCount = await this.submissionRepo.count({
      where: { assignmentId: input.assignmentId, userId },
    });

    const submission = this.submissionRepo.create({
      assignmentId: input.assignmentId,
      userId,
      attempt: existingCount + 1,
      content: input.content ? JSON.parse(input.content) : undefined,
      submittedAt: new Date(),
    });
    const saved = await this.submissionRepo.save(submission);

    // Get tenantId via assignment → section → course
    const assignment = await this.assignmentRepo.findOne({
      where: { id: input.assignmentId },
      relations: ['section', 'section.course'],
    });

    this.eventEmitter.emit(NexusEvents.SUBMISSION_CREATED, {
      submissionId: saved.id,
      assignmentId: input.assignmentId,
      userId,
      tenantId: assignment?.section?.course?.tenantId || '',
    });

    return saved;
  }

  // ─── Grading ────────────────────────────────────────────────────────

  async gradeSubmission(
    graderId: string,
    input: GradeSubmissionInput,
  ): Promise<Submission> {
    const submission = await this.findSubmissionById(input.submissionId);
    const oldScore = submission.score;

    submission.score = input.score;
    submission.gradedBy = graderId;
    submission.gradedAt = new Date();
    if (input.feedback) {
      submission.feedback = input.feedback;
    }

    const saved = await this.submissionRepo.save(submission);

    // Get tenantId
    const assignment = await this.assignmentRepo.findOne({
      where: { id: submission.assignmentId },
      relations: ['section', 'section.course'],
    });
    const tenantId = assignment?.section?.course?.tenantId || '';

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

  async getSectionGradebook(sectionId: string): Promise<SectionGradebook> {
    // 1. Active student enrollments
    const enrollments = await this.enrollmentRepo.find({
      where: {
        sectionId,
        status: EnrollmentStatus.ACTIVE,
        role: EnrollmentRole.STUDENT,
      },
      relations: ['user'],
    });
    // Sort by last name, first name in memory (avoids TypeORM join-order quirks)
    enrollments.sort((a, b) =>
      `${a.user.lastName} ${a.user.firstName}`.localeCompare(
        `${b.user.lastName} ${b.user.firstName}`,
      ),
    );

    // 2. All assignments for the section
    const assignments = await this.assignmentRepo.find({
      where: { sectionId },
      order: { dueAt: 'ASC', createdAt: 'ASC' },
    });

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
