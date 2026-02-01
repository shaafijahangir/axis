import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { NexusEvents } from '../ai/events/ai-events';
import {
  CreateAssignmentInput,
  CreateSubmissionInput,
  GradeSubmissionInput,
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
}
