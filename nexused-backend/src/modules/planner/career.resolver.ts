import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities';
import { CareerProfile } from '../../database/entities/career-profile.entity';
import { CareerService } from './career.service';
import {
  CreateCareerInput,
  UpdateCareerInput,
  CareerSkillGap,
} from './dto/career.types';

/**
 * GraphQL resolver for career profiles and skill gap analysis.
 *
 * WHY: Keeps career CRUD admin-only while opening skill gap queries to
 * all authenticated students. Keeps it in the planner module because
 * career exploration is part of the degree planning flow.
 */
@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CareerResolver {
  constructor(private careerService: CareerService) {}

  // ─── Queries ──────────────────────────────────────────────────────────

  @Query(() => [CareerProfile])
  async careers(
    @CurrentUser() user: User,
    @Args('category', { nullable: true }) category?: string,
  ): Promise<CareerProfile[]> {
    return this.careerService.listCareers(user.tenantId, category);
  }

  @Query(() => CareerProfile)
  async career(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<CareerProfile> {
    return this.careerService.findById(id, user.tenantId);
  }

  @Query(() => [String])
  async careerCategories(@CurrentUser() user: User): Promise<string[]> {
    return this.careerService.listCategories(user.tenantId);
  }

  @Query(() => CareerSkillGap)
  async careerSkillGap(
    @CurrentUser() user: User,
    @Args('careerId') careerId: string,
    @Args('profileId') profileId: string,
  ): Promise<CareerSkillGap> {
    return this.careerService.skillGapAnalysis(
      careerId,
      profileId,
      user.id,
      user.tenantId,
    );
  }

  // ─── Admin Mutations ──────────────────────────────────────────────────

  @Mutation(() => CareerProfile)
  @Roles(UserRole.ADMIN)
  async createCareer(
    @CurrentUser() user: User,
    @Args('input') input: CreateCareerInput,
  ): Promise<CareerProfile> {
    return this.careerService.create(user.tenantId, input);
  }

  @Mutation(() => CareerProfile)
  @Roles(UserRole.ADMIN)
  async updateCareer(
    @CurrentUser() user: User,
    @Args('input') input: UpdateCareerInput,
  ): Promise<CareerProfile> {
    return this.careerService.update(user.tenantId, input);
  }

  @Mutation(() => Boolean)
  @Roles(UserRole.ADMIN)
  async deleteCareer(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.careerService.remove(id, user.tenantId);
  }
}
