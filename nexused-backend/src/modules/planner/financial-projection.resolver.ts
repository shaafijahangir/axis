import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities';
import { Tenant } from '../../database/entities/tenant.entity';
import { TuitionConfig } from './dto/financial-projection.types';

/**
 * GraphQL resolver for tuition configuration.
 *
 * WHY: Admins need a way to set the institution's tuition pricing model so
 * financial projections appear on student graduation plans. Config is stored
 * in the Tenant.settings JSONB field under key 'tuitionConfig' — no new
 * entity or migration needed.
 *
 * ACCESS: Only ADMIN can write tuition config. Students and instructors can
 * read it (so the frontend can display "tuition rates configured / not configured"
 * without exposing sensitive institutional data beyond pricing).
 *
 * GRAD-003: Financial Projections
 */
@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinancialProjectionResolver {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
  ) {}

  /**
   * Return the current tuition configuration for the authenticated user's
   * tenant. Null if no config has been set yet.
   */
  @Query(() => TuitionConfig, { nullable: true })
  @Roles(UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.TA)
  async getTuitionConfig(
    @CurrentUser() user: User,
  ): Promise<TuitionConfig | null> {
    const tenant = await this.tenantRepo.findOne({
      where: { id: user.tenantId },
    });
    if (!tenant) return null;
    return (
      (tenant.settings?.tuitionConfig as TuitionConfig | undefined) ?? null
    );
  }

  /**
   * Set (or replace) the tuition configuration for this tenant.
   *
   * Stores config under `Tenant.settings.tuitionConfig`. Existing settings
   * keys are preserved — only `tuitionConfig` is overwritten.
   *
   * @returns The updated config that was saved
   */
  @Mutation(() => TuitionConfig)
  @Roles(UserRole.ADMIN)
  async updateTuitionConfig(
    @CurrentUser() user: User,
    @Args('config', { type: () => TuitionConfig }) config: TuitionConfig,
  ): Promise<TuitionConfig> {
    const tenant = await this.tenantRepo.findOne({
      where: { id: user.tenantId },
    });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Merge into existing settings so we don't clobber other tenant config
    tenant.settings = {
      ...(tenant.settings ?? {}),
      tuitionConfig: config,
    };

    await this.tenantRepo.save(tenant);
    return config;
  }

  /**
   * Clear the tuition configuration for this tenant.
   * Financial projections will no longer appear on graduation plans.
   */
  @Mutation(() => Boolean)
  @Roles(UserRole.ADMIN)
  async clearTuitionConfig(@CurrentUser() user: User): Promise<boolean> {
    const tenant = await this.tenantRepo.findOne({
      where: { id: user.tenantId },
    });
    if (!tenant) return false;

    const { tuitionConfig: _removed, ...remainingSettings } =
      tenant.settings ?? {};
    tenant.settings = remainingSettings;
    await this.tenantRepo.save(tenant);
    return true;
  }
}
