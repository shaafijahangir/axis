/**
 * Agent type definitions.
 *
 * WHY: Each agent is a typed configuration — not a class with behavior.
 * The AgentExecutor runs any agent definition through the same loop.
 * This makes agents declarative and easy to add/modify.
 *
 * PATTERN: Strategy pattern — the agent definition is the strategy,
 * the AgentExecutor is the context that runs it.
 */

/** Context payload assembled per interaction — rich data for the AI to reason about */
export interface ContextPayload {
  student?: {
    id: string;
    name: string;
    enrollments: Array<{
      courseTitle: string;
      sectionId: string;
      status: string;
    }>;
    recentActivity?: Record<string, unknown>;
  };
  course?: {
    id: string;
    title: string;
    code: string;
    description?: string;
  };
  assignment?: {
    id: string;
    title: string;
    description?: string;
    rubric?: Record<string, unknown>;
    pointsPossible: number;
    dueAt?: string;
  };
  submission?: {
    id: string;
    content?: Record<string, unknown>;
    score?: number;
    feedback?: string;
  };
  tenant?: {
    id: string;
    name: string;
    settings?: Record<string, unknown>;
  };
}

/** Parameters passed to context builder — varies by agent type */
export interface ContextBuilderParams {
  tenantId: string;
  userId: string;
  courseId?: string;
  assignmentId?: string;
  submissionId?: string;
  sectionId?: string;
}

/** Typed agent definition — declarative, not behavioral */
export interface AgentDefinition {
  /** Unique identifier, e.g. 'study-coach' */
  type: string;

  /** Human-readable name for UI display */
  displayName: string;

  /** System prompt that defines the agent's personality and instructions */
  systemPrompt: string;

  /** Tool names this agent is allowed to use */
  tools: string[];

  /** Maximum number of Claude API turns before forcibly stopping (prevents runaway loops) */
  maxTurns: number;

  /** Claude model to use for this agent */
  model: string;

  /** Description shown to users when selecting an agent */
  description: string;

  /** Which user roles can interact with this agent */
  allowedRoles: string[];
}
