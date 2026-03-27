import { InputType, Field, ObjectType, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { UploadContext } from '../entities/file-upload.entity';

// ─── Per-context validation constraints ─────────────────────────────────────

export const UPLOAD_CONSTRAINTS: Record<
  UploadContext,
  { maxSizeBytes: number; allowedMimeTypes: string[] }
> = {
  [UploadContext.ASSIGNMENT_SUBMISSION]: {
    maxSizeBytes: 50 * 1024 * 1024, // 50 MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'application/zip',
    ],
  },
  [UploadContext.PROFILE_PICTURE]: {
    maxSizeBytes: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  [UploadContext.COURSE_CONTENT]: {
    maxSizeBytes: 100 * 1024 * 1024, // 100 MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav',
      'text/plain',
    ],
  },
  [UploadContext.IMPORT_DOCUMENT]: {
    maxSizeBytes: 20 * 1024 * 1024, // 20 MB
    allowedMimeTypes: [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
};

// ─── Input types ─────────────────────────────────────────────────────────────

@InputType()
export class RequestUploadInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  filename: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @Field(() => Int)
  @Min(1)
  @Max(100 * 1024 * 1024) // hard cap at 100 MB regardless of context
  size: number;

  @Field(() => UploadContext)
  @IsEnum(UploadContext)
  context: UploadContext;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  contextId?: string;
}

@InputType()
export class ConfirmUploadInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  fileId: string;
}

@InputType()
export class AttachUploadInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  fileId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  contextId: string;
}

// ─── Return types ─────────────────────────────────────────────────────────────

@ObjectType()
export class UploadRequest {
  @Field()
  fileId: string;

  @Field()
  uploadUrl: string;

  @Field()
  key: string;

  /** Seconds until the presigned URL expires */
  @Field(() => Int)
  expiresIn: number;
}

@ObjectType()
export class DownloadUrl {
  @Field()
  url: string;

  @Field(() => Int)
  expiresIn: number;
}
