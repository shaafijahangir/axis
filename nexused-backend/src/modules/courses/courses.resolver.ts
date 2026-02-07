import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
  Course,
  CourseSection,
  Enrollment,
  User,
} from '../../database/entities';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';
import { CreateCourseInput, CreateSectionInput } from './dto/course.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class CoursesResolver {
  constructor(private readonly coursesService: CoursesService) {}

  @Query(() => [Course])
  async courses(@CurrentUser() user: User): Promise<Course[]> {
    return this.coursesService.findAllForTenant(user.tenantId);
  }

  @Query(() => Course)
  async course(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Course> {
    return this.coursesService.findById(id, user.tenantId);
  }

  @Query(() => [Enrollment])
  async myEnrollments(@CurrentUser() user: User): Promise<Enrollment[]> {
    return this.coursesService.findEnrollmentsForUser(user.id, user.tenantId);
  }

  @Query(() => [CourseSection])
  async mySections(@CurrentUser() user: User): Promise<CourseSection[]> {
    return this.coursesService.findSectionsForInstructor(
      user.id,
      user.tenantId,
    );
  }

  @Query(() => CourseSection)
  async section(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<CourseSection> {
    return this.coursesService.findSectionById(id, user.tenantId);
  }

  @Query(() => [CourseSection])
  async courseSections(
    @CurrentUser() user: User,
    @Args('courseId') courseId: string,
  ): Promise<CourseSection[]> {
    return this.coursesService.findSectionsForCourse(courseId, user.tenantId);
  }

  @Query(() => [Enrollment])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.TA)
  async sectionEnrollments(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
  ): Promise<Enrollment[]> {
    return this.coursesService.findEnrollmentsForSection(
      sectionId,
      user.tenantId,
    );
  }

  @Query(() => Int)
  async courseCount(@CurrentUser() user: User): Promise<number> {
    return this.coursesService.countCourses(user.tenantId);
  }

  @Query(() => Int)
  async sectionCount(@CurrentUser() user: User): Promise<number> {
    return this.coursesService.countSections(user.tenantId);
  }

  @Query(() => Int)
  async enrollmentCount(@CurrentUser() user: User): Promise<number> {
    return this.coursesService.countEnrollments(user.tenantId);
  }

  @Mutation(() => Course)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async createCourse(
    @CurrentUser() user: User,
    @Args('input') input: CreateCourseInput,
  ): Promise<Course> {
    return this.coursesService.create(user.tenantId, input);
  }

  @Mutation(() => CourseSection)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async createSection(
    @CurrentUser() user: User,
    @Args('input') input: CreateSectionInput,
  ): Promise<CourseSection> {
    return this.coursesService.createSection(user.id, input);
  }

  @Mutation(() => Enrollment)
  async enrollStudent(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
  ): Promise<Enrollment> {
    return this.coursesService.enrollStudent(user.id, sectionId);
  }
}
