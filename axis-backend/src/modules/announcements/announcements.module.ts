import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from '../../database/entities/announcement.entity';
import { User } from '../../database/entities/user.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsResolver } from './announcements.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Announcement, User, Enrollment])],
  providers: [AnnouncementsService, AnnouncementsResolver],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
