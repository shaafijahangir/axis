import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
  Course,
  CourseSection,
  Enrollment,
  User,
} from '../../database/entities';
import { UserRole } from '../../database/entities/user.entity';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { UpdateCourseInput } from './dto/course.types';
import {
  UpdateSectionInput,
  AdminEnrollInput,
  AdminUpdateEnrollmentInput,
  BulkEnrollInput,
  AdminCreateSectionInput,
} from './dto/admin-course.types';

@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCoursesResolver {
  constructor(private readonly coursesService: CoursesService) {}

  @Query(() => [CourseSection])
  async adminSections(@CurrentUser() user: User): Promise<CourseSection[]> {
    return this.coursesService.findAllSectionsForTenant(user.tenantId);
  }

  @Query(() => [Enrollment])
  async adminEnrollments(
    @CurrentUser() user: User,
    @Args('sectionId', { nullable: true }) sectionId?: string,
  ): Promise<Enrollment[]> {
    return this.coursesService.findAllEnrollmentsForTenant(
      user.tenantId,
      sectionId,
    );
  }

  @Mutation(() => Course)
  async updateCourse(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('input') input: UpdateCourseInput,
  ): Promise<Course> {
    return this.coursesService.updateCourse(id, user.tenantId, input);
  }

  @Mutation(() => Boolean)
  async removeCourse(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.coursesService.removeCourse(id, user.tenantId);
  }

  @Mutation(() => CourseSection)
  async adminCreateSection(
    @Args('input') input: AdminCreateSectionInput,
  ): Promise<CourseSection> {
    return this.coursesService.adminCreateSection(input);
  }

  @Mutation(() => CourseSection)
  async updateSection(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('input') input: UpdateSectionInput,
  ): Promise<CourseSection> {
    return this.coursesService.updateSection(id, user.tenantId, input);
  }

  @Mutation(() => Boolean)
  async removeSection(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.coursesService.removeSection(id, user.tenantId);
  }

  @Mutation(() => Enrollment)
  async adminEnroll(
    @Args('input') input: AdminEnrollInput,
  ): Promise<Enrollment> {
    return this.coursesService.adminEnroll(input);
  }

  @Mutation(() => Enrollment)
  async adminUpdateEnrollment(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('input') input: AdminUpdateEnrollmentInput,
  ): Promise<Enrollment> {
    return this.coursesService.adminUpdateEnrollment(id, user.tenantId, input);
  }

  @Mutation(() => [Enrollment])
  async bulkEnroll(
    @Args('input') input: BulkEnrollInput,
  ): Promise<Enrollment[]> {
    return this.coursesService.bulkEnroll(input);
  }
}
