import { Repository } from 'typeorm';
import { ToolDefinition } from './tool.interface';
import { Submission } from '../../../database/entities/submission.entity';
import { Enrollment } from '../../../database/entities/enrollment.entity';
import { Assignment } from '../../../database/entities/assignment.entity';

/**
 * Analytics tools — read-only aggregate queries for AI-driven insights.
 *
 * WHY dedicated analytics tools: Agents like the AnalyticsAgent and StudyCoach
 * need aggregate data (averages, distributions, at-risk detection) that individual
 * CRUD tools don't provide. These are pure reads with no side effects.
 */
export function createAnalyticsTools(
  submissionRepo: Repository<Submission>,
  enrollmentRepo: Repository<Enrollment>,
  assignmentRepo: Repository<Assignment>,
): ToolDefinition[] {
  return [
    {
      name: 'get_grade_distribution',
      description:
        'Get the grade distribution for a specific assignment: average score, min, max, and number of graded/ungraded submissions.',
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
      handler: async (input, _ctx) => {
        const result = await submissionRepo
          .createQueryBuilder('s')
          .select('COUNT(*)', 'totalSubmissions')
          .addSelect('COUNT(s.score)', 'gradedCount')
          .addSelect('AVG(s.score)', 'averageScore')
          .addSelect('MIN(s.score)', 'minScore')
          .addSelect('MAX(s.score)', 'maxScore')
          .where('s.assignmentId = :assignmentId', {
            assignmentId: input.assignmentId,
          })
          .getRawOne();

        const assignment = await assignmentRepo.findOne({
          where: { id: input.assignmentId as string },
        });

        return {
          assignmentId: input.assignmentId,
          pointsPossible: assignment?.pointsPossible,
          totalSubmissions: parseInt(result?.totalSubmissions || '0', 10),
          gradedCount: parseInt(result?.gradedCount || '0', 10),
          ungradedCount:
            parseInt(result?.totalSubmissions || '0', 10) -
            parseInt(result?.gradedCount || '0', 10),
          averageScore: parseFloat(result?.averageScore || '0'),
          minScore: parseFloat(result?.minScore || '0'),
          maxScore: parseFloat(result?.maxScore || '0'),
        };
      },
      requiredPermissions: ['analytics.read'],
      actionType: 'auto',
    },
    {
      name: 'get_student_performance',
      description:
        "Get a specific student's performance across all assignments in a section: scores, averages, and missing submissions.",
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The UUID of the student',
          },
          sectionId: {
            type: 'string',
            description: 'The UUID of the course section',
          },
        },
        required: ['userId', 'sectionId'],
      },
      handler: async (input, _ctx) => {
        // Get all assignments for the section
        const assignments = await assignmentRepo.find({
          where: { sectionId: input.sectionId as string },
          order: { dueAt: 'ASC' },
        });

        // Get all submissions for this student in these assignments
        const submissions = await submissionRepo.find({
          where: {
            userId: input.userId as string,
          },
        });

        const assignmentResults = assignments.map((assignment) => {
          const submission = submissions.find(
            (s) => s.assignmentId === assignment.id,
          );
          return {
            assignmentId: assignment.id,
            title: assignment.title,
            type: assignment.type,
            pointsPossible: assignment.pointsPossible,
            score: submission?.score ?? null,
            submitted: !!submission?.submittedAt,
            dueAt: assignment.dueAt?.toISOString(),
          };
        });

        const scoredAssignments = assignmentResults.filter(
          (a) => a.score !== null,
        );
        const totalEarned = scoredAssignments.reduce(
          (sum, a) => sum + (a.score ?? 0),
          0,
        );
        const totalPossible = scoredAssignments.reduce(
          (sum, a) => sum + a.pointsPossible,
          0,
        );

        return {
          userId: input.userId,
          sectionId: input.sectionId,
          assignments: assignmentResults,
          summary: {
            totalAssignments: assignments.length,
            submitted: assignmentResults.filter((a) => a.submitted).length,
            missing: assignmentResults.filter((a) => !a.submitted).length,
            averagePercentage:
              totalPossible > 0
                ? Math.round((totalEarned / totalPossible) * 100)
                : null,
            totalEarned,
            totalPossible,
          },
        };
      },
      requiredPermissions: ['analytics.read'],
      actionType: 'auto',
    },
    {
      name: 'get_section_enrollment_count',
      description: 'Get the number of active enrollments in a course section.',
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
      handler: async (input, _ctx) => {
        const count = await enrollmentRepo.count({
          where: {
            sectionId: input.sectionId as string,
            status: 'active' as any,
          },
        });
        return { sectionId: input.sectionId, activeEnrollments: count };
      },
      requiredPermissions: ['analytics.read'],
      actionType: 'auto',
    },
  ];
}
