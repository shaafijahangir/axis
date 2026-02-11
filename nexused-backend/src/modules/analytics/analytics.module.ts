import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  Course,
  CourseSection,
  Enrollment,
  Assignment,
  Submission,
} from '../../database/entities';
import { AiConversation } from '../ai/entities/ai-conversation.entity';
import { AiUsageLog } from '../ai/entities/ai-usage-log.entity';
import { AnalyticsService } from './analytics.service';
import { AnalyticsResolver } from './analytics.resolver';

/**
 * AnalyticsModule provides admin dashboard metrics.
 *
 * WHY: Admins need visibility into institution-wide performance,
 * user engagement, academic outcomes, and AI usage/costs.
 *
 * PATTERN: Read-only module that aggregates data from other modules.
 * No entities of its own — just queries against existing tables.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Course,
      CourseSection,
      Enrollment,
      Assignment,
      Submission,
      AiConversation,
      AiUsageLog,
    ]),
  ],
  providers: [AnalyticsService, AnalyticsResolver],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
