import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentStudent } from '../../database/entities/parent-student.entity';
import { User } from '../../database/entities/user.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { ReportCard } from '../../database/entities/report-card.entity';
import { ParentService } from './parent.service';
import { ParentResolver } from './parent.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParentStudent,
      User,
      Enrollment,
      Assignment,
      Submission,
      ReportCard,
    ]),
  ],
  providers: [ParentService, ParentResolver],
  exports: [ParentService],
})
export class ParentModule {}
