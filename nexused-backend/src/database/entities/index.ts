// Entity exports
export { Tenant, SubscriptionPlan, BillingStatus } from './tenant.entity';
export { User, UserRole, UserStatus } from './user.entity';
export { AcademicTerm } from './academic-term.entity';
export { Course } from './course.entity';
export { CourseSection, SectionStatus } from './course-section.entity';
export {
  Enrollment,
  EnrollmentRole,
  EnrollmentStatus,
} from './enrollment.entity';
export { Assignment, AssignmentType } from './assignment.entity';
export { Submission } from './submission.entity';
export { Announcement, AnnouncementPriority } from './announcement.entity';

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

// Content entities
import { CourseContent } from '../../modules/content/course-content.entity';

// Messaging entities
import { Conversation } from '../../modules/messaging/entities/conversation.entity';
import { ConversationParticipant } from '../../modules/messaging/entities/conversation-participant.entity';
import { DirectMessage } from '../../modules/messaging/entities/direct-message.entity';

// LTI entities
import { LtiPlatform } from '../../modules/lti/entities/lti-platform.entity';
import { LtiDeployment } from '../../modules/lti/entities/lti-deployment.entity';
import { LtiContext } from '../../modules/lti/entities/lti-context.entity';
import { LtiUser } from '../../modules/lti/entities/lti-user.entity';
import { LtiState } from '../../modules/lti/entities/lti-state.entity';

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
  CourseContent,
  Conversation,
  ConversationParticipant,
  DirectMessage,
  LtiPlatform,
  LtiDeployment,
  LtiContext,
  LtiUser,
  LtiState,
];
