import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User, UserRole } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { CourseContent } from './course-content.entity';
import { ContentService } from './content.service';
import { CreateContentInput, UpdateContentInput } from './dto/content.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class ContentResolver {
  constructor(private readonly contentService: ContentService) {}

  @Query(() => [CourseContent])
  async sectionContents(
    @Args('sectionId') sectionId: string,
    @CurrentUser() user: User,
  ): Promise<CourseContent[]> {
    const isInstructor = user.roles.some((r) =>
      [UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.TA].includes(r),
    );
    return this.contentService.findBySectionId(
      sectionId,
      user.tenantId,
      !isInstructor,
    );
  }

  @Query(() => CourseContent)
  async content(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<CourseContent> {
    return this.contentService.findById(id, user.tenantId);
  }

  @Mutation(() => CourseContent)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async createContent(
    @CurrentUser() user: User,
    @Args('input') input: CreateContentInput,
  ): Promise<CourseContent> {
    return this.contentService.create(user.id, user.tenantId, input);
  }

  @Mutation(() => CourseContent)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async updateContent(
    @CurrentUser() user: User,
    @Args('input') input: UpdateContentInput,
  ): Promise<CourseContent> {
    return this.contentService.update(user.tenantId, input);
  }

  @Mutation(() => CourseContent)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async publishContent(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('sectionId') sectionId: string,
  ): Promise<CourseContent> {
    return this.contentService.publish(id, sectionId, user.tenantId);
  }

  @Mutation(() => CourseContent)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async unpublishContent(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('sectionId') sectionId: string,
  ): Promise<CourseContent> {
    return this.contentService.unpublish(id, sectionId, user.tenantId);
  }

  @Mutation(() => Boolean)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async deleteContent(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('sectionId') sectionId: string,
  ): Promise<boolean> {
    return this.contentService.delete(id, sectionId, user.tenantId);
  }
}
