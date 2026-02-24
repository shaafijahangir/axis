import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { Discussion } from './entities/discussion.entity';
import { DiscussionReply } from './entities/discussion-reply.entity';
import {
  CreateDiscussionInput,
  CreateDiscussionReplyInput,
} from './dto/discussion.types';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';

@Resolver()
@UseGuards(JwtAuthGuard)
export class DiscussionsResolver {
  constructor(private readonly discussionsService: DiscussionsService) {}

  // ─── Queries ─────────────────────────────────────────────────────────────

  @Query(() => [Discussion])
  async sectionDiscussions(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<Discussion[]> {
    return this.discussionsService.findBySectionId(
      sectionId,
      user.tenantId,
      page,
      limit,
    );
  }

  @Query(() => Discussion)
  async discussion(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Discussion> {
    return this.discussionsService.findById(id, user.tenantId);
  }

  @Query(() => [DiscussionReply])
  async discussionReplies(
    @CurrentUser() user: User,
    @Args('discussionId') discussionId: string,
  ): Promise<DiscussionReply[]> {
    return this.discussionsService.findReplies(discussionId, user.tenantId);
  }

  // ─── Mutations ───────────────────────────────────────────────────────────

  @Mutation(() => Discussion)
  async createDiscussion(
    @CurrentUser() user: User,
    @Args('input') input: CreateDiscussionInput,
  ): Promise<Discussion> {
    return this.discussionsService.createDiscussion(
      user.tenantId,
      user.id,
      input,
    );
  }

  @Mutation(() => DiscussionReply)
  async replyToDiscussion(
    @CurrentUser() user: User,
    @Args('input') input: CreateDiscussionReplyInput,
  ): Promise<DiscussionReply> {
    return this.discussionsService.createReply(user.tenantId, user.id, input);
  }

  @Mutation(() => Discussion)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async pinDiscussion(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Discussion> {
    return this.discussionsService.pinDiscussion(id, user.tenantId);
  }

  @Mutation(() => Discussion)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async lockDiscussion(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Discussion> {
    return this.discussionsService.lockDiscussion(id, user.tenantId);
  }

  @Mutation(() => Discussion)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async markDiscussionAnswered(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Discussion> {
    return this.discussionsService.markDiscussionAnswered(id, user.tenantId);
  }

  @Mutation(() => DiscussionReply)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.TA)
  async markReplyAsAnswer(
    @CurrentUser() user: User,
    @Args('replyId') replyId: string,
  ): Promise<DiscussionReply> {
    return this.discussionsService.markReplyAsInstructorAnswer(
      replyId,
      user.tenantId,
    );
  }
}
