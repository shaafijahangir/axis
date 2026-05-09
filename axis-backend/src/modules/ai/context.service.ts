import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Course } from '../../database/entities/course.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { Tenant } from '../../database/entities/tenant.entity';
import { ContextPayload, ContextBuilderParams } from './agents/agent.interface';

/**
 * Assembles rich context for AI agents.
 *
 * WHY: Good AI output requires good context. Instead of letting each agent
 * fetch its own data, we centralize context assembly here. This ensures
 * consistent tenant scoping and avoids N+1 queries.
 *
 * PATTERN: Builder — constructs a ContextPayload by selectively loading
 * data based on what the agent needs.
 */
@Injectable()
export class ContextService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentsRepository: Repository<Enrollment>,
    @InjectRepository(Assignment)
    private assignmentsRepository: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
  ) {}

  /**
   * Build a full context payload based on available parameters.
   * Only loads what's needed — if no courseId is provided, course context is skipped.
   */
  async buildContext(params: ContextBuilderParams): Promise<ContextPayload> {
    const payload: ContextPayload = {};

    // Always load tenant context for tenant scoping
    const tenant = await this.tenantsRepository.findOne({
      where: { id: params.tenantId },
    });
    if (tenant) {
      payload.tenant = {
        id: tenant.id,
        name: tenant.name,
        settings: tenant.settings,
      };
    }

    // Load student context (user + enrollments)
    const user = await this.usersRepository.findOne({
      where: { id: params.userId },
    });
    if (user) {
      const enrollments = await this.enrollmentsRepository.find({
        where: { userId: params.userId },
        relations: ['section', 'section.course'],
      });

      payload.student = {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        enrollments: enrollments.map((e) => ({
          courseTitle: e.section?.course?.title || 'Unknown',
          sectionId: e.sectionId,
          status: e.status,
        })),
      };
    }

    // Load course context if courseId provided
    if (params.courseId) {
      const course = await this.coursesRepository.findOne({
        where: { id: params.courseId },
      });
      if (course) {
        payload.course = {
          id: course.id,
          title: course.title,
          code: course.code,
          description: course.description,
        };
      }
    }

    // Load assignment context if assignmentId provided
    if (params.assignmentId) {
      const assignment = await this.assignmentsRepository.findOne({
        where: { id: params.assignmentId },
      });
      if (assignment) {
        payload.assignment = {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          rubric: assignment.rubric,
          pointsPossible: assignment.pointsPossible,
          dueAt: assignment.dueAt?.toISOString(),
        };
      }
    }

    // Load submission context if submissionId provided
    if (params.submissionId) {
      const submission = await this.submissionsRepository.findOne({
        where: { id: params.submissionId },
      });
      if (submission) {
        payload.submission = {
          id: submission.id,
          content: submission.content,
          score: submission.score,
          feedback: submission.feedback,
        };
      }
    }

    return payload;
  }

  /**
   * Build a compact text summary of the context for injection into system prompts.
   * This is what the AI actually sees — structured but readable.
   */
  formatContextForPrompt(payload: ContextPayload): string {
    const sections: string[] = [];

    if (payload.tenant) {
      sections.push(`Institution: ${payload.tenant.name}`);
    }

    if (payload.student) {
      sections.push(
        `Student: ${payload.student.name}`,
        `Enrolled courses: ${
          payload.student.enrollments.length > 0
            ? payload.student.enrollments
                .map((e) => `${e.courseTitle} (${e.status})`)
                .join(', ')
            : 'None'
        }`,
      );
    }

    if (payload.course) {
      sections.push(
        `Current course: ${payload.course.code} — ${payload.course.title}`,
        payload.course.description
          ? `Course description: ${payload.course.description}`
          : '',
      );
    }

    if (payload.assignment) {
      sections.push(
        `Assignment: ${payload.assignment.title} (${payload.assignment.pointsPossible} points)`,
        payload.assignment.description
          ? `Assignment description: ${payload.assignment.description}`
          : '',
        payload.assignment.dueAt ? `Due: ${payload.assignment.dueAt}` : '',
      );
    }

    if (payload.submission) {
      sections.push(
        `Submission score: ${payload.submission.score ?? 'Not yet graded'}`,
        payload.submission.feedback
          ? `Existing feedback: ${payload.submission.feedback}`
          : '',
      );
    }

    return sections.filter(Boolean).join('\n');
  }
}
