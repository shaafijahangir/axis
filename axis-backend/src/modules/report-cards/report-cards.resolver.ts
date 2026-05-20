import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User, UserRole } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { ReportCardsService } from './report-cards.service';
import {
  UpdateReportCardInput,
  ReportCardSummary,
} from './dto/report-card.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class ReportCardsResolver {
  constructor(private readonly reportCardsService: ReportCardsService) {}

  @Mutation(() => [ReportCardSummary])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async generateReportCards(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
  ): Promise<ReportCardSummary[]> {
    return this.reportCardsService.generateForSection(sectionId, user.tenantId);
  }

  @Mutation(() => ReportCardSummary)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async updateReportCard(
    @CurrentUser() user: User,
    @Args('input') input: UpdateReportCardInput,
  ): Promise<ReportCardSummary> {
    return this.reportCardsService.updateComment(
      input.id,
      user.tenantId,
      input,
    );
  }

  @Mutation(() => [ReportCardSummary])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async publishReportCards(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
  ): Promise<ReportCardSummary[]> {
    return this.reportCardsService.publishSection(sectionId, user.tenantId);
  }

  @Query(() => [ReportCardSummary])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async sectionReportCards(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
  ): Promise<ReportCardSummary[]> {
    return this.reportCardsService.sectionReportCards(sectionId, user.tenantId);
  }

  @Query(() => [ReportCardSummary])
  async myReportCards(@CurrentUser() user: User): Promise<ReportCardSummary[]> {
    return this.reportCardsService.myReportCards(user.id, user.tenantId);
  }
}
