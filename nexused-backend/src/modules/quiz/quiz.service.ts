import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuizQuestion, QuestionType } from './entities/quiz-question.entity';
import {
  AddQuizQuestionInput,
  UpdateQuizQuestionInput,
  SubmitQuizInput,
  UpdateQuizSettingsInput,
  ReorderQuestionsInput,
} from './dto/quiz.types';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { NexusEvents } from '../ai/events/ai-events';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(QuizQuestion)
    private questionRepo: Repository<QuizQuestion>,
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Question Management (Instructor) ────────────────────────────────────

  async addQuestion(
    tenantId: string,
    input: AddQuizQuestionInput,
  ): Promise<QuizQuestion> {
    await this.verifyAssignmentTenant(input.assignmentId, tenantId);

    const count = await this.questionRepo.count({
      where: { assignmentId: input.assignmentId, tenantId },
    });

    const question = this.questionRepo.create({
      tenantId,
      assignmentId: input.assignmentId,
      questionText: input.questionText,
      questionType: input.questionType,
      options: input.options ?? null,
      points: input.points,
      order: count,
    });

    return this.questionRepo.save(question);
  }

  async updateQuestion(
    id: string,
    tenantId: string,
    input: UpdateQuizQuestionInput,
  ): Promise<QuizQuestion> {
    const question = await this.questionRepo.findOne({
      where: { id, tenantId },
    });
    if (!question) throw new NotFoundException('Question not found');

    if (input.questionText !== undefined)
      question.questionText = input.questionText;
    if (input.options !== undefined) question.options = input.options ?? null;
    if (input.points !== undefined) question.points = input.points;

    return this.questionRepo.save(question);
  }

  async deleteQuestion(id: string, tenantId: string): Promise<boolean> {
    const question = await this.questionRepo.findOne({
      where: { id, tenantId },
    });
    if (!question) throw new NotFoundException('Question not found');
    await this.questionRepo.remove(question);
    return true;
  }

  async reorderQuestions(
    tenantId: string,
    input: ReorderQuestionsInput,
  ): Promise<QuizQuestion[]> {
    const questions = await this.questionRepo.find({
      where: { assignmentId: input.assignmentId, tenantId },
    });

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    const updates: QuizQuestion[] = [];
    input.orderedIds.forEach((id, index) => {
      const q = questionMap.get(id);
      if (q) {
        q.order = index;
        updates.push(q);
      }
    });

    return this.questionRepo.save(updates);
  }

  async updateQuizSettings(
    tenantId: string,
    input: UpdateQuizSettingsInput,
  ): Promise<Assignment> {
    const assignment = await this.verifyAssignmentTenant(
      input.assignmentId,
      tenantId,
    );

    if (input.maxAttempts !== undefined)
      assignment.maxAttempts = input.maxAttempts ?? null;
    if (input.timeLimitMinutes !== undefined)
      assignment.timeLimitMinutes = input.timeLimitMinutes ?? null;
    if (input.displayMode !== undefined)
      assignment.displayMode = input.displayMode ?? null;

    return this.assignmentRepo.save(assignment);
  }

  // ─── Questions (Read) ────────────────────────────────────────────────────

  /**
   * Instructor view: returns full questions including isCorrect on options.
   */
  async getQuestionsForInstructor(
    assignmentId: string,
    tenantId: string,
  ): Promise<QuizQuestion[]> {
    await this.verifyAssignmentTenant(assignmentId, tenantId);
    return this.questionRepo.find({
      where: { assignmentId, tenantId },
      order: { order: 'ASC' },
    });
  }

  /**
   * Student view: returns questions with isCorrect stripped from options.
   *
   * WHY: Sending isCorrect to the client lets determined students cheat by
   * inspecting the API response. We strip it server-side before returning.
   * TRADEOFF: Creates a second query path with data transformation.
   * Acceptable — the transformation is O(n*m) where n=questions, m=options,
   * both of which are small for any realistic quiz.
   */
  async getQuestionsForStudent(
    assignmentId: string,
    tenantId: string,
  ): Promise<QuizQuestion[]> {
    await this.verifyAssignmentTenant(assignmentId, tenantId);
    const questions = await this.questionRepo.find({
      where: { assignmentId, tenantId },
      order: { order: 'ASC' },
    });

    return questions.map((q) => ({
      ...q,
      options:
        q.options?.map(({ text }) => ({ text, isCorrect: undefined })) ?? null,
    }));
  }

  // ─── Quiz Attempt Flow ───────────────────────────────────────────────────

  /**
   * Creates a "started" submission record. The student hasn't submitted yet —
   * this just records when they began so we can enforce timeLimitMinutes.
   *
   * WHY two-step: Recording startedAt on the submission (not just client-side)
   * prevents students from manipulating the timer by pausing/reloading.
   * The server controls the start time; the client controls nothing.
   */
  async startQuiz(
    assignmentId: string,
    userId: string,
    tenantId: string,
  ): Promise<Submission> {
    const assignment = await this.verifyAssignmentTenant(
      assignmentId,
      tenantId,
    );

    // Attempt limit check
    if (assignment.maxAttempts !== null) {
      const existingCount = await this.submissionRepo.count({
        where: { assignmentId, userId },
      });
      if (existingCount >= assignment.maxAttempts) {
        throw new ForbiddenException(
          `Maximum attempts (${assignment.maxAttempts}) reached for this quiz.`,
        );
      }
    }

    // Check for an already-started (not yet submitted) attempt
    const inProgress = await this.submissionRepo.findOne({
      where: { assignmentId, userId, submittedAt: IsNull() },
    });
    if (inProgress) {
      return inProgress; // Resume the existing attempt
    }

    const existingCount = await this.submissionRepo.count({
      where: { assignmentId, userId },
    });

    const submission = this.submissionRepo.create({
      tenantId,
      assignmentId,
      userId,
      attempt: existingCount + 1,
      startedAt: new Date(),
    });

    return this.submissionRepo.save(submission);
  }

  /**
   * Finalizes the quiz: validates time limit, auto-grades MCQ/TF,
   * marks short_answer for manual grading.
   *
   * PATTERN: Auto-grading is purely additive — we sum points for questions
   * where the selected option's isCorrect === true. short_answer questions
   * are skipped; their points remain unearned until the instructor grades them.
   *
   * TRADEOFF: autoScore may be lower than the final score if short_answer
   * questions are later graded. The score field is updated by gradeSubmission
   * in the assignments service when instructors manually grade short_answer.
   */
  async submitQuiz(
    userId: string,
    tenantId: string,
    input: SubmitQuizInput,
  ): Promise<Submission> {
    const submission = await this.submissionRepo.findOne({
      where: { id: input.submissionId, userId, tenantId },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.submittedAt) {
      throw new BadRequestException('Quiz already submitted');
    }

    const assignment = await this.verifyAssignmentTenant(
      submission.assignmentId,
      tenantId,
    );

    // Time limit enforcement
    if (assignment.timeLimitMinutes !== null && submission.startedAt !== null) {
      const elapsedMs = Date.now() - new Date(submission.startedAt).getTime();
      const limitMs = assignment.timeLimitMinutes * 60 * 1000;
      // Allow 30s grace period for network latency
      if (elapsedMs > limitMs + 30_000) {
        throw new ForbiddenException('Time limit exceeded.');
      }
    }

    // Load questions for grading
    const questions = await this.questionRepo.find({
      where: { assignmentId: submission.assignmentId, tenantId },
    });

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Auto-grade MCQ + TF
    let autoScore = 0;
    let hasShortAnswer = false;

    const processedAnswers: Submission['answers'] = input.answers.map((ans) => {
      const question = questionMap.get(ans.questionId);
      if (!question) return { questionId: ans.questionId };

      if (question.options && ans.selectedOption !== undefined) {
        const selectedOpt = question.options[ans.selectedOption];
        if (selectedOpt?.isCorrect) {
          autoScore += Number(question.points);
        }
      } else if (question.questionType === QuestionType.SHORT_ANSWER) {
        hasShortAnswer = true;
      }

      return {
        questionId: ans.questionId,
        selectedOption: ans.selectedOption,
        textAnswer: ans.textAnswer,
      };
    });

    submission.answers = processedAnswers;
    submission.autoScore = autoScore;
    submission.submittedAt = new Date();

    // For MCQ/TF-only quizzes, set score immediately.
    // If short_answer present, leave score null (instructor grades manually).
    if (!hasShortAnswer) {
      submission.score = autoScore;
      submission.gradedAt = new Date();
      submission.gradedBy = 'auto';
    }

    const saved = await this.submissionRepo.save(submission);

    this.eventEmitter.emit(NexusEvents.SUBMISSION_CREATED, {
      submissionId: saved.id,
      assignmentId: submission.assignmentId,
      userId,
      tenantId,
    });

    return saved;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async verifyAssignmentTenant(
    assignmentId: string,
    tenantId: string,
  ): Promise<Assignment> {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId, tenantId },
    });
    if (!assignment)
      throw new NotFoundException('Assignment not found in this tenant');
    return assignment;
  }
}
