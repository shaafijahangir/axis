import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AcademicTerm, User } from '../../database/entities';
import { UserRole } from '../../database/entities/user.entity';
import { AcademicTermsService } from './academic-terms.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import {
  CreateAcademicTermInput,
  UpdateAcademicTermInput,
} from './dto/academic-term.types';

@Resolver(() => AcademicTerm)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AcademicTermsResolver {
  constructor(private readonly termsService: AcademicTermsService) {}

  @Query(() => [AcademicTerm])
  async academicTerms(@CurrentUser() user: User): Promise<AcademicTerm[]> {
    return this.termsService.findAllForTenant(user.tenantId);
  }

  @Query(() => AcademicTerm)
  async academicTerm(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<AcademicTerm> {
    return this.termsService.findById(id, user.tenantId);
  }

  @Query(() => AcademicTerm, { nullable: true })
  async currentTerm(@CurrentUser() user: User): Promise<AcademicTerm | null> {
    return this.termsService.findCurrent(user.tenantId);
  }

  @Query(() => Int)
  async academicTermCount(@CurrentUser() user: User): Promise<number> {
    return this.termsService.count(user.tenantId);
  }

  @Mutation(() => AcademicTerm)
  async createAcademicTerm(
    @CurrentUser() user: User,
    @Args('input') input: CreateAcademicTermInput,
  ): Promise<AcademicTerm> {
    return this.termsService.create(user.tenantId, input);
  }

  @Mutation(() => AcademicTerm)
  async updateAcademicTerm(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('input') input: UpdateAcademicTermInput,
  ): Promise<AcademicTerm> {
    return this.termsService.update(id, user.tenantId, input);
  }

  @Mutation(() => Boolean)
  async removeAcademicTerm(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.termsService.remove(id, user.tenantId);
  }
}
