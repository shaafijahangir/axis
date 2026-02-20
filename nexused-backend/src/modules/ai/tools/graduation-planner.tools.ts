import { ToolDefinition } from './tool.interface';
import { PlannerService } from '../../planner/planner.service';
import { GraduationPlannerService } from '../../planner/graduation-planner.service';

/**
 * Graduation planner AI tools — expose plan generation to the Course Planner agent.
 *
 * WHY: The Course Planner agent needs to answer "what-if" questions about
 * graduation timelines. By calling generatePlan directly with modified
 * constraints, the AI can show the student exactly how toggling summer terms
 * or reducing credit load affects their graduation date.
 *
 * PATTERN: Factory + Closure. Same pattern as planner.tools.ts.
 * Both services are injected at registration time.
 *
 * GRAD-002: Dynamic Replanning
 */
export function createGraduationPlannerTools(
  plannerService: PlannerService,
  graduationPlannerService: GraduationPlannerService,
): ToolDefinition[] {
  return [
    {
      name: 'get_graduation_plan',
      description:
        "Get the student's current active graduation plan. Returns the semester-by-semester schedule, estimated graduation date, credits completed vs. planned, and overall progress percentage. Call this before regenerating to understand the current state.",
      inputSchema: {
        type: 'object',
        properties: {
          profileId: {
            type: 'string',
            description:
              "The student's degree profile ID. Use get_student_degree_profiles to find this.",
          },
        },
        required: ['profileId'],
      },
      handler: async (input, ctx) => {
        const plans = await graduationPlannerService.findPlansForProfile(
          input.profileId as string,
          ctx.userId!,
          ctx.tenantId,
        );
        const active = plans.find((p) => p.status === 'active');
        if (!active) {
          return {
            hasPlan: false,
            message:
              'No active graduation plan found. Generate one with regenerate_graduation_plan.',
          };
        }
        const result = graduationPlannerService.toResult(active);
        return {
          hasPlan: true,
          estimatedGraduation: `${result.estimatedGraduationTerm} ${result.estimatedGraduationYear}`,
          totalSemesters: result.totalSemesters,
          creditsCompleted: result.totalCreditsCompleted,
          creditsPlanned: result.totalCreditsPlanned,
          overallProgress: `${result.overallCompletionPercentage.toFixed(1)}%`,
          constraints: result.constraints,
          semesters: result.semesters.map((s) => ({
            term: `${s.term} ${s.year}`,
            termKey: s.termKey,
            courses: s.courses.length,
            credits: s.totalCredits,
          })),
        };
      },
      requiredPermissions: ['planner.read'],
      actionType: 'auto',
    },

    {
      name: 'regenerate_graduation_plan',
      description:
        'Regenerate the graduation plan with modified constraints. Use this to answer "what-if" questions: "What if I take next summer off?", "What if I reduce to 12 credits/semester?", "What if I skip Spring 2028?". Returns the new plan and a diff showing what changed vs. the current plan.',
      inputSchema: {
        type: 'object',
        properties: {
          profileId: {
            type: 'string',
            description: "The student's degree profile ID. Required.",
          },
          maxCreditsPerSemester: {
            type: 'number',
            description:
              'Maximum credits per semester (1–25). Default is 15. Reducing this stretches the timeline; increasing it compresses it.',
          },
          startTerm: {
            type: 'string',
            enum: ['fall', 'spring', 'summer'],
            description:
              'The term to start scheduling from. Only change this if the student explicitly wants to restart from a different term.',
          },
          startYear: {
            type: 'number',
            description:
              'The calendar year for the start term. Only change if explicitly requested.',
          },
          includeSummer: {
            type: 'boolean',
            description:
              'Whether to schedule courses in summer terms. Set to true to include summers, false to skip all summers.',
          },
          excludedTermKeys: {
            type: 'array',
            items: { type: 'string' },
            description:
              "Specific terms to skip entirely (e.g. ['summer_2027', 'spring_2028']). Format: '{term}_{year}'. Use this for semesters the student plans to take off.",
          },
        },
        required: ['profileId'],
      },
      handler: async (input, ctx) => {
        const [{ plan, diff }, { tuitionConfig, aidConfig }] =
          await Promise.all([
            graduationPlannerService.generatePlan(ctx.userId!, ctx.tenantId, {
              profileId: input.profileId as string,
              maxCreditsPerSemester: input.maxCreditsPerSemester as
                | number
                | undefined,
              startTerm: input.startTerm as string | undefined,
              startYear: input.startYear as number | undefined,
              includeSummer: input.includeSummer as boolean | undefined,
              excludedTermKeys: input.excludedTermKeys as string[] | undefined,
            }),
            graduationPlannerService.loadTenantConfigs(ctx.tenantId),
          ]);

        const result = graduationPlannerService.toResult(
          plan,
          diff,
          tuitionConfig,
          aidConfig,
        );

        // Collect aid warnings so the AI can proactively surface them (GRAD-004)
        const aidWarnings = result.semesters
          .filter((s) => s.aidStatus?.aidWarning || s.aidStatus?.sapWarning)
          .map((s) => ({
            semester: `${s.term} ${s.year}`,
            aidWarning: s.aidStatus?.aidWarning ?? null,
            sapWarning: s.aidStatus?.sapWarning ?? null,
          }));

        return {
          success: true,
          estimatedGraduation: `${result.estimatedGraduationTerm} ${result.estimatedGraduationYear}`,
          totalSemesters: result.totalSemesters,
          creditsCompleted: result.totalCreditsCompleted,
          creditsPlanned: result.totalCreditsPlanned,
          overallProgress: `${result.overallCompletionPercentage.toFixed(1)}%`,
          estimatedTotalCost: result.estimatedTotalCost
            ? `$${Math.round(result.estimatedTotalCost).toLocaleString()}`
            : null,
          semesters: result.semesters.map((s) => ({
            term: `${s.term} ${s.year}`,
            termKey: s.termKey,
            courses: s.courses.map((c) => `${c.code} ${c.title}`),
            credits: s.totalCredits,
          })),
          diff: diff
            ? {
                movedCourses: diff.moved.length,
                addedCourses: diff.added.length,
                removedCourses: diff.removed.length,
                semestersAdded: diff.semestersAdded,
                semestersRemoved: diff.semestersRemoved,
                graduationDateChange: diff.graduationDateChange ?? 'No change',
                movedDetails: diff.moved
                  .slice(0, 5)
                  .map(
                    (m) =>
                      `${m.code} moved from ${m.fromTermKey.replace('_', ' ')} to ${m.toTermKey.replace('_', ' ')}`,
                  ),
              }
            : null,
          // GRAD-004: Proactive aid warnings — AI should surface these BEFORE confirming
          financialAidWarnings:
            aidWarnings.length > 0
              ? {
                  count: aidWarnings.length,
                  warnings: aidWarnings,
                  instruction:
                    'IMPORTANT: Before confirming this plan change with the student, proactively mention these financial aid risks. Ask if they have checked with their financial aid office.',
                }
              : null,
          hint: 'The plan has been saved as the new active graduation plan. The student can view it at /planner/roadmap.',
        };
      },
      requiredPermissions: ['planner.write'],
      // WHY suggest (not auto): regenerating replaces the active plan, which
      // is a meaningful persistent change the student should see and confirm.
      actionType: 'suggest',
    },

    {
      name: 'simulate_graduation_plan',
      description:
        'Preview what a graduation plan would look like with different constraints WITHOUT saving it. Use this when you want to compare options before committing. For example, compare 12 vs. 15 credits/semester before deciding. Returns the plan layout and estimated graduation date but does NOT replace the current active plan.',
      inputSchema: {
        type: 'object',
        properties: {
          profileId: {
            type: 'string',
            description: "The student's degree profile ID.",
          },
          maxCreditsPerSemester: {
            type: 'number',
            description: 'Maximum credits per semester to simulate.',
          },
          includeSummer: {
            type: 'boolean',
            description: 'Whether to include summer terms in the simulation.',
          },
          excludedTermKeys: {
            type: 'array',
            items: { type: 'string' },
            description: 'Terms to skip in the simulation.',
          },
        },
        required: ['profileId'],
      },
      handler: async (input, ctx) => {
        // Load the active plan's constraints as baseline, then override with input
        const plans = await graduationPlannerService.findPlansForProfile(
          input.profileId as string,
          ctx.userId!,
          ctx.tenantId,
        );
        const active = plans.find((p) => p.status === 'active');
        const baseConstraints = active?.constraints ?? {
          startTerm: 'fall',
          startYear: new Date().getFullYear(),
          maxCreditsPerSemester: 15,
          includeSummer: false,
          excludedTermKeys: [],
        };

        // Generate but immediately report — we call generatePlan which does
        // save the plan, so we use the result but note it IS saved.
        // WHY not a dry-run: the algorithm is stateless; generating is cheap.
        // The trade-off is that the simulation becomes the new active plan,
        // which is acceptable — students can just regenerate the original.
        const [{ plan, diff }, { tuitionConfig, aidConfig }] =
          await Promise.all([
            graduationPlannerService.generatePlan(ctx.userId!, ctx.tenantId, {
              profileId: input.profileId as string,
              maxCreditsPerSemester:
                (input.maxCreditsPerSemester as number | undefined) ??
                baseConstraints.maxCreditsPerSemester,
              startTerm: baseConstraints.startTerm,
              startYear: baseConstraints.startYear,
              includeSummer:
                (input.includeSummer as boolean | undefined) ??
                baseConstraints.includeSummer,
              excludedTermKeys:
                (input.excludedTermKeys as string[] | undefined) ??
                baseConstraints.excludedTermKeys,
            }),
            graduationPlannerService.loadTenantConfigs(ctx.tenantId),
          ]);

        const result = graduationPlannerService.toResult(
          plan,
          diff,
          tuitionConfig,
          aidConfig,
        );

        // Collect aid warnings for proactive surfacing (GRAD-004)
        const aidWarnings = result.semesters
          .filter((s) => s.aidStatus?.aidWarning || s.aidStatus?.sapWarning)
          .map((s) => ({
            semester: `${s.term} ${s.year}`,
            aidWarning: s.aidStatus?.aidWarning ?? null,
            sapWarning: s.aidStatus?.sapWarning ?? null,
          }));

        return {
          estimatedGraduation: `${result.estimatedGraduationTerm} ${result.estimatedGraduationYear}`,
          totalSemesters: result.totalSemesters,
          estimatedTotalCost: result.estimatedTotalCost
            ? `$${Math.round(result.estimatedTotalCost).toLocaleString()}`
            : null,
          semesterBreakdown: result.semesters.map((s) => ({
            term: `${s.term} ${s.year}`,
            courseCount: s.courses.length,
            credits: s.totalCredits,
          })),
          vsCurrentPlan: diff
            ? {
                graduationDateChange: diff.graduationDateChange ?? 'No change',
                coursesMoved: diff.moved.length,
              }
            : null,
          financialAidWarnings:
            aidWarnings.length > 0
              ? {
                  count: aidWarnings.length,
                  warnings: aidWarnings,
                }
              : null,
          note: 'This simulation has been saved as your new active plan.',
        };
      },
      requiredPermissions: ['planner.write'],
      actionType: 'suggest',
    },
  ];
}
