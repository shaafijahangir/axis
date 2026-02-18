/**
 * Typed event definitions for the NexusEd event system.
 *
 * WHY typed events: NestJS EventEmitter2 uses string event names by default,
 * which is error-prone. These constants + interfaces ensure type safety
 * at both emit and listen sites.
 *
 * PATTERN: Event-carried state transfer — each event includes all the data
 * a listener needs to react, avoiding extra database lookups.
 */

// ─── Event Name Constants ────────────────────────────────────────────────

export const NexusEvents = {
  // Course lifecycle
  COURSE_CREATED: 'course.created',
  COURSE_UPDATED: 'course.updated',

  // Section lifecycle
  SECTION_CREATED: 'section.created',

  // Enrollment lifecycle
  ENROLLMENT_CREATED: 'enrollment.created',
  ENROLLMENT_DROPPED: 'enrollment.dropped',
  ENROLLMENT_WITHDRAWN: 'enrollment.withdrawn',

  // Assignment lifecycle
  ASSIGNMENT_CREATED: 'assignment.created',

  // Submission lifecycle
  SUBMISSION_CREATED: 'submission.created',
  SUBMISSION_GRADED: 'submission.graded',

  // Grade changes
  GRADE_UPDATED: 'grade.updated',

  // AI-specific events
  AI_CONVERSATION_STARTED: 'ai.conversation.started',
  AI_TOOL_INVOKED: 'ai.tool.invoked',
} as const;

// ─── Event Payload Interfaces ────────────────────────────────────────────

export interface CourseCreatedEvent {
  courseId: string;
  tenantId: string;
  createdBy: string;
  title: string;
  code: string;
}

export interface CourseUpdatedEvent {
  courseId: string;
  tenantId: string;
  updatedBy: string;
}

export interface SectionCreatedEvent {
  sectionId: string;
  courseId: string;
  tenantId: string;
  instructorId: string;
}

export interface EnrollmentCreatedEvent {
  enrollmentId: string;
  userId: string;
  sectionId: string;
  tenantId: string;
}

export interface EnrollmentDroppedEvent {
  enrollmentId: string;
  userId: string;
  sectionId: string;
  tenantId: string;
}

export interface EnrollmentWithdrawnEvent {
  enrollmentId: string;
  userId: string;
  sectionId: string;
  tenantId: string;
}

export interface AssignmentCreatedEvent {
  assignmentId: string;
  sectionId: string;
  tenantId: string;
  title: string;
}

export interface SubmissionCreatedEvent {
  submissionId: string;
  assignmentId: string;
  userId: string;
  tenantId: string;
}

export interface SubmissionGradedEvent {
  submissionId: string;
  gradedBy: string;
  score: number;
  tenantId: string;
}

export interface GradeUpdatedEvent {
  submissionId: string;
  oldScore: number | null;
  newScore: number;
  tenantId: string;
}

export interface AiConversationStartedEvent {
  conversationId: string;
  agentType: string;
  userId: string;
  tenantId: string;
}

export interface AiToolInvokedEvent {
  toolName: string;
  agentType: string;
  input: Record<string, unknown>;
  success: boolean;
  tenantId: string;
}
