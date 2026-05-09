import { Injectable, Logger } from '@nestjs/common';
import { AgentDefinition } from './agent.interface';

/**
 * Registry of all available agent types.
 *
 * PATTERN: Similar to ToolRegistry — agents register at init,
 * looked up by type at runtime.
 *
 * WHY separate from ToolRegistry: Agents are configurations (system prompt,
 * tool set, model) while tools are operations (input schema, handler).
 * Different concerns, different registries.
 */
@Injectable()
export class AgentRegistry {
  private readonly logger = new Logger(AgentRegistry.name);
  private readonly agents = new Map<string, AgentDefinition>();

  /** Register an agent definition. */
  register(agent: AgentDefinition): void {
    if (this.agents.has(agent.type)) {
      this.logger.warn(
        `Agent "${agent.type}" is already registered — overwriting`,
      );
    }
    this.agents.set(agent.type, agent);
    this.logger.log(`Registered agent: ${agent.type} (${agent.displayName})`);
  }

  /** Get an agent by type. */
  get(type: string): AgentDefinition | undefined {
    return this.agents.get(type);
  }

  /** Get all registered agent types. */
  getAgentTypes(): string[] {
    return Array.from(this.agents.keys());
  }

  /** Get all agents a given role can access. */
  getAgentsForRole(role: string): AgentDefinition[] {
    return Array.from(this.agents.values()).filter((agent) =>
      agent.allowedRoles.includes(role),
    );
  }

  /** Get all registered agent definitions. */
  getAll(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  get size(): number {
    return this.agents.size;
  }
}
