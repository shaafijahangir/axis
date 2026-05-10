import { ToolDefinition } from './tool.interface';
import { CareerService } from '../../planner/career.service';

/**
 * Career exploration + skill gap AI tools.
 *
 * WHY: Students don't know what careers are achievable with their degree,
 * and they can't easily map courses to outcomes. These tools let the
 * Course Planner agent answer "what can I do with a CS degree?" and
 * "am I on track to become a data scientist?" using structured data
 * rather than hallucinated career advice.
 *
 * PATTERN: Factory + Closure — same pattern as planner.tools.ts.
 * Both tools are 'auto' (no governance prompt) because they're read-only.
 */
export function createCareerTools(
  careerService: CareerService,
): ToolDefinition[] {
  return [
    {
      name: 'explore_careers',
      description:
        'Browse available career profiles for this institution. Returns a list of careers with titles, categories, salary ranges, required skills, and recommended degree programs. Use this when a student asks about career paths, what they can do with their degree, or wants to explore options. Optionally filter by category (e.g. "Technology", "Healthcare", "Business").',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description:
              'Optional: filter by career category (e.g. "Technology", "Healthcare", "Business", "Engineering"). Omit to return all categories.',
          },
          profileId: {
            type: 'string',
            description:
              "Optional: if provided, careers matching the student's degree program will be ranked first.",
          },
        },
        required: [],
      },
      handler: async (input, ctx) => {
        if (input.profileId) {
          return careerService.findCareersForProfile(
            input.profileId as string,
            ctx.userId,
            ctx.tenantId,
          );
        }
        return careerService.listCareers(
          ctx.tenantId,
          input.category as string | undefined,
        );
      },
      requiredPermissions: ['planner.read'],
      actionType: 'auto',
    },

    {
      name: 'career_skill_gap',
      description:
        "Analyse how ready a student is for a specific career. Compares the student's completed and current courses against the career's recommended course list. Returns each course with status (completed / in_progress / missing) and an overall readiness percentage. Use this when a student asks 'Am I on track to become a data scientist?' or 'What else do I need for this career?'",
      inputSchema: {
        type: 'object',
        properties: {
          careerId: {
            type: 'string',
            description:
              'The career profile ID from explore_careers. Must belong to the same tenant.',
          },
          profileId: {
            type: 'string',
            description:
              "The student's degree profile ID from get_student_degree_profiles.",
          },
        },
        required: ['careerId', 'profileId'],
      },
      handler: async (input, ctx) => {
        return careerService.skillGapAnalysis(
          input.careerId as string,
          input.profileId as string,
          ctx.userId,
          ctx.tenantId,
        );
      },
      requiredPermissions: ['planner.read'],
      actionType: 'auto',
    },
  ];
}
