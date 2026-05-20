import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Submission } from '../../database/entities/submission.entity';
import {
  FileUpload,
  UploadContext,
} from '../uploads/entities/file-upload.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { AssignmentsService } from './assignments.service';

/**
 * SPRINT-2: Exposes `Submission.attachments` as a GraphQL field. These are
 * the files the student uploaded with this specific submission attempt.
 *
 * Authorization: handled at the parent query level — students see only
 * their own submissions (`mySubmissions`), instructors/TAs/admins see all
 * (`assignmentSubmissions` is role-gated).
 */
@Resolver(() => Submission)
@UseGuards(JwtAuthGuard)
export class SubmissionAttachmentsResolver {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @ResolveField(() => [FileUpload])
  async attachments(
    @CurrentUser() user: User,
    @Parent() submission: Submission,
  ): Promise<FileUpload[]> {
    return this.assignmentsService.findAttachments(
      UploadContext.ASSIGNMENT_SUBMISSION,
      submission.id,
      user.tenantId,
    );
  }
}
