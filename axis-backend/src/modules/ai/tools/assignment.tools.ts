import { Repository } from 'typeorm';
import { ToolDefinition } from './tool.interface';
import { Assignment } from '../../../database/entities/assignment.entity';
import { Submission } from '../../../database/entities/submission.entity';

/**
 * Assignment and submission tools.
 *
 * WHY direct repository access instead of a service: The assignment and submission
 * entities don't have a dedicated service yet (they're just entities).
 * We inject the repositories directly. When an AssignmentsService is created
 * in a future PR, we'll refactor these tools to use it instead.
 *
 * TRADEOFF: Slight coupling to TypeORM, but avoids creating a stub service
 * that would just be pass-through methods.
 */
export function createAssignmentTools(
  assignmentRepo: Repository<Assignment>,
  submissionRepo: Repository<Submission>,
): ToolDefinition[] {
  return [
    {
      name: 'list_section_assignments',
      description:
        'List all assignments for a course section. Returns title, type, points, due date.',
      inputSchema: {
        type: 'object',
        properties: {
          sectionId: {
            type: 'string',
            description: 'The UUID of the course section',
          },
        },
        required: ['sectionId'],
      },
      handler: async (input, ctx) => {
        // SEC: tenant-scope every read — AI tools run as the authenticated
        // user and must not return data from other tenants even if a
        // foreign UUID is passed in the prompt.
        const assignments = await assignmentRepo.find({
          where: {
            sectionId: input.sectionId as string,
            tenantId: ctx.tenantId,
          },
          order: { dueAt: 'ASC' },
        });
        return assignments.map((a) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          pointsPossible: a.pointsPossible,
          dueAt: a.dueAt?.toISOString(),
          description: a.description,
        }));
      },
      requiredPermissions: ['assignments.read'],
      actionType: 'auto',
    },
    {
      name: 'get_assignment',
      description:
        'Get detailed information about an assignment, including its rubric and settings.',
      inputSchema: {
        type: 'object',
        properties: {
          assignmentId: {
            type: 'string',
            description: 'The UUID of the assignment',
          },
        },
        required: ['assignmentId'],
      },
      handler: async (input, ctx) => {
        const assignment = await assignmentRepo.findOne({
          where: {
            id: input.assignmentId as string,
            tenantId: ctx.tenantId,
          },
        });
        if (!assignment) {
          return { error: 'Assignment not found' };
        }
        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          type: assignment.type,
          pointsPossible: assignment.pointsPossible,
          dueAt: assignment.dueAt?.toISOString(),
          unlockAt: assignment.unlockAt?.toISOString(),
          lockAt: assignment.lockAt?.toISOString(),
          rubric: assignment.rubric,
          settings: assignment.settings,
        };
      },
      requiredPermissions: ['assignments.read'],
      actionType: 'auto',
    },
    {
      name: 'get_student_submissions',
      description:
        'Get all submissions for a specific student on a specific assignment.',
      inputSchema: {
        type: 'object',
        properties: {
          assignmentId: {
            type: 'string',
            description: 'The UUID of the assignment',
          },
          userId: {
            type: 'string',
            description: 'The UUID of the student',
          },
        },
        required: ['assignmentId', 'userId'],
      },
      handler: async (input, ctx) => {
        const submissions = await submissionRepo.find({
          where: {
            assignmentId: input.assignmentId as string,
            userId: input.userId as string,
            tenantId: ctx.tenantId,
          },
          order: { attempt: 'DESC' },
        });
        return submissions.map((s) => ({
          id: s.id,
          attempt: s.attempt,
          submittedAt: s.submittedAt?.toISOString(),
          score: s.score,
          feedback: s.feedback,
          gradedAt: s.gradedAt?.toISOString(),
        }));
      },
      requiredPermissions: ['submissions.read'],
      actionType: 'auto',
    },
    {
      name: 'get_assignment_submissions',
      description:
        'Get all submissions for a specific assignment across all students. Useful for grading overviews.',
      inputSchema: {
        type: 'object',
        properties: {
          assignmentId: {
            type: 'string',
            description: 'The UUID of the assignment',
          },
        },
        required: ['assignmentId'],
      },
      handler: async (input, ctx) => {
        const submissions = await submissionRepo.find({
          where: {
            assignmentId: input.assignmentId as string,
            tenantId: ctx.tenantId,
          },
          relations: ['user'],
          order: { submittedAt: 'DESC' },
        });
        return submissions.map((s) => ({
          id: s.id,
          userId: s.userId,
          studentName: s.user
            ? `${s.user.firstName} ${s.user.lastName}`
            : 'Unknown',
          attempt: s.attempt,
          submittedAt: s.submittedAt?.toISOString(),
          score: s.score,
          feedback: s.feedback,
          gradedAt: s.gradedAt?.toISOString(),
        }));
      },
      requiredPermissions: ['submissions.read'],
      actionType: 'auto',
    },
  ];
}
