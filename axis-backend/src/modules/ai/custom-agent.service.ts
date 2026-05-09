import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomAgent } from './entities/custom-agent.entity';
import { AgentDefinition } from './agents/agent.interface';
import { AgentRegistry } from './agents/agent-registry.service';
import { ToolRegistry } from './tools/tool-registry';
import { ConfigService } from '@nestjs/config';
import {
  CreateCustomAgentInput,
  UpdateCustomAgentInput,
} from './dto/custom-agent.types';

/**
 * Service for managing custom AI agent definitions.
 *
 * WHY: Built-in agents are hardcoded and identical across tenants.
 * Custom agents let instructors create course-specific AI assistants
 * with tailored system prompts, tool selections, and constraints.
 *
 * PATTERN: The service converts CustomAgent entities to AgentDefinition
 * objects at runtime, so the AgentExecutorService treats them identically
 * to built-in agents. This preserves the agentic loop abstraction.
 *
 * TRADEOFF: DB lookup per agent resolution adds ~1ms latency vs.
 * in-memory registry. Acceptable for the flexibility gained.
 */
@Injectable()
export class CustomAgentService {
  private readonly logger = new Logger(CustomAgentService.name);

  constructor(
    @InjectRepository(CustomAgent)
    private customAgentRepo: Repository<CustomAgent>,
    private agentRegistry: AgentRegistry,
    private toolRegistry: ToolRegistry,
    private configService: ConfigService,
  ) {}

  // ─── CRUD Operations ──────────────────────────────────────────────────

  /**
   * Create a new custom agent.
   */
  async create(
    tenantId: string,
    createdById: string,
    input: CreateCustomAgentInput,
  ): Promise<CustomAgent> {
    // Validate tools exist
    this.validateTools(input.tools);

    // Generate slug from display name
    const slug = this.generateSlug(input.displayName);

    // Check slug uniqueness within tenant
    const existing = await this.customAgentRepo.findOne({
      where: { tenantId, slug },
    });
    if (existing) {
      throw new Error(
        `An agent with a similar name already exists in this tenant. Please choose a different name.`,
      );
    }

    const agent = this.customAgentRepo.create({
      tenantId,
      createdById,
      slug,
      displayName: input.displayName,
      description: input.description,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      allowedRoles: input.allowedRoles ?? ['student'],
      maxTurns: input.maxTurns ?? 10,
      model:
        this.configService.get<string>('ai.defaultModel') ??
        'claude-sonnet-4-20250514',
      isActive: true,
      courseId: input.courseId ?? null,
    });

    const saved: CustomAgent = await this.customAgentRepo.save(agent);
    this.logger.log(
      `Custom agent created: "${saved.displayName}" (${saved.slug}) by user ${createdById} in tenant ${tenantId}`,
    );

    return saved;
  }

  /**
   * Update an existing custom agent.
   * Only the creator or an admin can update.
   */
  async update(
    tenantId: string,
    userId: string,
    isAdmin: boolean,
    input: UpdateCustomAgentInput,
  ): Promise<CustomAgent> {
    const agent = await this.findByIdOrFail(input.id, tenantId);

    // Authorization: only creator or admin can update
    if (agent.createdById !== userId && !isAdmin) {
      throw new ForbiddenException('You can only edit agents you created');
    }

    if (input.tools) {
      this.validateTools(input.tools);
    }

    // Apply updates
    if (input.displayName !== undefined) {
      agent.displayName = input.displayName;
      // Regenerate slug if name changes
      const newSlug = this.generateSlug(input.displayName);
      const existing = await this.customAgentRepo.findOne({
        where: { tenantId, slug: newSlug },
      });
      if (existing && existing.id !== agent.id) {
        throw new Error(
          `An agent with a similar name already exists. Please choose a different name.`,
        );
      }
      agent.slug = newSlug;
    }
    if (input.description !== undefined) agent.description = input.description;
    if (input.systemPrompt !== undefined)
      agent.systemPrompt = input.systemPrompt;
    if (input.tools !== undefined) agent.tools = input.tools;
    if (input.allowedRoles !== undefined)
      agent.allowedRoles = input.allowedRoles;
    if (input.maxTurns !== undefined) agent.maxTurns = input.maxTurns;
    if (input.isActive !== undefined) agent.isActive = input.isActive;
    if (input.courseId !== undefined) agent.courseId = input.courseId || null;

    return this.customAgentRepo.save(agent);
  }

  /**
   * Delete a custom agent.
   * Only the creator or an admin can delete.
   */
  async delete(
    id: string,
    tenantId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<boolean> {
    const agent = await this.findByIdOrFail(id, tenantId);

    if (agent.createdById !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete agents you created');
    }

    await this.customAgentRepo.remove(agent);
    this.logger.log(
      `Custom agent deleted: "${agent.displayName}" (${agent.slug}) by user ${userId}`,
    );

    return true;
  }

  // ─── Query Operations ─────────────────────────────────────────────────

  /**
   * Find a custom agent by ID, scoped to tenant.
   */
  async findByIdOrFail(id: string, tenantId: string): Promise<CustomAgent> {
    const agent = await this.customAgentRepo.findOne({
      where: { id, tenantId },
      relations: ['createdBy'],
    });
    if (!agent) {
      throw new NotFoundException(`Custom agent not found: ${id}`);
    }
    return agent;
  }

  /**
   * List all custom agents for a tenant.
   * Optionally filter by creator.
   */
  async findByTenant(
    tenantId: string,
    createdById?: string,
  ): Promise<CustomAgent[]> {
    const where: Record<string, unknown> = { tenantId };
    if (createdById) {
      where.createdById = createdById;
    }

    return this.customAgentRepo.find({
      where,
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all active custom agents available to a user based on their roles
   * and course enrollments.
   */
  async findAvailableForUser(
    tenantId: string,
    roles: string[],
    enrolledCourseIds: string[],
  ): Promise<CustomAgent[]> {
    const allActive = await this.customAgentRepo.find({
      where: { tenantId, isActive: true },
    });

    return allActive.filter((agent) => {
      // Check role access
      const hasRole = agent.allowedRoles.some((role) => roles.includes(role));
      if (!hasRole) return false;

      // Check course scope
      if (agent.courseId) {
        return enrolledCourseIds.includes(agent.courseId);
      }

      return true; // No course scope = available to all
    });
  }

  // ─── Agent Definition Conversion ──────────────────────────────────────

  /**
   * Convert a CustomAgent entity to an AgentDefinition that the
   * AgentExecutorService can run through its agentic loop.
   */
  toAgentDefinition(customAgent: CustomAgent): AgentDefinition {
    return {
      type: `custom-${customAgent.slug}`,
      displayName: customAgent.displayName,
      description: customAgent.description,
      systemPrompt: customAgent.systemPrompt,
      tools: customAgent.tools,
      maxTurns: customAgent.maxTurns,
      model: customAgent.model,
      allowedRoles: customAgent.allowedRoles,
    };
  }

  /**
   * Resolve an agent by type — checks built-in registry first,
   * then falls back to custom agents in the DB.
   *
   * WHY: This is the integration point. The AgentExecutorService calls
   * this instead of agentRegistry.get() directly, so both built-in and
   * custom agents are resolved transparently.
   */
  async resolveAgent(
    agentType: string,
    tenantId: string,
  ): Promise<AgentDefinition | undefined> {
    // Check built-in agents first
    const builtIn = this.agentRegistry.get(agentType);
    if (builtIn) return builtIn;

    // Check custom agents (type format: "custom-<slug>")
    if (agentType.startsWith('custom-')) {
      const slug = agentType.slice(7); // Remove 'custom-' prefix
      const custom = await this.customAgentRepo.findOne({
        where: { tenantId, slug, isActive: true },
      });
      if (custom) {
        return this.toAgentDefinition(custom);
      }
    }

    return undefined;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * Validate that all tool names exist in the ToolRegistry.
   */
  private validateTools(toolNames: string[]): void {
    const registeredTools = this.toolRegistry.getToolNames();
    const invalid = toolNames.filter((t) => !registeredTools.includes(t));
    if (invalid.length > 0) {
      throw new Error(
        `Unknown tools: ${invalid.join(', ')}. Available tools: ${registeredTools.join(', ')}`,
      );
    }
  }

  /**
   * Generate a URL-safe slug from a display name.
   */
  private generateSlug(displayName: string): string {
    return displayName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
  }
}
