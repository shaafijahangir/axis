import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseSection } from '../../database/entities/course-section.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { ParentStudent } from '../../database/entities/parent-student.entity';
import { AccessControlService } from './access-control.service';

/**
 * ARCH-008: Import this module wherever a resolver needs resource-level
 * authorization. Deliberately tiny — it owns no resolvers and no mutations,
 * only the assertion service.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseSection,
      Enrollment,
      Assignment,
      Submission,
      ParentStudent,
    ]),
  ],
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
