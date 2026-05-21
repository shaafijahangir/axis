import { Repository } from 'typeorm';
import { ToolDefinition } from './tool.interface';
import { Submission } from '../../../database/entities/submission.entity';

/**
 * Grading tools — AI can read grades and suggest feedback.
 *
 * WHY 'suggest' for write operations: In education, grade changes must have
 * human oversight. The AI can draft feedback but an instructor must confirm.
 * This is enforced via the governance layer.
 */
export function createGradingTools(
  submissionRepo: Repository<Submission>,
): ToolDefinition[] {
  return [
    {
      name: 'get_submission_details',
      description:
        'Get full details of a submission including its content, score, and feedback.',
      inputSchema: {
        type: 'object',
        properties: {
          submissionId: {
            type: 'string',
            description: 'The UUID of the submission',
          },
        },
        required: ['submissionId'],
      },
      handler: async (input, ctx) => {
        const submission = await submissionRepo.findOne({
          where: {
            id: input.submissionId as string,
            tenantId: ctx.tenantId,
          },
          relations: ['assignment', 'user'],
        });
        if (!submission) {
          return { error: 'Submission not found' };
        }
        return {
          id: submission.id,
          assignmentTitle: submission.assignment?.title,
          studentName: submission.user
            ? `${submission.user.firstName} ${submission.user.lastName}`
            : 'Unknown',
          attempt: submission.attempt,
          content: submission.content,
          submittedAt: submission.submittedAt?.toISOString(),
          score: submission.score,
          pointsPossible: submission.assignment?.pointsPossible,
          feedback: submission.feedback,
          gradedAt: submission.gradedAt?.toISOString(),
          rubric: submission.assignment?.rubric,
        };
      },
      requiredPermissions: ['submissions.read'],
      actionType: 'auto',
    },
    {
      name: 'draft_feedback',
      description:
        'Save AI-drafted feedback on a submission. This is a SUGGESTION — it does not assign a grade. An instructor must review and confirm.',
      inputSchema: {
        type: 'object',
        properties: {
          submissionId: {
            type: 'string',
            description: 'The UUID of the submission',
          },
          feedback: {
            type: 'string',
            description:
              'The feedback text to save as a draft for instructor review',
          },
        },
        required: ['submissionId', 'feedback'],
      },
      handler: async (input, ctx) => {
        const submission = await submissionRepo.findOne({
          where: {
            id: input.submissionId as string,
            tenantId: ctx.tenantId,
          },
        });
        if (!submission) {
          return { error: 'Submission not found' };
        }
        // Save as draft feedback — prefixed to indicate AI origin
        submission.feedback = `[AI Draft] ${input.feedback as string}`;
        await submissionRepo.save(submission);
        return {
          submissionId: submission.id,
          feedbackSaved: true,
          note: 'Draft feedback saved. Instructor review required before student visibility.',
        };
      },
      requiredPermissions: ['grading.write'],
      actionType: 'suggest',
    },
  ];
}
