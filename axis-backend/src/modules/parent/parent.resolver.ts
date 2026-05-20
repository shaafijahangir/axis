import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User, UserRole } from '../../database/entities/user.entity';
import { ParentStudent } from '../../database/entities/parent-student.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { ParentService } from './parent.service';
import {
  LinkStudentInput,
  LinkedStudent,
  ParentEnrollmentItem,
  ParentGradeItem,
  ParentReportCard,
} from './dto/parent.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class ParentResolver {
  constructor(private readonly parentService: ParentService) {}

  @Mutation(() => ParentStudent)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async linkStudentToParent(
    @CurrentUser() user: User,
    @Args('input') input: LinkStudentInput,
  ): Promise<ParentStudent> {
    return this.parentService.linkStudent(user.tenantId, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async unlinkStudentFromParent(
    @CurrentUser() user: User,
    @Args('parentId') parentId: string,
    @Args('studentId') studentId: string,
  ): Promise<boolean> {
    return this.parentService.unlinkStudent(parentId, studentId, user.tenantId);
  }

  @Query(() => [LinkedStudent])
  @UseGuards(RolesGuard)
  @Roles(UserRole.PARENT)
  async myLinkedStudents(@CurrentUser() user: User): Promise<LinkedStudent[]> {
    return this.parentService.getMyStudents(user.id, user.tenantId);
  }

  @Query(() => [ParentEnrollmentItem])
  @UseGuards(RolesGuard)
  @Roles(UserRole.PARENT)
  async parentStudentEnrollments(
    @CurrentUser() user: User,
    @Args('studentId') studentId: string,
  ): Promise<ParentEnrollmentItem[]> {
    return this.parentService.getStudentEnrollments(
      user.id,
      studentId,
      user.tenantId,
    );
  }

  @Query(() => [ParentGradeItem])
  @UseGuards(RolesGuard)
  @Roles(UserRole.PARENT)
  async parentStudentGrades(
    @CurrentUser() user: User,
    @Args('studentId') studentId: string,
  ): Promise<ParentGradeItem[]> {
    return this.parentService.getStudentGrades(
      user.id,
      studentId,
      user.tenantId,
    );
  }

  @Query(() => [ParentReportCard])
  @UseGuards(RolesGuard)
  @Roles(UserRole.PARENT)
  async parentStudentReportCards(
    @CurrentUser() user: User,
    @Args('studentId') studentId: string,
  ): Promise<ParentReportCard[]> {
    return this.parentService.getStudentReportCards(
      user.id,
      studentId,
      user.tenantId,
    );
  }
}
