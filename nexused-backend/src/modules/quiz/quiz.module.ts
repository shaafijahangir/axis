import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizService } from './quiz.service';
import { QuizResolver } from './quiz.resolver';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuizQuestion, Assignment, Submission])],
  providers: [QuizService, QuizResolver],
  exports: [QuizService],
})
export class QuizModule {}
