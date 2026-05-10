import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from './entities/discussion.entity';
import { DiscussionReply } from './entities/discussion-reply.entity';
import { DiscussionsService } from './discussions.service';
import { DiscussionsResolver } from './discussions.resolver';
import { User } from '../../database/entities/user.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Discussion, DiscussionReply, User, Enrollment]),
    NotificationsModule,
  ],
  providers: [DiscussionsService, DiscussionsResolver],
  exports: [DiscussionsService],
})
export class DiscussionsModule {}
