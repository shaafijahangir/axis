import { Repository } from 'typeorm';
import { Course } from '../../../database/entities/course.entity';
import { CourseSection } from '../../../database/entities/course-section.entity';
import { PlannerService } from '../../planner/planner.service';
import { ToolDefinition, AgentContext } from './tool.interface';

/**
 * Course Discovery AI tool (ENROLL-007).
 *
 * WHY: Students can't always navigate a flat course catalog to find what they
 * need. Natural language queries like "I need a 3-credit lab science" or
 * "morning MWF courses that count toward my CS electives" are far more
 * natural than filter dropdowns. This tool translates those queries into
 * structured catalog searches and optionally cross-references with degree
 * requirements so the AI can say "CS301 fulfills your upper-division elective".
 *
 * PATTERN: Factory + closure — same pattern as course.tools.ts and planner.tools.ts.
 * The repositories and PlannerService are captured at registration time.
 *
 * TRADEOFF: We do a LIKE-based text search rather than vector similarity
 * (Phase C enhancement). For a typical tenant catalog of 200-500 courses,
 * LIKE search is fast enough and doesn't require a vector store.
 */
export function createCourseDiscoveryTools(
  courseRepo: Repository<Course>,
  sectionRepo: Repository<CourseSection>,
  plannerService: PlannerService,
): ToolDefinition[] {
  return [
    {
      name: 'discover_courses',
      description: `Search the course catalog using natural language or structured filters.

Returns courses matching the student's criteria with section availability and,
optionally, whether each course fulfills an unfulfilled degree requirement.

Use this tool when the student says things like:
- "I need a 3-credit lab science"
- "What courses count toward my CS electives?"
- "Find morning classes on MWF"
- "I need a 400-level history course"
- "What courses does Dr. Smith teach?"
- "Show me general education options with 3 credits"

The query field drives full-text search across course code, title, and description.
Use the structured filters (minCredits, maxCredits, category, level, semester) when
the student specifies those constraints explicitly.

If the student has a degree profile, pass degreeProfileId and each result will show
whether it fulfills an unfulfilled requirement — making it easy to say
"HIST401 counts toward your upper-division humanities requirement".`,

      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Natural language search terms. Matched against course code, title, and description. Pass the key nouns/topics from the student\'s request (e.g., "computer networks", "organic chemistry", "calculus").',
          },
          minCredits: {
            type: 'number',
            description:
              'Minimum credit hours (inclusive). Use when student says "at least X credits" or "X-credit course". Typical values: 1, 2, 3, 4.',
          },
          maxCredits: {
            type: 'number',
            description: 'Maximum credit hours (inclusive).',
          },
          category: {
            type: 'string',
            enum: ['CORE', 'ELECTIVE', 'GENERAL_EDUCATION', 'LAB', 'SEMINAR'],
            description:
              'Course category. Use LAB when student asks for "lab science" or "lab component". Use GENERAL_EDUCATION for gen-ed requirements.',
          },
          level: {
            type: 'number',
            description:
              'Course level group. Pass 100 for 100-level courses, 200, 300, or 400. Returns all courses in that hundred-range (e.g., 300 returns 300–399).',
          },
          semester: {
            type: 'string',
            enum: ['Fall', 'Spring', 'Summer'],
            description:
              'Filter to courses offered in a specific semester. Use when student specifies a particular term.',
          },
          degreeProfileId: {
            type: 'string',
            description:
              "Student's degree profile ID (from get_student_degree_profiles). When provided, each result includes a fulfillsDegreeRequirement flag showing whether the course satisfies an unfulfilled requirement.",
          },
          limit: {
            type: 'number',
            description:
              'Maximum results to return. Defaults to 10. Maximum 20. Use a smaller number if you want to highlight the top picks.',
          },
        },
        required: ['query'],
      },

      handler: async (
        input: Record<string, unknown>,
        ctx: AgentContext,
      ): Promise<unknown> => {
        const query = (input.query as string) ?? '';
        const minCredits = input.minCredits as number | undefined;
        const maxCredits = input.maxCredits as number | undefined;
        const category = input.category as string | undefined;
        const level = input.level as number | undefined;
        const semester = input.semester as string | undefined;
        const degreeProfileId = input.degreeProfileId as string | undefined;
        const limit = Math.min((input.limit as number | undefined) ?? 10, 20);

        // Build catalog search query
        const qb = courseRepo
          .createQueryBuilder('course')
          .where('course.tenantId = :tenantId', { tenantId: ctx.tenantId });

        // Full-text search: code, title, description
        if (query.trim()) {
          const term = `%${query.trim().toLowerCase()}%`;
          qb.andWhere(
            '(LOWER(course.code) LIKE :term OR LOWER(course.title) LIKE :term OR LOWER(course.description) LIKE :term)',
            { term },
          );
        }

        // Credit filters
        if (minCredits !== undefined) {
          qb.andWhere('course.credits >= :minCredits', { minCredits });
        }
        if (maxCredits !== undefined) {
          qb.andWhere('course.credits <= :maxCredits', { maxCredits });
        }

        // Category filter
        if (category) {
          qb.andWhere('course.category = :category', { category });
        }

        // Level filter: level=300 → courseLevel 300–399
        if (level !== undefined) {
          qb.andWhere(
            'course.courseLevel >= :levelMin AND course.courseLevel < :levelMax',
            { levelMin: level, levelMax: level + 100 },
          );
        }

        // Semester availability (JSONB array contains)
        if (semester) {
          qb.andWhere(`course."offeredSemesters" @> :semester::jsonb`, {
            semester: JSON.stringify([semester]),
          });
        }

        qb.orderBy('course.code', 'ASC').take(limit);

        const courses = await qb.getMany();

        if (courses.length === 0) {
          return {
            results: [],
            totalFound: 0,
            message:
              'No courses matched your criteria. Try broadening the search — fewer filters, shorter keywords, or a different category.',
          };
        }

        // Get section counts + availability for each matched course
        const courseIds = courses.map((c) => c.id);
        const sectionCounts = await sectionRepo
          .createQueryBuilder('section')
          .select('section.courseId', 'courseId')
          .addSelect('COUNT(section.id)', 'sectionCount')
          .where('section.courseId IN (:...courseIds)', { courseIds })
          .andWhere('section.tenantId = :tenantId', {
            tenantId: ctx.tenantId,
          })
          .groupBy('section.courseId')
          .getRawMany<{ courseId: string; sectionCount: string }>();

        const sectionCountMap = new Map(
          sectionCounts.map((row) => [
            row.courseId,
            parseInt(row.sectionCount, 10),
          ]),
        );

        // Cross-reference with degree requirements if profile provided
        let eligibleCourseIds = new Set<string>();
        if (degreeProfileId) {
          try {
            const eligible = await plannerService.findEligibleCourses(
              degreeProfileId,
              ctx.tenantId,
            );
            eligibleCourseIds = new Set(eligible.map((e) => e.id));
          } catch {
            // Profile not found or error — skip requirement cross-reference silently
          }
        }

        const results = courses.map((course) => ({
          id: course.id,
          code: course.code,
          title: course.title,
          credits: course.credits,
          category: course.category,
          level: course.courseLevel,
          description: course.description
            ? course.description.length > 220
              ? course.description.slice(0, 220) + '…'
              : course.description
            : null,
          offeredSemesters: course.offeredSemesters ?? [],
          sectionsAvailable: sectionCountMap.get(course.id) ?? 0,
          // null means "not checked" (no profile provided), true/false = checked
          fulfillsDegreeRequirement: degreeProfileId
            ? eligibleCourseIds.has(course.id)
            : null,
        }));

        return {
          results,
          totalFound: courses.length,
          searchNote: degreeProfileId
            ? "fulfillsDegreeRequirement=true means this course satisfies at least one unfulfilled requirement in the student's degree program."
            : 'To check which results count toward a degree requirement, pass degreeProfileId from get_student_degree_profiles.',
        };
      },

      requiredPermissions: [],
      actionType: 'auto',
    },
  ];
}
