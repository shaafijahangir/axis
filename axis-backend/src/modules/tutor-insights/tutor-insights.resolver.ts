import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User, UserRole } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { TutorInsightsService } from './tutor-insights.service';
import {
  TutorGapAnalysis,
  TutorStudentActivity,
  TutorTranscriptMessage,
} from './dto/tutor-insights.types';

/**
 * Section staff only. The role check here is the coarse gate; the service
 * runs AccessControlService.assertSectionStaff for the specific section.
 */
@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
export class TutorInsightsResolver {
  constructor(private readonly tutorInsightsService: TutorInsightsService) {}

  @Query(() => [TutorStudentActivity])
  async sectionTutorActivity(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
  ): Promise<TutorStudentActivity[]> {
    return this.tutorInsightsService.getSectionActivity(
      user,
      sectionId,
      user.tenantId,
    );
  }

  @Query(() => [TutorTranscriptMessage])
  async sectionTutorTranscript(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
    @Args('conversationId') conversationId: string,
  ): Promise<TutorTranscriptMessage[]> {
    return this.tutorInsightsService.getTranscript(
      user,
      sectionId,
      conversationId,
      user.tenantId,
    );
  }

  @Mutation(() => TutorGapAnalysis)
  async analyzeSectionTutorGaps(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
  ): Promise<TutorGapAnalysis> {
    return this.tutorInsightsService.analyzeGaps(
      user,
      sectionId,
      user.tenantId,
    );
  }
}
