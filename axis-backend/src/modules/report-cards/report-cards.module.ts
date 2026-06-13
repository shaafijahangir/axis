import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportCard } from '../../database/entities/report-card.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { Attendance } from '../../database/entities/attendance.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { AccessControlModule } from '../access-control/access-control.module';
import { ReportCardsService } from './report-cards.service';
import { ReportCardsResolver } from './report-cards.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportCard,
      Enrollment,
      CourseSection,
      Attendance,
      Assignment,
      Submission,
    ]),
    AccessControlModule,
  ],
  providers: [ReportCardsService, ReportCardsResolver],
  exports: [ReportCardsService],
})
export class ReportCardsModule {}
