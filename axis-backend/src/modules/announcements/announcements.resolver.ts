import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Announcement } from '../../database/entities/announcement.entity';
import { User, UserRole } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementInput } from './dto/announcement.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class AnnouncementsResolver {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Query(() => [Announcement])
  async sectionAnnouncements(
    @Args('sectionId') sectionId: string,
  ): Promise<Announcement[]> {
    return this.announcementsService.findBySectionId(sectionId);
  }

  /**
   * School-wide and grade-level announcements visible to the current user.
   * SPRINT-3: defaults `grade` to the caller's own gradeLevel so students
   * automatically see announcements targeted at their grade without the
   * client having to know its own grade level.
   */
  @Query(() => [Announcement])
  async schoolAnnouncements(
    @CurrentUser() user: User,
    @Args('grade', { type: () => Int, nullable: true }) grade?: number,
  ): Promise<Announcement[]> {
    const effectiveGrade = grade ?? user.gradeLevel ?? undefined;
    return this.announcementsService.findSchoolWide(
      user.tenantId,
      effectiveGrade,
    );
  }

  /** All announcements for the tenant — used by admin feed. */
  @Query(() => [Announcement])
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async allAnnouncements(@CurrentUser() user: User): Promise<Announcement[]> {
    return this.announcementsService.findAllForTenant(user.tenantId);
  }

  @Mutation(() => Announcement)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async createAnnouncement(
    @CurrentUser() user: User,
    @Args('input') input: CreateAnnouncementInput,
  ): Promise<Announcement> {
    return this.announcementsService.create(user.id, input);
  }
}
