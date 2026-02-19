// Entity exports
export { Tenant, SubscriptionPlan, BillingStatus } from './tenant.entity';
export { User, UserRole, UserStatus } from './user.entity';
export { AcademicTerm } from './academic-term.entity';
export { Course, CourseCategory } from './course.entity';
export {
  CourseSection,
  SectionStatus,
  EnrollmentMode,
} from './course-section.entity';
export {
  Enrollment,
  EnrollmentRole,
  EnrollmentStatus,
} from './enrollment.entity';
export { Assignment, AssignmentType } from './assignment.entity';
export { Submission } from './submission.entity';
export { Announcement, AnnouncementPriority } from './announcement.entity';
export {
  DegreeProgram,
  DegreeProgramType,
  DegreeProgramStatus,
} from './degree-program.entity';
export {
  StudentDegreeProfile,
  DegreeProfileStatus,
} from './student-degree-profile.entity';

// Import entities for TypeORM
import { Tenant } from './tenant.entity';
import { User } from './user.entity';
import { AcademicTerm } from './academic-term.entity';
import { Course } from './course.entity';
import { CourseSection } from './course-section.entity';
import { Enrollment } from './enrollment.entity';
import { Assignment } from './assignment.entity';
import { Submission } from './submission.entity';
import { Announcement } from './announcement.entity';

// AI entities
import { AiConversation } from '../../modules/ai/entities/ai-conversation.entity';
import { AiMessage } from '../../modules/ai/entities/ai-message.entity';
import { AiUsageLog } from '../../modules/ai/entities/ai-usage-log.entity';
import { TenantAiConfig } from '../../modules/ai/entities/tenant-ai-config.entity';
import { CustomAgent } from '../../modules/ai/entities/custom-agent.entity';

// Content entities
import { CourseContent } from '../../modules/content/course-content.entity';

// Messaging entities
import { Conversation } from '../../modules/messaging/entities/conversation.entity';
import { ConversationParticipant } from '../../modules/messaging/entities/conversation-participant.entity';
import { DirectMessage } from '../../modules/messaging/entities/direct-message.entity';

// Degree/planner entities
import { DegreeProgram } from './degree-program.entity';
import { StudentDegreeProfile } from './student-degree-profile.entity';
import { GraduationPlan } from '../../modules/planner/entities/graduation-plan.entity';

// LTI entities
import { LtiPlatform } from '../../modules/lti/entities/lti-platform.entity';
import { LtiDeployment } from '../../modules/lti/entities/lti-deployment.entity';
import { LtiContext } from '../../modules/lti/entities/lti-context.entity';
import { LtiUser } from '../../modules/lti/entities/lti-user.entity';
import { LtiState } from '../../modules/lti/entities/lti-state.entity';

// Feed engagement entity
import { FeedEngagement } from '../../modules/feed/entities/feed-engagement.entity';

// Array of entity classes for TypeORM
export const entities = [
  Tenant,
  User,
  AcademicTerm,
  Course,
  CourseSection,
  Enrollment,
  Assignment,
  Submission,
  Announcement,
  AiConversation,
  AiMessage,
  AiUsageLog,
  TenantAiConfig,
  CustomAgent,
  CourseContent,
  Conversation,
  ConversationParticipant,
  DirectMessage,
  LtiPlatform,
  LtiDeployment,
  LtiContext,
  LtiUser,
  LtiState,
  DegreeProgram,
  StudentDegreeProfile,
  GraduationPlan,
  FeedEngagement,
];
