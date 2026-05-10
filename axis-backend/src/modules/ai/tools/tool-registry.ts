import { Injectable, Logger } from '@nestjs/common';
import {
  ToolDefinition,
  ClaudeToolSchema,
  AgentContext,
  ToolResult,
} from './tool.interface';
import { AiToolDefinition } from '../providers/ai-provider.interface';

/**
 * Central registry for all AI-callable tools.
 *
 * PATTERN: Service Locator — tools register themselves at module init,
 * and agents look them up by name at runtime.
 *
 * WHY: Decouples tool definitions from agent definitions. Any agent can
 * use any tool (subject to permissions), and new tools are automatically
 * available to all agents without code changes.
 */
@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private readonly tools = new Map<string, ToolDefinition>();

  /** Register a tool definition. Called during module initialization. */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(
        `Tool "${tool.name}" is already registered — overwriting`,
      );
    }
    this.tools.set(tool.name, tool);
    this.logger.log(`Registered tool: ${tool.name}`);
  }

  /** Register multiple tools at once. */
  registerAll(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /** Get a tool by name, or undefined if not found. */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /** Get all registered tool names. */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /** Get tools filtered by a list of names (used by agents to get their tool set). */
  getToolsForAgent(toolNames: string[]): ToolDefinition[] {
    const result: ToolDefinition[] = [];
    for (const name of toolNames) {
      const tool = this.tools.get(name);
      if (tool) {
        result.push(tool);
      } else {
        this.logger.warn(`Agent requested unknown tool: "${name}"`);
      }
    }
    return result;
  }

  /**
   * Convert tool definitions to the provider-agnostic format.
   * Only includes tools the agent is allowed to use.
   */
  toProviderFormat(toolNames: string[]): AiToolDefinition[] {
    return this.getToolsForAgent(toolNames).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: 'object',
        properties: (tool.inputSchema.properties ?? {}) as Record<
          string,
          unknown
        >,
        required: tool.inputSchema.required as string[] | undefined,
      },
    }));
  }

  /**
   * Convert tool definitions to Claude's tool_use API format.
   * @deprecated Use toProviderFormat() instead. This method exists for backward compatibility.
   */
  toClaudeFormat(toolNames: string[]): ClaudeToolSchema[] {
    return this.getToolsForAgent(toolNames).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  /**
   * Execute a tool by name with the given input and context.
   * Returns a structured result with timing and error handling.
   */
  async execute(
    toolName: string,
    input: Record<string, unknown>,
    ctx: AgentContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        toolName,
        success: false,
        error: `Unknown tool: "${toolName}"`,
        executionTimeMs: 0,
      };
    }

    const start = Date.now();
    try {
      const data = await tool.handler(input, ctx);
      return {
        toolName,
        success: true,
        data,
        executionTimeMs: Date.now() - start,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tool "${toolName}" failed: ${message}`);
      return {
        toolName,
        success: false,
        error: message,
        executionTimeMs: Date.now() - start,
      };
    }
  }

  /** Total number of registered tools. */
  get size(): number {
    return this.tools.size;
  }
}
