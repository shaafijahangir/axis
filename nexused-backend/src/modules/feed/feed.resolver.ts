import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User, UserRole } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { FeedService } from './feed.service';
import {
  FeedItem,
  InstructorFeedItem,
  CourseSectionGrades,
} from './dto/feed.types';
import { TimelineEntry } from './dto/timeline.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class FeedResolver {
  constructor(private readonly feedService: FeedService) {}

  @Query(() => [FeedItem])
  async studentFeed(@CurrentUser() user: User): Promise<FeedItem[]> {
    return this.feedService.getStudentFeed(user.id, user.tenantId);
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
}
