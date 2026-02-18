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
import {
  UpdateCourseInput,
  CatalogFilterInput,
  CatalogPage,
  CreateCourseInput,
} from './dto/course.types';
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

  // ─── Catalog Queries ────────────────────────────────────────────────────

  @Query(() => CatalogPage)
  async catalogCourses(
    @CurrentUser() user: User,
    @Args('filters', { nullable: true }) filters?: CatalogFilterInput,
  ): Promise<CatalogPage> {
    return this.coursesService.catalogCourses(user.tenantId, filters ?? {});
  }

  @Query(() => Course)
  async catalogCourse(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Course> {
    return this.coursesService.findById(id, user.tenantId);
  }

  @Query(() => [String])
  async departmentList(@CurrentUser() user: User): Promise<string[]> {
    return this.coursesService.distinctDepartments(user.tenantId);
  }

  // ─── Existing Admin Queries ──────────────────────────────────────────────

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
  async createCatalogCourse(
    @CurrentUser() user: User,
    @Args('input') input: CreateCourseInput,
  ): Promise<Course> {
    return this.coursesService.create(user.tenantId, input);
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
    @CurrentUser() user: User,
    @Args('input') input: AdminEnrollInput,
  ): Promise<Enrollment> {
    return this.coursesService.adminEnroll(user.tenantId, input);
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
    @CurrentUser() user: User,
    @Args('input') input: BulkEnrollInput,
  ): Promise<Enrollment[]> {
    return this.coursesService.bulkEnroll(user.tenantId, input);
  }
}
