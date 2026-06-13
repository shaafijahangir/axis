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
import { AccessControlService } from '../access-control/access-control.service';
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
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly accessControl: AccessControlService,
  ) {}

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
   * ARCH-008: Role check alone is not enough — the caller must be staff of
   * THIS assignment's section, not just any instructor in the tenant.
   */
  @Query(() => [Submission])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async assignmentSubmissions(
    @CurrentUser() user: User,
    @Args('assignmentId') assignmentId: string,
  ): Promise<Submission[]> {
    await this.accessControl.assertCanGradeAssignment(
      user,
      assignmentId,
      user.tenantId,
    );
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
    // ARCH-008: owner or section staff only — previously any authenticated
    // user in the tenant could fetch any submission by id.
    await this.accessControl.assertCanViewSubmission(user, id, user.tenantId);
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
    await this.accessControl.assertSectionStaff(user, sectionId, user.tenantId);
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
    await this.accessControl.assertSectionStaff(
      user,
      input.sectionId,
      user.tenantId,
    );
    return this.assignmentsService.create(user.tenantId, input, user.id);
  }

  @Mutation(() => Assignment)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async updateAssignment(
    @CurrentUser() user: User,
    @Args('input') input: UpdateAssignmentInput,
  ): Promise<Assignment> {
    // Verify against the assignment's CURRENT section — input.sectionId is
    // caller-controlled and must not widen access.
    await this.accessControl.assertCanGradeAssignment(
      user,
      input.id,
      user.tenantId,
    );
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
    @CurrentUser() user: User,
    @Args('input') input: ExtendDeadlinesInput,
  ): Promise<Assignment[]> {
    await this.accessControl.assertSectionStaff(
      user,
      input.sectionId,
      user.tenantId,
    );
    return this.assignmentsService.extendDeadlines(input, user.tenantId);
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
    await this.accessControl.assertCanGradeSubmission(
      user,
      input.submissionId,
      user.tenantId,
    );
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
    // Verify against the assignment's own section, not the caller-supplied
    // input.sectionId.
    await this.accessControl.assertCanGradeAssignment(
      user,
      input.assignmentId,
      user.tenantId,
    );
    return this.assignmentsService.overrideGrade(user.id, user.tenantId, input);
  }
}
