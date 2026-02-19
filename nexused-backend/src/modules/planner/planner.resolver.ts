import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities';
import { DegreeProgram } from '../../database/entities/degree-program.entity';
import { StudentDegreeProfile } from '../../database/entities/student-degree-profile.entity';
import { PlannerService } from './planner.service';
import {
  CreateDegreeProgramInput,
  UpdateDegreeProgramInput,
  CreateStudentProfileInput,
  UpdateStudentProfileInput,
  DegreeProgress,
  EligibleCourse,
  PrerequisiteCheckResult,
} from './dto/planner.types';

/**
 * GraphQL resolver for the degree planner feature.
 *
 * WHY: Provides admin CRUD for degree programs, student CRUD for
 * profiles, and progress/eligibility queries that both the frontend
 * and AI Course Planner agent consume.
 *
 * PATTERN: Role-gated mutations, tenant-scoped queries.
 * Admins manage degree programs. Students view their own progress.
 */
@Resolver()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlannerResolver {
  constructor(private plannerService: PlannerService) {}

  // ─── Degree Program Queries/Mutations (Admin) ─────────────────────────

  @Query(() => [DegreeProgram])
  async degreePrograms(@CurrentUser() user: User): Promise<DegreeProgram[]> {
    // Admins see all; students see only active programs
    if (user.roles.includes(UserRole.ADMIN)) {
      return this.plannerService.findDegreePrograms(user.tenantId);
    }
    return this.plannerService.findActivePrograms(user.tenantId);
  }

  @Query(() => DegreeProgram)
  async degreeProgram(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<DegreeProgram> {
    return this.plannerService.findDegreeProgramOrFail(id, user.tenantId);
  }

  @Mutation(() => DegreeProgram)
  @Roles(UserRole.ADMIN)
  async createDegreeProgram(
    @CurrentUser() user: User,
    @Args('input') input: CreateDegreeProgramInput,
  ): Promise<DegreeProgram> {
    return this.plannerService.createDegreeProgram(user.tenantId, input);
  }

  @Mutation(() => DegreeProgram)
  @Roles(UserRole.ADMIN)
  async updateDegreeProgram(
    @CurrentUser() user: User,
    @Args('input') input: UpdateDegreeProgramInput,
  ): Promise<DegreeProgram> {
    return this.plannerService.updateDegreeProgram(user.tenantId, input);
  }

  // ─── Student Profile Queries/Mutations ────────────────────────────────

  @Query(() => [StudentDegreeProfile])
  async myDegreeProfiles(
    @CurrentUser() user: User,
  ): Promise<StudentDegreeProfile[]> {
    return this.plannerService.findStudentProfiles(user.tenantId, user.id);
  }

  @Query(() => StudentDegreeProfile)
  async studentDegreeProfile(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<StudentDegreeProfile> {
    return this.plannerService.findStudentProfileOrFail(id, user.tenantId);
  }

  @Mutation(() => StudentDegreeProfile)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  async createStudentDegreeProfile(
    @CurrentUser() user: User,
    @Args('input') input: CreateStudentProfileInput,
  ): Promise<StudentDegreeProfile> {
    // Students can only create profiles for themselves
    if (!user.roles.includes(UserRole.ADMIN) && input.userId !== user.id) {
      throw new Error('Students can only create their own degree profile');
    }
    return this.plannerService.createStudentProfile(user.tenantId, input);
  }

  @Mutation(() => StudentDegreeProfile)
  @Roles(UserRole.ADMIN, UserRole.STUDENT)
  async updateStudentDegreeProfile(
    @CurrentUser() user: User,
    @Args('input') input: UpdateStudentProfileInput,
  ): Promise<StudentDegreeProfile> {
    // Verify ownership for non-admins
    if (!user.roles.includes(UserRole.ADMIN)) {
      const profile = await this.plannerService.findStudentProfileOrFail(
        input.id,
        user.tenantId,
      );
      if (profile.userId !== user.id) {
        throw new Error('Students can only update their own degree profile');
      }
    }
    return this.plannerService.updateStudentProfile(user.tenantId, input);
  }

  // ─── Progress & Eligibility Queries ───────────────────────────────────

  @Query(() => DegreeProgress)
  async degreeProgress(
    @CurrentUser() user: User,
    @Args('profileId') profileId: string,
  ): Promise<DegreeProgress> {
    // Verify ownership for non-admins
    if (!user.roles.includes(UserRole.ADMIN)) {
      const profile = await this.plannerService.findStudentProfileOrFail(
        profileId,
        user.tenantId,
      );
      if (profile.userId !== user.id) {
        throw new Error('Students can only view their own degree progress');
      }
    }
    return this.plannerService.calculateProgress(profileId, user.tenantId);
  }

  @Query(() => [EligibleCourse])
  async eligibleCourses(
    @CurrentUser() user: User,
    @Args('profileId') profileId: string,
  ): Promise<EligibleCourse[]> {
    if (!user.roles.includes(UserRole.ADMIN)) {
      const profile = await this.plannerService.findStudentProfileOrFail(
        profileId,
        user.tenantId,
      );
      if (profile.userId !== user.id) {
        throw new Error('Students can only view their own eligible courses');
      }
    }
    return this.plannerService.findEligibleCourses(profileId, user.tenantId);
  }

  // ─── ENROLL-006: Prerequisite check ──────────────────────────────────

  /**
   * Returns per-prerequisite status for a course relative to the calling user.
   * Used by the EnrollDialog to warn students before enrolling.
   * Any authenticated user can call this (students, instructors, admins).
   */
  @Query(() => PrerequisiteCheckResult)
  async coursePrerequisites(
    @CurrentUser() user: User,
    @Args('courseId') courseId: string,
  ): Promise<PrerequisiteCheckResult> {
    return this.plannerService.checkCoursePrerequisites(
      courseId,
      user.id,
      user.tenantId,
    );
  }

  @Query(() => DegreeProgress)
  async simulateMajorChange(
    @CurrentUser() user: User,
    @Args('profileId') profileId: string,
    @Args('targetProgramId') targetProgramId: string,
  ): Promise<DegreeProgress> {
    if (!user.roles.includes(UserRole.ADMIN)) {
      const profile = await this.plannerService.findStudentProfileOrFail(
        profileId,
        user.tenantId,
      );
      if (profile.userId !== user.id) {
        throw new Error('Students can only simulate their own major change');
      }
    }
    return this.plannerService.simulateMajorChange(
      profileId,
      targetProgramId,
      user.tenantId,
    );
  }
}
