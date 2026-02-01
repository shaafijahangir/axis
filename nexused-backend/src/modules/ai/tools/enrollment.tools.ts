import { ToolDefinition } from './tool.interface';
import { CoursesService } from '../../courses/courses.service';

/**
 * Enrollment tools — wraps enrollment-related CoursesService methods.
 */
export function createEnrollmentTools(
  coursesService: CoursesService,
): ToolDefinition[] {
  return [
    {
      name: 'get_student_enrollments',
      description:
        'Get all course enrollments for a specific student. Returns course title, section, status, and final grade.',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The UUID of the student user',
          },
        },
        required: ['userId'],
      },
      handler: async (input, _ctx) => {
        const enrollments = await coursesService.findEnrollmentsForUser(
          input.userId as string,
        );
        return enrollments.map((e) => ({
          id: e.id,
          sectionId: e.sectionId,
          courseTitle: e.section?.course?.title || 'Unknown',
          courseCode: e.section?.course?.code || 'Unknown',
          role: e.role,
          status: e.status,
          enrolledAt: e.enrolledAt?.toISOString(),
          finalGrade: e.finalGrade,
        }));
      },
      requiredPermissions: ['enrollments.read'],
      actionType: 'auto',
    },
    {
      name: 'enroll_student',
      description:
        'Enroll a student in a course section. Returns the enrollment record.',
      inputSchema: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'The UUID of the student to enroll',
          },
          sectionId: {
            type: 'string',
            description: 'The UUID of the course section',
          },
        },
        required: ['userId', 'sectionId'],
      },
      handler: async (input, _ctx) => {
        const enrollment = await coursesService.enrollStudent(
          input.userId as string,
          input.sectionId as string,
        );
        return {
          id: enrollment.id,
          userId: enrollment.userId,
          sectionId: enrollment.sectionId,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt?.toISOString(),
        };
      },
      requiredPermissions: ['enrollments.write'],
      // Suggest, not auto — enrollment should be confirmed by a human
      actionType: 'suggest',
    },
  ];
}
