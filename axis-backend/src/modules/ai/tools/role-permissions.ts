import { UserRole } from '../../../database/entities/user.entity';

/**
 * SEC-005: Role → permission grants for AI tool execution.
 *
 * WHY: Every ToolDefinition declares `requiredPermissions` (e.g.
 * ['grading.write']), but until this map existed nothing read them — the
 * strings were dead weight pretending to be an ACL. GovernanceService now
 * intersects the caller's roles against the tool's requirements and blocks
 * execution when any required permission is missing.
 *
 * PATTERN: Deny-by-default. A permission string that appears in a tool but
 * not in any role's grant set is unreachable by everyone except via an
 * explicit grant added here. Multi-role users get the union of their roles'
 * grants.
 *
 * Keep this vocabulary in sync with the `requiredPermissions` arrays in
 * `tools/*.tools.ts` — grep for `requiredPermissions:` when adding a tool.
 */
export const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<string>> = {
  [UserRole.STUDENT]: new Set([
    'courses.read',
    'assignments.read',
    // Students read their own submissions through tools that already
    // scope by ctx.userId; resource-level filtering happens in the handler.
    'submissions.read',
    'enrollments.read',
    // ENROLL-005: students self-enroll via the Course Planner agent
    // (governed as 'suggest' — requires in-chat confirmation).
    'enrollments.write',
    'planner.read',
    // GRAD-001/002: students generate and regenerate their own grad plans.
    'planner.write',
    // FEAT-018: students discover and book office hours (book is governed as
    // 'suggest' — the AI proposes, the student confirms).
    'office_hours.read',
    'office_hours.write',
  ]),
  [UserRole.TA]: new Set([
    'courses.read',
    'assignments.read',
    'submissions.read',
    'enrollments.read',
    'planner.read',
    // Feedback Copilot targets TAs — they draft feedback and grades.
    'grading.write',
    // FEAT-018: TAs book office hours like students.
    'office_hours.read',
    'office_hours.write',
  ]),
  [UserRole.INSTRUCTOR]: new Set([
    'courses.read',
    'assignments.read',
    'submissions.read',
    'enrollments.read',
    'enrollments.write',
    'grading.write',
    'analytics.read',
    'planner.read',
    // FEAT-018: instructors read office-hours availability (they manage blocks
    // through GraphQL, not through AI tools).
    'office_hours.read',
  ]),
  [UserRole.ADMIN]: new Set([
    'courses.read',
    'courses.delete',
    'assignments.read',
    'submissions.read',
    'enrollments.read',
    'enrollments.write',
    'grading.write',
    'analytics.read',
    'planner.read',
    'planner.write',
    'office_hours.read',
  ]),
  [UserRole.PARENT]: new Set([
    // Parents observe; they never write through AI tools.
    'courses.read',
    'assignments.read',
    'enrollments.read',
  ]),
};

/**
 * Returns the subset of `required` permissions that none of the caller's
 * roles grant. Empty array ⇒ the call is permitted.
 *
 * Unknown role strings grant nothing (deny-by-default), so a malformed JWT
 * role claim can never widen access.
 */
export function missingPermissions(
  roles: string[],
  required: string[],
): string[] {
  if (required.length === 0) return [];

  const granted = new Set<string>();
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role as UserRole];
    if (perms) {
      for (const p of perms) granted.add(p);
    }
  }
  return required.filter((p) => !granted.has(p));
}
