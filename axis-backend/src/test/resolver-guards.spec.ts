/**
 * Resolver Guard Wiring Tests
 *
 * WHY: Guards applied via decorators are invisible to TypeScript's type system.
 * A refactor can silently strip @UseGuards() and every existing unit test keeps
 * passing — only these metadata-inspection tests will catch the regression.
 *
 * PATTERN: Reflect.getMetadata reads NestJS decorator metadata without
 * spinning up a full application or injecting any dependencies.
 * - '__guards__' is the NestJS internal key for @UseGuards()
 * - 'roles' is the SetMetadata key used by our @Roles() decorator
 *
 * Each test is a 3-line contract: "this class/method must have this guard/role."
 */

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { UserRole } from '../database/entities/user.entity';

// ─── Resolvers ────────────────────────────────────────────────────────────────
import { AiResolver } from '../modules/ai/ai.resolver';
import { GovernanceResolver } from '../modules/ai/governance.resolver';
import { CustomAgentResolver } from '../modules/ai/custom-agent.resolver';
import { AcademicTermsResolver } from '../modules/academic-terms/academic-terms.resolver';
import { AnalyticsResolver } from '../modules/analytics/analytics.resolver';
import { AnnouncementsResolver } from '../modules/announcements/announcements.resolver';
import { AssignmentsResolver } from '../modules/assignments/assignments.resolver';
import { CatalogExtractResolver } from '../modules/catalog-extract/catalog-extract.resolver';
import { ContentResolver } from '../modules/content/content.resolver';
import { AdminCoursesResolver } from '../modules/courses/admin-courses.resolver';
import { CoursesResolver } from '../modules/courses/courses.resolver';
import { StudentCatalogResolver } from '../modules/courses/student-catalog.resolver';
import { DiscussionsResolver } from '../modules/discussions/discussions.resolver';
import { FeedResolver } from '../modules/feed/feed.resolver';
import { LtiResolver } from '../modules/lti/lti.resolver';
import { MessagingResolver } from '../modules/messaging/messaging.resolver';
import { NotificationsResolver } from '../modules/notifications/notifications.resolver';
import { CareerResolver } from '../modules/planner/career.resolver';
import { FinancialProjectionResolver } from '../modules/planner/financial-projection.resolver';
import { GraduationPlannerResolver } from '../modules/planner/graduation-planner.resolver';
import { PlannerResolver } from '../modules/planner/planner.resolver';
import { QuizResolver } from '../modules/quiz/quiz.resolver';
import { TenantResolver } from '../tenant/tenant.resolver';
import { UploadsResolver } from '../modules/uploads/uploads.resolver';
import { AdminUsersResolver } from '../modules/users/admin-users.resolver';
import { UsersResolver } from '../modules/users/users.resolver';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GUARDS = '__guards__';
const ROLES = 'roles';

// Generic class constructor — matches any decorated NestJS resolver class.
type Ctor = new (...args: never[]) => unknown;
// Generic method on the prototype.
type Method = (...args: never[]) => unknown;

function classGuards(target: Ctor): Method[] {
  return (Reflect.getMetadata(GUARDS, target) as Method[]) ?? [];
}

// NestJS stores method-level decorator metadata on descriptor.value (the
// function itself), NOT on (prototype, key). Use prototype[method] to get the
// actual function reference so Reflect.getMetadata finds the right target.

function methodGuards(target: Ctor, method: string): Method[] {
  const fn = (target.prototype as Record<string, Method>)[method];
  return (Reflect.getMetadata(GUARDS, fn) as Method[]) ?? [];
}

function classRoles(target: Ctor): UserRole[] {
  return (Reflect.getMetadata(ROLES, target) as UserRole[]) ?? [];
}

function methodRoles(target: Ctor, method: string): UserRole[] {
  const fn = (target.prototype as Record<string, Method>)[method];
  return (Reflect.getMetadata(ROLES, fn) as UserRole[]) ?? [];
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// ─── AI Module ────────────────────────────────────────────────────────────────

describe('AiResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(AiResolver)).toContain(JwtAuthGuard);
  });
});

describe('GovernanceResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(GovernanceResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('requires ADMIN role on aiGovernanceConfig', () => {
    expect(methodRoles(GovernanceResolver, 'aiGovernanceConfig')).toContain(
      UserRole.ADMIN,
    );
  });

  it('requires ADMIN role on aiAuditLogs', () => {
    expect(methodRoles(GovernanceResolver, 'aiAuditLogs')).toContain(
      UserRole.ADMIN,
    );
  });
});

describe('CustomAgentResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(CustomAgentResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('requires INSTRUCTOR|ADMIN on customAgents', () => {
    const roles = methodRoles(CustomAgentResolver, 'customAgents');
    expect(roles).toContain(UserRole.INSTRUCTOR);
    expect(roles).toContain(UserRole.ADMIN);
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────

describe('UsersResolver', () => {
  it('protects me query with JwtAuthGuard', () => {
    expect(methodGuards(UsersResolver, 'me')).toContain(JwtAuthGuard);
  });

  it('protects updateProfile mutation with JwtAuthGuard', () => {
    expect(methodGuards(UsersResolver, 'updateProfile')).toContain(
      JwtAuthGuard,
    );
  });
});

describe('AdminUsersResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(AdminUsersResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('requires ADMIN role at class level', () => {
    expect(classRoles(AdminUsersResolver)).toContain(UserRole.ADMIN);
  });
});

// ─── Courses ──────────────────────────────────────────────────────────────────

describe('CoursesResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(CoursesResolver)).toContain(JwtAuthGuard);
  });

  it('protects sectionEnrollments with RolesGuard', () => {
    expect(methodGuards(CoursesResolver, 'sectionEnrollments')).toContain(
      RolesGuard,
    );
  });

  it('requires INSTRUCTOR|ADMIN|TA on sectionEnrollments', () => {
    const roles = methodRoles(CoursesResolver, 'sectionEnrollments');
    expect(roles).toContain(UserRole.INSTRUCTOR);
    expect(roles).toContain(UserRole.ADMIN);
    expect(roles).toContain(UserRole.TA);
  });

  it('protects createCourse with RolesGuard', () => {
    expect(methodGuards(CoursesResolver, 'createCourse')).toContain(RolesGuard);
  });

  it('protects createSection with RolesGuard', () => {
    expect(methodGuards(CoursesResolver, 'createSection')).toContain(
      RolesGuard,
    );
  });

  it('protects approveEnrollment with RolesGuard', () => {
    expect(methodGuards(CoursesResolver, 'approveEnrollment')).toContain(
      RolesGuard,
    );
  });

  it('protects rejectEnrollment with RolesGuard', () => {
    expect(methodGuards(CoursesResolver, 'rejectEnrollment')).toContain(
      RolesGuard,
    );
  });

  it('protects pendingEnrollments with RolesGuard', () => {
    expect(methodGuards(CoursesResolver, 'pendingEnrollments')).toContain(
      RolesGuard,
    );
  });

  it('protects generateInviteCode with RolesGuard', () => {
    expect(methodGuards(CoursesResolver, 'generateInviteCode')).toContain(
      RolesGuard,
    );
  });
});

describe('AdminCoursesResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(AdminCoursesResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('requires ADMIN role at class level', () => {
    expect(classRoles(AdminCoursesResolver)).toContain(UserRole.ADMIN);
  });
});

describe('StudentCatalogResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(StudentCatalogResolver)).toContain(JwtAuthGuard);
  });
});

// ─── Assignments ──────────────────────────────────────────────────────────────

describe('AssignmentsResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(AssignmentsResolver)).toContain(JwtAuthGuard);
  });

  it('protects assignmentSubmissions with RolesGuard', () => {
    expect(
      methodGuards(AssignmentsResolver, 'assignmentSubmissions'),
    ).toContain(RolesGuard);
  });

  it('requires INSTRUCTOR|TA|ADMIN on assignmentSubmissions', () => {
    const roles = methodRoles(AssignmentsResolver, 'assignmentSubmissions');
    expect(roles).toContain(UserRole.INSTRUCTOR);
    expect(roles).toContain(UserRole.TA);
    expect(roles).toContain(UserRole.ADMIN);
  });

  it('protects sectionGradebook with RolesGuard', () => {
    expect(methodGuards(AssignmentsResolver, 'sectionGradebook')).toContain(
      RolesGuard,
    );
  });

  it('protects createAssignment with RolesGuard', () => {
    expect(methodGuards(AssignmentsResolver, 'createAssignment')).toContain(
      RolesGuard,
    );
  });

  it('requires INSTRUCTOR|ADMIN on createAssignment', () => {
    const roles = methodRoles(AssignmentsResolver, 'createAssignment');
    expect(roles).toContain(UserRole.INSTRUCTOR);
    expect(roles).toContain(UserRole.ADMIN);
  });

  it('protects gradeSubmission with RolesGuard', () => {
    expect(methodGuards(AssignmentsResolver, 'gradeSubmission')).toContain(
      RolesGuard,
    );
  });
});

// ─── Feed ─────────────────────────────────────────────────────────────────────

describe('FeedResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(FeedResolver)).toContain(JwtAuthGuard);
  });

  it('protects feedEngagementStats with RolesGuard', () => {
    expect(methodGuards(FeedResolver, 'feedEngagementStats')).toContain(
      RolesGuard,
    );
  });

  it('requires ADMIN on feedEngagementStats', () => {
    expect(methodRoles(FeedResolver, 'feedEngagementStats')).toContain(
      UserRole.ADMIN,
    );
  });
});

// ─── Announcements ────────────────────────────────────────────────────────────

describe('AnnouncementsResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(AnnouncementsResolver)).toContain(JwtAuthGuard);
  });

  it('protects createAnnouncement with RolesGuard', () => {
    expect(methodGuards(AnnouncementsResolver, 'createAnnouncement')).toContain(
      RolesGuard,
    );
  });

  it('requires INSTRUCTOR|ADMIN on createAnnouncement', () => {
    const roles = methodRoles(AnnouncementsResolver, 'createAnnouncement');
    expect(roles).toContain(UserRole.INSTRUCTOR);
    expect(roles).toContain(UserRole.ADMIN);
  });
});

// ─── Discussions ──────────────────────────────────────────────────────────────

describe('DiscussionsResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(DiscussionsResolver)).toContain(JwtAuthGuard);
  });

  it('protects pinDiscussion with RolesGuard', () => {
    expect(methodGuards(DiscussionsResolver, 'pinDiscussion')).toContain(
      RolesGuard,
    );
  });

  it('protects lockDiscussion with RolesGuard', () => {
    expect(methodGuards(DiscussionsResolver, 'lockDiscussion')).toContain(
      RolesGuard,
    );
  });

  it('protects markDiscussionAnswered with RolesGuard', () => {
    expect(
      methodGuards(DiscussionsResolver, 'markDiscussionAnswered'),
    ).toContain(RolesGuard);
  });

  it('requires INSTRUCTOR|ADMIN on pinDiscussion', () => {
    const roles = methodRoles(DiscussionsResolver, 'pinDiscussion');
    expect(roles).toContain(UserRole.INSTRUCTOR);
    expect(roles).toContain(UserRole.ADMIN);
  });
});

// ─── Messaging / Notifications / Uploads ─────────────────────────────────────

describe('MessagingResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(MessagingResolver)).toContain(JwtAuthGuard);
  });
});

describe('NotificationsResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(NotificationsResolver)).toContain(JwtAuthGuard);
  });
});

describe('UploadsResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(UploadsResolver)).toContain(JwtAuthGuard);
  });
});

// ─── Content ──────────────────────────────────────────────────────────────────

describe('ContentResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(ContentResolver)).toContain(JwtAuthGuard);
  });

  it('protects createContent with RolesGuard', () => {
    expect(methodGuards(ContentResolver, 'createContent')).toContain(
      RolesGuard,
    );
  });

  it('protects publishContent with RolesGuard', () => {
    expect(methodGuards(ContentResolver, 'publishContent')).toContain(
      RolesGuard,
    );
  });

  it('protects deleteContent with RolesGuard', () => {
    expect(methodGuards(ContentResolver, 'deleteContent')).toContain(
      RolesGuard,
    );
  });

  it('requires INSTRUCTOR|ADMIN on createContent', () => {
    const roles = methodRoles(ContentResolver, 'createContent');
    expect(roles).toContain(UserRole.INSTRUCTOR);
    expect(roles).toContain(UserRole.ADMIN);
  });
});

// ─── Quiz ─────────────────────────────────────────────────────────────────────

describe('QuizResolver', () => {
  it('is protected by JwtAuthGuard at class level', () => {
    expect(classGuards(QuizResolver)).toContain(JwtAuthGuard);
  });

  it('protects addQuizQuestion with RolesGuard', () => {
    expect(methodGuards(QuizResolver, 'addQuizQuestion')).toContain(RolesGuard);
  });

  it('protects updateQuizSettings with RolesGuard', () => {
    expect(methodGuards(QuizResolver, 'updateQuizSettings')).toContain(
      RolesGuard,
    );
  });

  it('requires INSTRUCTOR|ADMIN on addQuizQuestion', () => {
    const roles = methodRoles(QuizResolver, 'addQuizQuestion');
    expect(roles).toContain(UserRole.INSTRUCTOR);
    expect(roles).toContain(UserRole.ADMIN);
  });
});

// ─── Analytics ────────────────────────────────────────────────────────────────

describe('AnalyticsResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(AnalyticsResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });
});

// ─── Planner / Graduation ─────────────────────────────────────────────────────

describe('PlannerResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(PlannerResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });
});

describe('GraduationPlannerResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(GraduationPlannerResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('requires STUDENT|ADMIN on generateGraduationPlan', () => {
    const roles = methodRoles(
      GraduationPlannerResolver,
      'generateGraduationPlan',
    );
    expect(roles).toContain(UserRole.STUDENT);
    expect(roles).toContain(UserRole.ADMIN);
  });

  it('requires STUDENT|ADMIN on myGraduationPlans', () => {
    const roles = methodRoles(GraduationPlannerResolver, 'myGraduationPlans');
    expect(roles).toContain(UserRole.STUDENT);
    expect(roles).toContain(UserRole.ADMIN);
  });
});

describe('CareerResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(CareerResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });
});

describe('FinancialProjectionResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(FinancialProjectionResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });
});

// ─── Infrastructure ───────────────────────────────────────────────────────────

describe('AcademicTermsResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(AcademicTermsResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('requires ADMIN role at class level', () => {
    expect(classRoles(AcademicTermsResolver)).toContain(UserRole.ADMIN);
  });
});

describe('LtiResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(LtiResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('requires ADMIN on ltiPlatforms', () => {
    expect(methodRoles(LtiResolver, 'ltiPlatforms')).toContain(UserRole.ADMIN);
  });

  it('requires ADMIN on ltiToolConfiguration', () => {
    expect(methodRoles(LtiResolver, 'ltiToolConfiguration')).toContain(
      UserRole.ADMIN,
    );
  });
});

describe('CatalogExtractResolver', () => {
  it('is protected by JwtAuthGuard + RolesGuard at class level', () => {
    const guards = classGuards(CatalogExtractResolver);
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('requires ADMIN role at class level', () => {
    expect(classRoles(CatalogExtractResolver)).toContain(UserRole.ADMIN);
  });
});

describe('TenantResolver', () => {
  it('protects createTenant with JwtAuthGuard + RolesGuard', () => {
    const guards = methodGuards(TenantResolver, 'createTenant');
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('requires ADMIN role on createTenant', () => {
    expect(methodRoles(TenantResolver, 'createTenant')).toContain(
      UserRole.ADMIN,
    );
  });

  it('protects tenants query with JwtAuthGuard', () => {
    expect(methodGuards(TenantResolver, 'tenants')).toContain(JwtAuthGuard);
  });

  it('protects enrollmentPolicy with JwtAuthGuard + RolesGuard', () => {
    const guards = methodGuards(TenantResolver, 'enrollmentPolicy');
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(RolesGuard);
  });

  it('requires ADMIN on enrollmentPolicy', () => {
    expect(methodRoles(TenantResolver, 'enrollmentPolicy')).toContain(
      UserRole.ADMIN,
    );
  });
});
