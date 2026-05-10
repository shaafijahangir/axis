import { ToolDefinition } from './tool.interface';
import { PlannerService } from '../../planner/planner.service';

/**
 * Course Planner AI tools — wraps PlannerService methods.
 *
 * WHY: The Course Planner agent needs structured computation results
 * (degree progress, course eligibility, major change simulation)
 * rather than raw database records. These tools provide exactly the
 * data the agent needs to give students actionable advice.
 *
 * PATTERN: Factory + Closure — same pattern as course.tools.ts.
 * The PlannerService is captured at registration time.
 */
export function createPlannerTools(
  plannerService: PlannerService,
): ToolDefinition[] {
  return [
    {
      name: 'get_degree_progress',
      description:
        "Get a student's progress toward their degree. Returns overall percentage, credits completed/remaining, and per-requirement-group breakdown showing which requirements are fulfilled and which courses remain.",
      inputSchema: {
        type: 'object',
        properties: {
          profileId: {
            type: 'string',
            description:
              'The student degree profile ID. Use get_student_degree_profiles first to find this.',
          },
        },
        required: ['profileId'],
      },
      handler: async (input, ctx) => {
        return plannerService.calculateProgress(
          input.profileId as string,
          ctx.tenantId,
        );
      },
      requiredPermissions: ['planner.read'],
      actionType: 'auto',
    },

    {
      name: 'get_student_degree_profiles',
      description:
        'Get all degree profiles for a student. Each profile links the student to a degree program and tracks their completed/current courses. A student may have multiple profiles (e.g., double major).',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description:
              "The user ID of the student. Use the current user's ID from context.",
          },
        },
        required: ['userId'],
      },
      handler: async (input, ctx) => {
        const profiles = await plannerService.findStudentProfiles(
          ctx.tenantId,
          input.userId as string,
        );
        return profiles.map((p) => ({
          id: p.id,
          degreeProgramId: p.degreeProgramId,
          degreeProgramName: p.degreeProgram?.name,
          degreeProgramCode: p.degreeProgram?.code,
          enrollmentYear: p.enrollmentYear,
          expectedGraduationYear: p.expectedGraduationYear,
          completedCourseCount: p.completedCourseIds.length,
          currentCourseCount: p.currentCourseIds.length,
          status: p.status,
        }));
      },
      requiredPermissions: ['planner.read'],
      actionType: 'auto',
    },

    {
      name: 'get_eligible_courses',
      description:
        'Find courses the student is eligible to take next. Filters by: not already completed, prerequisites met, and satisfies an unfulfilled degree requirement. Returns course code, title, credits, which requirement it fulfills, and whether prerequisites are met.',
      inputSchema: {
        type: 'object',
        properties: {
          profileId: {
            type: 'string',
            description: 'The student degree profile ID.',
          },
        },
        required: ['profileId'],
      },
      handler: async (input, ctx) => {
        return plannerService.findEligibleCourses(
          input.profileId as string,
          ctx.tenantId,
        );
      },
      requiredPermissions: ['planner.read'],
      actionType: 'auto',
    },

    {
      name: 'get_degree_requirements',
      description:
        'Get the full requirements for a degree program. Returns requirement groups (core, electives, general education, concentration) with the courses in each group and how many credits/courses are needed.',
      inputSchema: {
        type: 'object',
        properties: {
          programId: {
            type: 'string',
            description: 'The degree program ID.',
          },
        },
        required: ['programId'],
      },
      handler: async (input, ctx) => {
        const program = await plannerService.findDegreeProgramOrFail(
          input.programId as string,
          ctx.tenantId,
        );
        return {
          id: program.id,
          name: program.name,
          code: program.code,
          department: program.department,
          totalCreditsRequired: program.totalCreditsRequired,
          requirements: program.requirements,
        };
      },
      requiredPermissions: ['planner.read'],
      actionType: 'auto',
    },

    {
      name: 'list_degree_programs',
      description:
        'List all active degree programs available at the institution. Returns program name, code, department, and total credits required.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async (_input, ctx) => {
        const programs = await plannerService.findActivePrograms(ctx.tenantId);
        return programs.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          department: p.department,
          totalCreditsRequired: p.totalCreditsRequired,
          status: p.status,
        }));
      },
      requiredPermissions: ['planner.read'],
      actionType: 'auto',
    },

    {
      name: 'simulate_major_change',
      description:
        'Simulate what would happen if the student switched to a different degree program. Shows how many existing credits would transfer, which requirements are already met, and how many additional credits/semesters are needed. Useful for "What if I change my major?" questions.',
      inputSchema: {
        type: 'object',
        properties: {
          profileId: {
            type: 'string',
            description: "The student's current degree profile ID.",
          },
          targetProgramId: {
            type: 'string',
            description: 'The degree program ID to simulate switching to.',
          },
        },
        required: ['profileId', 'targetProgramId'],
      },
      handler: async (input, ctx) => {
        return plannerService.simulateMajorChange(
          input.profileId as string,
          input.targetProgramId as string,
          ctx.tenantId,
        );
      },
      requiredPermissions: ['planner.read'],
      actionType: 'auto',
    },
  ];
}
