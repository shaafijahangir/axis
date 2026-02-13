import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User, UserRole } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { FeedService } from './feed.service';
import { FeedPersonalizationService } from './feed-personalization.service';
import {
  FeedItem,
  InstructorFeedItem,
  CourseSectionGrades,
} from './dto/feed.types';
import { TimelineEntry } from './dto/timeline.types';
import {
  RecordEngagementInput,
  RecordEngagementBatchInput,
  FeedEngagementStats,
} from './dto/engagement.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class FeedResolver {
  constructor(
    private readonly feedService: FeedService,
    private readonly personalizationService: FeedPersonalizationService,
  ) {}

  @Query(() => [FeedItem])
  async studentFeed(@CurrentUser() user: User): Promise<FeedItem[]> {
    const items = await this.feedService.getStudentFeed(user.id, user.tenantId);

    // FEAT-014: Apply personalized ranking based on engagement history
    const profile = await this.personalizationService.buildUserProfile(user.id);
    return this.personalizationService.rankFeedItems(items, profile);
  }

  @Query(() => [InstructorFeedItem])
  async instructorFeed(
    @CurrentUser() user: User,
  ): Promise<InstructorFeedItem[]> {
    return this.feedService.getInstructorFeed(user.id, user.tenantId);
  }

  @Query(() => [TimelineEntry])
  async sectionTimeline(
    @Args('sectionId') sectionId: string,
    @CurrentUser() user: User,
  ): Promise<TimelineEntry[]> {
    const isInstructor = user.roles.some((r) =>
      [UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.TA].includes(r),
    );
    return this.feedService.getSectionTimeline(
      sectionId,
      user.tenantId,
      user.id,
      isInstructor,
    );
  }

  @Query(() => [CourseSectionGrades])
  async myGrades(@CurrentUser() user: User): Promise<CourseSectionGrades[]> {
    return this.feedService.getStudentGrades(user.id, user.tenantId);
  }

  /**
   * FEAT-014: Record a single feed engagement event.
   * Called when user clicks a feed item or dismisses it.
   */
  @Mutation(() => Boolean)
  async recordFeedEngagement(
    @CurrentUser() user: User,
    @Args('input') input: RecordEngagementInput,
  ): Promise<boolean> {
    await this.personalizationService.recordEngagement(
      user.id,
      user.tenantId,
      input.eventType,
      input.feedItemType,
      input.feedItemId,
      input.courseCode,
      input.sectionId,
      input.dwellTimeMs,
    );
    return true;
  }

  /**
   * FEAT-014: Record multiple engagement events in one call.
   * Used for batching impression events from the frontend.
   */
  @Mutation(() => Boolean)
  async recordFeedEngagementBatch(
    @CurrentUser() user: User,
    @Args('input') input: RecordEngagementBatchInput,
  ): Promise<boolean> {
    await this.personalizationService.recordEngagementBatch(
      user.id,
      user.tenantId,
      input.events,
    );
    return true;
  }

  /**
   * FEAT-014: Admin-only engagement stats for the tenant.
   */
  @Query(() => FeedEngagementStats)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async feedEngagementStats(
    @CurrentUser() user: User,
  ): Promise<FeedEngagementStats> {
    return this.personalizationService.getEngagementStats(user.tenantId);
  }
}
