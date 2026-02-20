import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities';
import { GraduationPlannerService } from './graduation-planner.service';
import {
  GenerateGraduationPlanInput,
  GraduationPlanResult,
} from './dto/graduation-planner.types';

/**
 * GraphQL resolver for graduation plan generation.
 *
 * WHY: Exposes the constraint-based plan generator as a GraphQL API
 * consumed by the /planner/roadmap frontend page and (GRAD-002+) the
 * Course Planner AI agent via graduation-planner tools.
 *
 * PATTERN: Students can only access their own plans (userId check in
 * service layer). Admins can access any plan by passing a userId.
 */
@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GraduationPlannerResolver {
  constructor(private graduationPlannerService: GraduationPlannerService) {}

  // ─── Mutations ─────────────────────────────────────────────────────────

  /**
   * Generate (or regenerate) a graduation plan for the authenticated student.
   *
   * Calling this multiple times re-generates the plan with the given
   * constraints and archives the previous active plan.
   */
  @Mutation(() => GraduationPlanResult)
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async generateGraduationPlan(
    @CurrentUser() user: User,
    @Args('input') input: GenerateGraduationPlanInput,
  ): Promise<GraduationPlanResult> {
    const [{ plan, diff }, { tuitionConfig, aidConfig }] = await Promise.all([
      this.graduationPlannerService.generatePlan(user.id, user.tenantId, input),
      this.graduationPlannerService.loadTenantConfigs(user.tenantId),
    ]);
    return this.graduationPlannerService.toResult(
      plan,
      diff,
      tuitionConfig,
      aidConfig,
    );
  }

  /**
   * Set an existing draft plan as the active plan (and archive the current
   * active one). Used when a student wants to switch between saved drafts.
   */
  @Mutation(() => GraduationPlanResult)
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async activateGraduationPlan(
    @CurrentUser() user: User,
    @Args('planId') planId: string,
  ): Promise<GraduationPlanResult> {
    const [plan, { tuitionConfig, aidConfig }] = await Promise.all([
      this.graduationPlannerService.activatePlan(
        planId,
        user.id,
        user.tenantId,
      ),
      this.graduationPlannerService.loadTenantConfigs(user.tenantId),
    ]);
    return this.graduationPlannerService.toResult(
      plan,
      null,
      tuitionConfig,
      aidConfig,
    );
  }

  // ─── Queries ───────────────────────────────────────────────────────────

  /**
   * Return all graduation plans for a specific profile.
   * Ordered newest-first. Includes drafts and archived plans.
   */
  @Query(() => [GraduationPlanResult])
  @Roles(UserRole.STUDENT, UserRole.ADMIN)
  async myGraduationPlans(
    @CurrentUser() user: User,
    @Args('profileId') profileId: string,
  ): Promise<GraduationPlanResult[]> {
    // Ownership check is enforced inside the service (userId filter)
    const [plans, { tuitionConfig, aidConfig }] = await Promise.all([
      this.graduationPlannerService.findPlansForProfile(
        profileId,
        user.id,
        user.tenantId,
      ),
      this.graduationPlannerService.loadTenantConfigs(user.tenantId),
    ]);
    return plans.map((p) =>
      this.graduationPlannerService.toResult(p, null, tuitionConfig, aidConfig),
    );
  }
}
