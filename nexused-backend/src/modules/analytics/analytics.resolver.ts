import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities';
import { AnalyticsService } from './analytics.service';
import {
  AdminDashboard,
  TenantStats,
  UserStats,
  GradeStats,
  SubmissionMetrics,
  AtRiskStudent,
  AiUsageSummary,
  AiAgentUsage,
  CourseStats,
} from './dto/analytics.types';

/**
 * AnalyticsResolver exposes analytics queries for the admin dashboard.
 *
 * WHY: Admins need institution-wide metrics. All queries are admin-only
 * and automatically scoped to the authenticated user's tenant.
 *
 * PATTERN: Single adminDashboard query for initial load, individual
 * queries for refresh/drill-down without full reload.
 */
@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsResolver {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Get complete admin dashboard data in one query.
   * Optimized for initial page load.
   */
  @Query(() => AdminDashboard)
  @Roles(UserRole.ADMIN)
  async adminDashboard(@CurrentUser() user: User): Promise<AdminDashboard> {
    return this.analyticsService.getAdminDashboard(user.tenantId);
  }

  /**
   * Get tenant-level statistics.
   */
  @Query(() => TenantStats)
  @Roles(UserRole.ADMIN)
  async tenantStats(@CurrentUser() user: User): Promise<TenantStats> {
    return this.analyticsService.getTenantStats(user.tenantId);
  }

  /**
   * Get user statistics with role distribution.
   */
  @Query(() => UserStats)
  @Roles(UserRole.ADMIN)
  async userStats(@CurrentUser() user: User): Promise<UserStats> {
    return this.analyticsService.getUserStats(user.tenantId);
  }

  /**
   * Get grade statistics with distribution.
   */
  @Query(() => GradeStats)
  @Roles(UserRole.ADMIN)
  async gradeStats(@CurrentUser() user: User): Promise<GradeStats> {
    return this.analyticsService.getGradeStats(user.tenantId);
  }

  /**
   * Get submission metrics.
   */
  @Query(() => SubmissionMetrics)
  @Roles(UserRole.ADMIN)
  async submissionMetrics(
    @CurrentUser() user: User,
  ): Promise<SubmissionMetrics> {
    return this.analyticsService.getSubmissionMetrics(user.tenantId);
  }

  /**
   * Get students at academic risk.
   */
  @Query(() => [AtRiskStudent])
  @Roles(UserRole.ADMIN)
  async atRiskStudents(
    @CurrentUser() user: User,
    @Args('threshold', { type: () => Int, defaultValue: 60 }) threshold: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<AtRiskStudent[]> {
    return this.analyticsService.getAtRiskStudents(
      user.tenantId,
      threshold,
      limit,
    );
  }

  /**
   * Get AI usage summary.
   */
  @Query(() => AiUsageSummary)
  @Roles(UserRole.ADMIN)
  async aiUsageSummary(@CurrentUser() user: User): Promise<AiUsageSummary> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.analyticsService.getAiUsageSummary(
      user.tenantId,
      thirtyDaysAgo,
      new Date(),
    );
  }

  /**
   * Get AI usage breakdown by agent.
   */
  @Query(() => [AiAgentUsage])
  @Roles(UserRole.ADMIN)
  async aiAgentUsage(@CurrentUser() user: User): Promise<AiAgentUsage[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.analyticsService.getAiAgentUsage(
      user.tenantId,
      thirtyDaysAgo,
      new Date(),
    );
  }

  /**
   * Get top courses by enrollment.
   */
  @Query(() => [CourseStats])
  @Roles(UserRole.ADMIN)
  async topCourses(
    @CurrentUser() user: User,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<CourseStats[]> {
    return this.analyticsService.getTopCourses(user.tenantId, limit);
  }
}
