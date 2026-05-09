/**
 * Core tool definitions for the AI agent system.
 *
 * WHY: Every system operation is defined as a "tool" that both the UI (via GraphQL)
 * and AI agents can invoke through the same path. This ensures identical validation,
 * authorization, and event emission regardless of who triggers the operation.
 *
 * PATTERN: Each tool wraps an existing NestJS service method with a JSON Schema
 * input definition that Claude can understand and invoke.
 */

/** Governance action type — controls how the AI can use this tool */
export type ActionType = 'auto' | 'suggest' | 'blocked';

/** Context passed to every tool handler — scoped per tenant and user */
export interface AgentContext {
  tenantId: string;
  userId: string;
  roles: string[];
  agentType: string;
  conversationId?: string;
}

/** A single tool definition that Claude can call */
export interface ToolDefinition {
  /** Unique tool name, e.g. 'get_student_submissions' */
  name: string;

  /** Human-readable description of what the tool does (sent to Claude) */
  description: string;

  /** JSON Schema describing the tool's input parameters */
  inputSchema: Record<string, unknown>;

  /** The function that executes when Claude calls this tool */
  handler: (
    input: Record<string, unknown>,
    ctx: AgentContext,
  ) => Promise<unknown>;

  /** Permissions required to invoke this tool, e.g. ['courses.read'] */
  requiredPermissions: string[];

  /** Default governance action type — can be overridden per tenant */
  actionType: ActionType;
}

/** Simplified schema sent to Claude's tool_use API */
export interface ClaudeToolSchema {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** Result of a tool invocation */
export interface ToolResult {
  toolName: string;
  success: boolean;
  data?: unknown;
  error?: string;
  executionTimeMs: number;
}
