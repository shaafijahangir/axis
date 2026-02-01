import { ToolDefinition } from './tool.interface';
import { CoursesService } from '../../courses/courses.service';

/**
 * Course and section tools — wraps CoursesService methods as AI-callable tools.
 *
 * WHY factory function: Tools need a reference to the injected CoursesService.
 * NestJS creates the service, then we call this factory to build tool definitions
 * that close over it.
 *
 * PATTERN: Factory + Closure — the service instance is captured at registration time.
 */
export function createCourseTools(
  coursesService: CoursesService,
): ToolDefinition[] {
  return [
    {
      name: 'list_courses',
      description:
        'List all courses for the current tenant. Returns course code, title, description, and credits.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async (_input, ctx) => {
        const courses = await coursesService.findAllForTenant(ctx.tenantId);
        return courses.map((c) => ({
          id: c.id,
          code: c.code,
          title: c.title,
          description: c.description,
          credits: c.credits,
        }));
      },
      requiredPermissions: ['courses.read'],
      actionType: 'auto',
    },
    {
      name: 'get_course',
      description:
        'Get detailed information about a specific course by its ID.',
      inputSchema: {
        type: 'object',
        properties: {
          courseId: {
            type: 'string',
            description: 'The UUID of the course',
          },
        },
        required: ['courseId'],
      },
      handler: async (input, _ctx) => {
        const course = await coursesService.findById(input.courseId as string);
        return {
          id: course.id,
          code: course.code,
          title: course.title,
          description: course.description,
          credits: course.credits,
          prerequisites: course.prerequisites,
          settings: course.settings,
        };
      },
      requiredPermissions: ['courses.read'],
      actionType: 'auto',
    },
    {
      name: 'get_course_sections',
      description:
        'List all sections for a specific course. Includes instructor info, schedule, location, and capacity.',
      inputSchema: {
        type: 'object',
        properties: {
          courseId: {
            type: 'string',
            description: 'The UUID of the course',
          },
        },
        required: ['courseId'],
      },
      handler: async (input, _ctx) => {
        const sections = await coursesService.findSectionsForCourse(
          input.courseId as string,
        );
        return sections.map((s) => ({
          id: s.id,
          courseId: s.courseId,
          instructorId: s.instructorId,
          schedule: s.schedule,
          location: s.location,
          capacity: s.capacity,
          status: s.status,
        }));
      },
      requiredPermissions: ['courses.read'],
      actionType: 'auto',
    },
    {
      name: 'get_section',
      description:
        'Get detailed information about a specific course section by its ID.',
      inputSchema: {
        type: 'object',
        properties: {
          sectionId: {
            type: 'string',
            description: 'The UUID of the section',
          },
        },
        required: ['sectionId'],
      },
      handler: async (input, _ctx) => {
        const section = await coursesService.findSectionById(
          input.sectionId as string,
        );
        return {
          id: section.id,
          courseId: section.courseId,
          instructorId: section.instructorId,
          schedule: section.schedule,
          location: section.location,
          capacity: section.capacity,
          status: section.status,
        };
      },
      requiredPermissions: ['courses.read'],
      actionType: 'auto',
    },
    {
      name: 'get_course_stats',
      description:
        'Get aggregate counts for courses, sections, and enrollments in the current tenant.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async (_input, ctx) => {
        const [courseCount, sectionCount, enrollmentCount] = await Promise.all([
          coursesService.countCourses(ctx.tenantId),
          coursesService.countSections(ctx.tenantId),
          coursesService.countEnrollments(ctx.tenantId),
        ]);
        return { courseCount, sectionCount, enrollmentCount };
      },
      requiredPermissions: ['courses.read'],
      actionType: 'auto',
    },
  ];
}
