/**
 * BullMQ queue contract for proactive AI reactions.
 *
 * WHY: The AI reaction handlers call the Anthropic API, which intermittently
 * returns 429 (rate limited) / 529 (overloaded) / 5xx. The old handlers were
 * fire-and-forget `async` methods: a transient API failure was logged and the
 * reaction silently dropped — the student never got their welcome, the
 * instructor never got the draft. Routing reactions through a durable queue
 * gives them automatic retry with backoff and survives a process restart.
 *
 * PATTERN: The event listener stays the fast, synchronous boundary — it only
 * enqueues. The processor owns the slow, fallible work (DB lookups + agent
 * execution) and is the unit BullMQ retries.
 */
export const AI_REACTIONS_QUEUE = 'ai-reactions';

export enum AiReactionJob {
  ENROLLMENT_WELCOME = 'enrollment-welcome',
  SUBMISSION_FEEDBACK = 'submission-feedback',
  GRADE_SUPPORT = 'grade-support',
}

export interface EnrollmentWelcomeJob {
  tenantId: string;
  userId: string;
  sectionId: string;
}

export interface SubmissionFeedbackJob {
  tenantId: string;
  assignmentId: string;
  submissionId: string;
}

export interface GradeSupportJob {
  tenantId: string;
  submissionId: string;
  newScore: number;
}

/**
 * Shared retry policy. Three attempts with exponential backoff (2s, 4s, 8s)
 * rides out brief Anthropic overload without hammering it. `removeOnComplete`
 * keeps Redis from growing unbounded; failed jobs are retained for triage.
 */
export const AI_REACTION_JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: true,
  removeOnFail: 100,
};
