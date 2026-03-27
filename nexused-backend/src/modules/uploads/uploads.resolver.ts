import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { UploadsService } from './uploads.service';
import { FileUpload, UploadContext } from './entities/file-upload.entity';
import {
  RequestUploadInput,
  ConfirmUploadInput,
  AttachUploadInput,
  UploadRequest,
  DownloadUrl,
} from './dto/uploads.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class UploadsResolver {
  constructor(private uploadsService: UploadsService) {}

  /**
   * Phase 1: Request a presigned PUT URL. Client uploads directly to R2.
   * Returns fileId + uploadUrl. Client must call confirmUpload after PUT succeeds.
   */
  @Mutation(() => UploadRequest)
  async requestUpload(
    @CurrentUser() user: User,
    @Args('input') input: RequestUploadInput,
  ): Promise<UploadRequest> {
    return this.uploadsService.requestUpload(user.id, user.tenantId, input);
  }

  /** Phase 2: Mark the upload as confirmed after the client PUT to R2 succeeded. */
  @Mutation(() => FileUpload)
  async confirmUpload(
    @CurrentUser() user: User,
    @Args('input') input: ConfirmUploadInput,
  ): Promise<FileUpload> {
    return this.uploadsService.confirmUpload(
      input.fileId,
      user.id,
      user.tenantId,
    );
  }

  /** Link a confirmed upload to a parent entity (e.g. set contextId to submissionId). */
  @Mutation(() => FileUpload)
  async attachUpload(
    @CurrentUser() user: User,
    @Args('input') input: AttachUploadInput,
  ): Promise<FileUpload> {
    return this.uploadsService.attachToContext(
      input.fileId,
      input.contextId,
      user.id,
      user.tenantId,
    );
  }

  /** Get a short-lived presigned download URL for a private file. */
  @Query(() => DownloadUrl)
  async fileDownloadUrl(
    @CurrentUser() user: User,
    @Args('fileId') fileId: string,
  ): Promise<DownloadUrl> {
    return this.uploadsService.getDownloadUrl(fileId, user.id, user.tenantId);
  }

  /** List all confirmed uploads for a context entity. */
  @Query(() => [FileUpload])
  async contextFiles(
    @CurrentUser() user: User,
    @Args('context', { type: () => UploadContext }) context: UploadContext,
    @Args('contextId') contextId: string,
  ): Promise<FileUpload[]> {
    return this.uploadsService.findByContext(context, contextId, user.tenantId);
  }

  /** Delete a file from R2 and the database. Only the uploader can delete. */
  @Mutation(() => Boolean)
  async deleteFile(
    @CurrentUser() user: User,
    @Args('fileId') fileId: string,
  ): Promise<boolean> {
    return this.uploadsService.deleteFile(fileId, user.id, user.tenantId);
  }
}
