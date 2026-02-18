import { ToolDefinition } from './tool.interface';
import { CoursesService } from '../../courses/courses.service';

/**
 * Enrollment tools — wraps enrollment-related CoursesService methods.
 *
 * Two groups of tools:
 *   Admin/instructor tools (take explicit userId):
 *     - get_student_enrollments, enroll_student
 *
 *   Student self-service tools (ENROLL-005, use ctx.userId):
 *     - check_enrollment_status, enroll_in_course
 *
 * WHY separate self-service tools: The admin tools expose userId as an input,
 * which is appropriate for instructors looking up a specific student. Student-
 * facing tools should derive the userId from the authenticated context so a
 * student can never query or enroll on behalf of another user.
 */
export function createEnrollmentTools(
  coursesService: CoursesService,
): ToolDefinition[] {
  return [
    // ─── Admin / instructor tools ──────────────────────────────────────────

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
      handler: async (input, ctx) => {
        const enrollments = await coursesService.findEnrollmentsForUser(
          input.userId as string,
          ctx.tenantId,
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
      handler: async (input, ctx) => {
        const enrollment = await coursesService.enrollStudent(
          ctx.tenantId,
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

    // ─── ENROLL-005: Student self-service tools ────────────────────────────

    /**
     * check_enrollment_status — student checks their own enrollments.
     *
     * WHY separate from get_student_enrollments: This tool uses ctx.userId so
     * a student can never pass an arbitrary userId to see another student's
     * data. The optional courseCode filter lets the AI answer targeted
     * questions like "Am I enrolled in CS201?"
     */
    {
      name: 'check_enrollment_status',
      description:
        "Check the current student's enrollment status across all their courses. Optionally filter by course code to check a specific course. Returns status (active, pending, dropped, withdrawn, rejected, waitlisted), section, and grade.",
      inputSchema: {
        type: 'object',
        properties: {
          courseCode: {
            type: 'string',
            description:
              'Optional. Filter results to courses matching this code (e.g. "CS101"). Case-insensitive partial match. Omit to return all enrollments.',
          },
        },
        required: [],
      },
      handler: async (input, ctx) => {
        const enrollments = await coursesService.findEnrollmentsForUser(
          ctx.userId,
          ctx.tenantId,
        );

        const filterCode = input.courseCode
          ? (input.courseCode as string).toLowerCase()
          : null;

        const mapped = enrollments
          .filter((e) => {
            if (!filterCode) return true;
            const code = (e.section?.course?.code ?? '').toLowerCase();
            return code.includes(filterCode);
          })
          .map((e) => ({
            enrollmentId: e.id,
            courseCode: e.section?.course?.code ?? 'Unknown',
            courseTitle: e.section?.course?.title ?? 'Unknown',
            sectionId: e.sectionId,
            status: e.status,
            role: e.role,
            enrolledAt: e.enrolledAt?.toISOString(),
            finalGrade: e.finalGrade ?? null,
          }));

        return { count: mapped.length, enrollments: mapped };
      },
      requiredPermissions: ['enrollments.read'],
      actionType: 'auto',
    },

    /**
     * enroll_in_course — student self-enrolls.
     *
     * WHY actionType = suggest: Enrollment is consequential — it affects the
     * student's schedule and may trigger approval workflows. Governance
     * presents the proposed action to the student for explicit confirmation
     * before the tool handler executes.
     *
     * The handler wraps enrollStudent() errors in a structured response so the
     * AI can translate them into natural language (e.g. "that section is full",
     * "an invite code is required").
     */
    {
      name: 'enroll_in_course',
      description:
        'Enroll the current student in a course section using their own account. Before calling this tool, use get_course_sections to find available sections and get_eligible_courses to verify prerequisites are met. Validates seat availability, enrollment mode, and duplicate enrollments. Always requires student confirmation before executing.',
      inputSchema: {
        type: 'object',
        properties: {
          sectionId: {
            type: 'string',
            description: 'The UUID of the course section to enroll in.',
          },
          inviteCode: {
            type: 'string',
            description:
              'Required only if the section enrollment mode is invite_only. Ask the student for this code if needed.',
          },
        },
        required: ['sectionId'],
      },
      handler: async (input, ctx) => {
        try {
          const enrollment = await coursesService.enrollStudent(
            ctx.tenantId,
            ctx.userId,
            input.sectionId as string,
            input.inviteCode as string | undefined,
          );

          const isActive = enrollment.status === 'active';
          return {
            success: true,
            enrollmentId: enrollment.id,
            status: enrollment.status,
            message: isActive
              ? 'Enrollment confirmed. You are now actively enrolled in this course.'
              : 'Enrollment submitted and is awaiting instructor approval. You will be notified once approved.',
          };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Enrollment failed.';
          return {
            success: false,
            error: message,
          };
        }
      },
      requiredPermissions: ['enrollments.write'],
      actionType: 'suggest',
    },
  ];
}
