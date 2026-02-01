import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { AssignmentsService } from './assignments.service';
import { AssignmentsResolver } from './assignments.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment, Submission, CourseSection])],
  providers: [AssignmentsService, AssignmentsResolver],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
