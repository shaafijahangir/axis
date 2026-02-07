import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
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

  @Mutation(() => Announcement)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async createAnnouncement(
    @CurrentUser() user: User,
    @Args('input') input: CreateAnnouncementInput,
  ): Promise<Announcement> {
    return this.announcementsService.create(user.tenantId, user.id, input);
  }
}
