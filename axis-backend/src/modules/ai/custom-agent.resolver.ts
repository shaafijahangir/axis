import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities';
import { CustomAgentService } from './custom-agent.service';
import { CustomAgent } from './entities/custom-agent.entity';
import { ToolRegistry } from './tools/tool-registry';
import {
  CreateCustomAgentInput,
  UpdateCustomAgentInput,
  AvailableTool,
} from './dto/custom-agent.types';

/**
 * GraphQL resolver for the Agent Builder feature.
 *
 * WHY: Instructors need to create custom AI agents for their courses
 * without writing code. This resolver provides CRUD operations and
 * a tool catalog for the frontend agent builder UI.
 *
 * PATTERN: Role-gated resolver. Instructors manage their own agents,
 * admins can manage any agent in the tenant.
 */
@Resolver(() => CustomAgent)
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomAgentResolver {
  constructor(
    private customAgentService: CustomAgentService,
    private toolRegistry: ToolRegistry,
  ) {}

  // ─── Queries ────────────────────────────────────────────────────────

  /**
   * List all custom agents in the tenant.
   * Instructors see only their own. Admins see all.
   */
  @Query(() => [CustomAgent])
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async customAgents(@CurrentUser() user: User): Promise<CustomAgent[]> {
    const isAdmin = user.roles.includes(UserRole.ADMIN);
    return this.customAgentService.findByTenant(
      user.tenantId,
      isAdmin ? undefined : user.id,
    );
  }

  /**
   * Get a single custom agent by ID.
   */
  @Query(() => CustomAgent)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async customAgent(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<CustomAgent> {
    return this.customAgentService.findByIdOrFail(id, user.tenantId);
  }

  /**
   * Get the catalog of available tools that can be assigned to agents.
   * Used by the frontend tool picker in the agent builder.
   */
  @Query(() => [AvailableTool])
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  availableTools(): AvailableTool[] {
    const toolNames = this.toolRegistry.getToolNames();
    return toolNames.map((name) => {
      const tool = this.toolRegistry.get(name)!;
      return {
        name: tool.name,
        description: tool.description,
        actionType: tool.actionType,
        requiredPermissions: tool.requiredPermissions,
      };
    });
  }

  // ─── Mutations ──────────────────────────────────────────────────────

  /**
   * Create a new custom agent.
   */
  @Mutation(() => CustomAgent)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async createCustomAgent(
    @CurrentUser() user: User,
    @Args('input') input: CreateCustomAgentInput,
  ): Promise<CustomAgent> {
    return this.customAgentService.create(user.tenantId, user.id, input);
  }

  /**
   * Update an existing custom agent.
   */
  @Mutation(() => CustomAgent)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async updateCustomAgent(
    @CurrentUser() user: User,
    @Args('input') input: UpdateCustomAgentInput,
  ): Promise<CustomAgent> {
    const isAdmin = user.roles.includes(UserRole.ADMIN);
    return this.customAgentService.update(
      user.tenantId,
      user.id,
      isAdmin,
      input,
    );
  }

  /**
   * Delete a custom agent.
   */
  @Mutation(() => Boolean)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async deleteCustomAgent(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    const isAdmin = user.roles.includes(UserRole.ADMIN);
    return this.customAgentService.delete(id, user.tenantId, user.id, isAdmin);
  }
}
