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
  CreateSubmissionInput,
  GradeSubmissionInput,
} from './dto/assignment.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class AssignmentsResolver {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // ─── Assignment Queries ─────────────────────────────────────────────

  @Query(() => [Assignment])
  async sectionAssignments(
    @Args('sectionId') sectionId: string,
  ): Promise<Assignment[]> {
    return this.assignmentsService.findBySectionId(sectionId);
  }

  @Query(() => Assignment)
  async assignment(@Args('id') id: string): Promise<Assignment> {
    return this.assignmentsService.findById(id);
  }

  // ─── Submission Queries ─────────────────────────────────────────────

  @Query(() => [Submission])
  async assignmentSubmissions(
    @Args('assignmentId') assignmentId: string,
  ): Promise<Submission[]> {
    return this.assignmentsService.findSubmissionsByAssignment(assignmentId);
  }

  @Query(() => [Submission])
  async mySubmissions(
    @CurrentUser() user: User,
    @Args('assignmentId') assignmentId: string,
  ): Promise<Submission[]> {
    return this.assignmentsService.findSubmissionsByUser(assignmentId, user.id);
  }

  @Query(() => Submission)
  async submission(@Args('id') id: string): Promise<Submission> {
    return this.assignmentsService.findSubmissionById(id);
  }

  // ─── Mutations ──────────────────────────────────────────────────────

  @Mutation(() => Assignment)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async createAssignment(
    @Args('input') input: CreateAssignmentInput,
  ): Promise<Assignment> {
    return this.assignmentsService.create(input);
  }

  @Mutation(() => Submission)
  async submitAssignment(
    @CurrentUser() user: User,
    @Args('input') input: CreateSubmissionInput,
  ): Promise<Submission> {
    return this.assignmentsService.createSubmission(user.id, input);
  }

  @Mutation(() => Submission)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async gradeSubmission(
    @CurrentUser() user: User,
    @Args('input') input: GradeSubmissionInput,
  ): Promise<Submission> {
    return this.assignmentsService.gradeSubmission(user.id, input);
  }
}
