import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { AnnouncementsModule } from '../announcements/announcements.module';
import { ContentModule } from '../content/content.module';
import { DiscussionsModule } from '../discussions/discussions.module';
import { FeedEngagement } from './entities/feed-engagement.entity';
import { FeedService } from './feed.service';
import { FeedPersonalizationService } from './feed-personalization.service';
import { FeedResolver } from './feed.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enrollment,
      Assignment,
      Submission,
      CourseSection,
      FeedEngagement,
    ]),
    AnnouncementsModule,
    ContentModule,
    DiscussionsModule,
  ],
  providers: [FeedService, FeedPersonalizationService, FeedResolver],
  exports: [FeedPersonalizationService],
})
export class FeedModule {}
