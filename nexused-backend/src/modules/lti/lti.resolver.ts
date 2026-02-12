import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { LtiService } from './lti.service';
import { LtiPlatform, LtiDeployment, LtiContext } from './entities';
import {
  CreateLtiPlatformInput,
  UpdateLtiPlatformInput,
  CreateLtiDeploymentInput,
  LinkLtiContextInput,
  LtiToolConfiguration,
  LtiPlatformInfo,
} from './dto/lti.types';

/**
 * LTI GraphQL Resolver
 *
 * Provides admin interface for managing LTI platform registrations,
 * deployments, and context linking.
 */
@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LtiResolver {
  constructor(private ltiService: LtiService) {}

  // ============================================================
  // QUERIES
  // ============================================================

  /**
   * Get tool configuration for registration
   */
  @Query(() => LtiToolConfiguration)
  @Roles(UserRole.ADMIN)
  ltiToolConfiguration(): LtiToolConfiguration {
    return this.ltiService.getToolConfiguration();
  }

  /**
   * Get all registered platforms for this tenant
   */
  @Query(() => [LtiPlatformInfo])
  @Roles(UserRole.ADMIN)
  async ltiPlatforms(@CurrentUser() user: User): Promise<LtiPlatformInfo[]> {
    return this.ltiService.getPlatformInfo(user.tenantId);
  }

  /**
   * Get a specific platform with its deployments
   */
  @Query(() => LtiPlatform, { nullable: true })
  @Roles(UserRole.ADMIN)
  async ltiPlatform(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<LtiPlatform | null> {
    return this.ltiService.getPlatform(user.tenantId, id);
  }

  /**
   * Get deployments for a platform
   */
  @Query(() => [LtiDeployment])
  @Roles(UserRole.ADMIN)
  async ltiDeployments(
    @CurrentUser() user: User,
    @Args('platformId') platformId: string,
  ): Promise<LtiDeployment[]> {
    return this.ltiService.getDeployments(user.tenantId, platformId);
  }

  /**
   * Get unlinked contexts (LTI courses not yet mapped to NexusEd sections)
   */
  @Query(() => [LtiContext])
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async ltiUnlinkedContexts(@CurrentUser() user: User): Promise<LtiContext[]> {
    return this.ltiService.getUnlinkedContexts(user.tenantId);
  }

  // ============================================================
  // MUTATIONS
  // ============================================================

  /**
   * Register a new LTI platform
   */
  @Mutation(() => LtiPlatform)
  @Roles(UserRole.ADMIN)
  async createLtiPlatform(
    @CurrentUser() user: User,
    @Args('input') input: CreateLtiPlatformInput,
  ): Promise<LtiPlatform> {
    return this.ltiService.createPlatform(user.tenantId, input);
  }

  /**
   * Update an existing platform
   */
  @Mutation(() => LtiPlatform)
  @Roles(UserRole.ADMIN)
  async updateLtiPlatform(
    @CurrentUser() user: User,
    @Args('input') input: UpdateLtiPlatformInput,
  ): Promise<LtiPlatform> {
    return this.ltiService.updatePlatform(user.tenantId, input);
  }

  /**
   * Delete a platform (cascades to deployments, contexts, users)
   */
  @Mutation(() => Boolean)
  @Roles(UserRole.ADMIN)
  async deleteLtiPlatform(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.ltiService.deletePlatform(user.tenantId, id);
  }

  /**
   * Add a deployment to a platform
   */
  @Mutation(() => LtiDeployment)
  @Roles(UserRole.ADMIN)
  async createLtiDeployment(
    @CurrentUser() user: User,
    @Args('input') input: CreateLtiDeploymentInput,
  ): Promise<LtiDeployment> {
    return this.ltiService.createDeployment(user.tenantId, input);
  }

  /**
   * Link an LTI context to a NexusEd section
   */
  @Mutation(() => LtiContext)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async linkLtiContext(
    @CurrentUser() user: User,
    @Args('input') input: LinkLtiContextInput,
  ): Promise<LtiContext> {
    return this.ltiService.linkContext(user.tenantId, input);
  }

  /**
   * Unlink an LTI context from a NexusEd section
   */
  @Mutation(() => LtiContext)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async unlinkLtiContext(
    @CurrentUser() user: User,
    @Args('contextId') contextId: string,
  ): Promise<LtiContext> {
    return this.ltiService.unlinkContext(user.tenantId, contextId);
  }
}
