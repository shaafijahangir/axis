import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Assignment } from '../../database/entities/assignment.entity';
import {
  FileUpload,
  UploadContext,
} from '../uploads/entities/file-upload.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { AssignmentsService } from './assignments.service';

/**
 * SPRINT-2: Exposes `Assignment.attachments` as a GraphQL field. These are
 * the instructor's instructions PDFs / docs that students download to
 * understand the assignment.
 *
 * Lives in its own resolver class (not AssignmentsResolver) so the @Parent
 * decorator can resolve the Assignment instance from the cached selection
 * set rather than re-fetching.
 */
@Resolver(() => Assignment)
@UseGuards(JwtAuthGuard)
export class AssignmentAttachmentsResolver {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @ResolveField(() => [FileUpload])
  async attachments(
    @CurrentUser() user: User,
    @Parent() assignment: Assignment,
  ): Promise<FileUpload[]> {
    return this.assignmentsService.findAttachments(
      UploadContext.ASSIGNMENT_INSTRUCTIONS,
      assignment.id,
      user.tenantId,
    );
  }
}
