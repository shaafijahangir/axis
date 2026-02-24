import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizQuestion } from './entities/quiz-question.entity';
import {
  AddQuizQuestionInput,
  UpdateQuizQuestionInput,
  SubmitQuizInput,
  UpdateQuizSettingsInput,
  ReorderQuestionsInput,
} from './dto/quiz.types';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User, UserRole } from '../../database/entities/user.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';

@Resolver()
@UseGuards(JwtAuthGuard)
export class QuizResolver {
  constructor(private readonly quizService: QuizService) {}

  // ─── Queries ─────────────────────────────────────────────────────────────

  /**
   * Full question data with isCorrect — instructors only.
   */
  @Query(() => [QuizQuestion])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN)
  async quizQuestions(
    @CurrentUser() user: User,
    @Args('assignmentId') assignmentId: string,
  ): Promise<QuizQuestion[]> {
    return this.quizService.getQuestionsForInstructor(
      assignmentId,
      user.tenantId,
    );
  }

  /**
   * Questions with isCorrect stripped — for students taking the quiz.
   */
  @Query(() => [QuizQuestion])
  async studentQuizQuestions(
    @CurrentUser() user: User,
    @Args('assignmentId') assignmentId: string,
  ): Promise<QuizQuestion[]> {
    return this.quizService.getQuestionsForStudent(assignmentId, user.tenantId);
  }

  // ─── Mutations — Instructor ───────────────────────────────────────────────

  @Mutation(() => QuizQuestion)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async addQuizQuestion(
    @CurrentUser() user: User,
    @Args('input') input: AddQuizQuestionInput,
  ): Promise<QuizQuestion> {
    return this.quizService.addQuestion(user.tenantId, input);
  }

  @Mutation(() => QuizQuestion)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async updateQuizQuestion(
    @CurrentUser() user: User,
    @Args('id') id: string,
    @Args('input') input: UpdateQuizQuestionInput,
  ): Promise<QuizQuestion> {
    return this.quizService.updateQuestion(id, user.tenantId, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async deleteQuizQuestion(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<boolean> {
    return this.quizService.deleteQuestion(id, user.tenantId);
  }

  @Mutation(() => [QuizQuestion])
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async reorderQuizQuestions(
    @CurrentUser() user: User,
    @Args('input') input: ReorderQuestionsInput,
  ): Promise<QuizQuestion[]> {
    return this.quizService.reorderQuestions(user.tenantId, input);
  }

  @Mutation(() => Assignment)
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async updateQuizSettings(
    @CurrentUser() user: User,
    @Args('input') input: UpdateQuizSettingsInput,
  ): Promise<Assignment> {
    return this.quizService.updateQuizSettings(user.tenantId, input);
  }

  // ─── Mutations — Student ─────────────────────────────────────────────────

  @Mutation(() => Submission)
  async startQuiz(
    @CurrentUser() user: User,
    @Args('assignmentId') assignmentId: string,
  ): Promise<Submission> {
    return this.quizService.startQuiz(assignmentId, user.id, user.tenantId);
  }

  @Mutation(() => Submission)
  async submitQuiz(
    @CurrentUser() user: User,
    @Args('input') input: SubmitQuizInput,
  ): Promise<Submission> {
    return this.quizService.submitQuiz(user.id, user.tenantId, input);
  }
}
