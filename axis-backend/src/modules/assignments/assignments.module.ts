import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { FileUpload } from '../uploads/entities/file-upload.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { AssignmentsService } from './assignments.service';
import { AssignmentsResolver } from './assignments.resolver';
import { AssignmentAttachmentsResolver } from './assignment-attachments.resolver';
import { SubmissionAttachmentsResolver } from './submission-attachments.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      Submission,
      CourseSection,
      Enrollment,
      FileUpload,
    ]),
    UploadsModule,
  ],
  providers: [
    AssignmentsService,
    AssignmentsResolver,
    AssignmentAttachmentsResolver,
    SubmissionAttachmentsResolver,
  ],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
