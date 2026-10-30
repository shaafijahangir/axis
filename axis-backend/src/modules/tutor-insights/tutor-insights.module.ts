import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseSection } from '../../database/entities/course-section.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { AiConversation } from '../ai/entities/ai-conversation.entity';
import { AiMessage } from '../ai/entities/ai-message.entity';
import { AiModule } from '../ai/ai.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { TutorInsightsService } from './tutor-insights.service';
import { TutorInsightsResolver } from './tutor-insights.resolver';

/**
 * TutorInsightsModule: the instructor's view into Study Coach.
 *
 * WHY separate from AiModule: AiModule is the engine (agents, tools,
 * governance). This is a reporting feature on top of it, for a different
 * audience, and independently deletable.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseSection,
      Enrollment,
      AiConversation,
      AiMessage,
    ]),
    AiModule,
    AccessControlModule,
  ],
  providers: [TutorInsightsService, TutorInsightsResolver],
})
export class TutorInsightsModule {}
