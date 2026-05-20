import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { User, UserRole } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { AssignmentsService } from './assignments.service';
import {
  CreateAssignmentInput,
  UpdateAssignmentInput,
  ExtendDeadlinesInput,
  CreateSubmissionInput,
  GradeSubmissionInput,
  OverrideGradeInput,
  StudentCourseGrades,
  SectionGradebook,
} from './dto/assignment.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class AssignmentsResolver {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // ─── Assignment Queries ─────────────────────────────────────────────

  @Query(() => [Assignment])
  async sectionAssignments(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
  ): Promise<Assignment[]> {
    return this.assignmentsService.findBySectionId(sectionId, user.tenantId);
  }

  @Query(() => Assignment)
  async assignment(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Assignment> {
    return this.assignmentsService.findById(id, user.tenantId);
  }

  // ─── Submission Queries ─────────────────────────────────────────────

  /**
   * SEC-002 FIX: Now requires INSTRUCTOR/TA/ADMIN role.
   * Students cannot see other students' submissions.
   */
  @Query(() => [Submission])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async assignmentSubmissions(
    @CurrentUser() user: User,
    @Args('assignmentId') assignmentId: string,
  ): Promise<Submission[]> {
    return this.assignmentsService.findSubmissionsByAssignment(
      assignmentId,
      user.tenantId,
    );
  }

  @Query(() => [Submission])
  async mySubmissions(
    @CurrentUser() user: User,
    @Args('assignmentId') assignmentId: string,
  ): Promise<Submission[]> {
    return this.assignmentsService.findSubmissionsByUser(
      assignmentId,
      user.id,
      user.tenantId,
    );
  }

  @Query(() => Submission)
  async submission(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Submission> {
    return this.assignmentsService.findSubmissionById(id, user.tenantId);
  }

  // ─── Gradebook ─────────────────────────────────────────────────────

  @Query(() => SectionGradebook)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async sectionGradebook(
    @CurrentUser() user: User,
    @Args('sectionId') sectionId: string,
  ): Promise<SectionGradebook> {
    return this.assignmentsService.getSectionGradebook(
      sectionId,
      user.tenantId,
    );
  }

  @Query(() => [StudentCourseGrades])
  async myGrades(@CurrentUser() user: User): Promise<StudentCourseGrades[]> {
    return this.assignmentsService.getStudentGrades(user.id, user.tenantId);
  }

  // ─── Mutations ──────────────────────────────────────────────────────

  @Mutation(() => Assignment)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async createAssignment(
    @CurrentUser() user: User,
    @Args('input') input: CreateAssignmentInput,
  ): Promise<Assignment> {
    return this.assignmentsService.create(user.tenantId, input, user.id);
  }

  @Mutation(() => Assignment)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async updateAssignment(
    @CurrentUser() user: User,
    @Args('input') input: UpdateAssignmentInput,
  ): Promise<Assignment> {
    return this.assignmentsService.updateAssignment(
      input,
      user.id,
      user.tenantId,
    );
  }

  @Mutation(() => [Assignment])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async extendDeadlines(
    @Args('input') input: ExtendDeadlinesInput,
  ): Promise<Assignment[]> {
    return this.assignmentsService.extendDeadlines(input);
  }

  @Mutation(() => Submission)
  async submitAssignment(
    @CurrentUser() user: User,
    @Args('input') input: CreateSubmissionInput,
  ): Promise<Submission> {
    return this.assignmentsService.createSubmission(
      user.id,
      user.tenantId,
      input,
    );
  }

  @Mutation(() => Submission)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async gradeSubmission(
    @CurrentUser() user: User,
    @Args('input') input: GradeSubmissionInput,
  ): Promise<Submission> {
    return this.assignmentsService.gradeSubmission(
      user.id,
      user.tenantId,
      input,
    );
  }

  @Mutation(() => Submission)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async overrideGrade(
    @CurrentUser() user: User,
    @Args('input') input: OverrideGradeInput,
  ): Promise<Submission> {
    return this.assignmentsService.overrideGrade(user.id, user.tenantId, input);
  }
}
