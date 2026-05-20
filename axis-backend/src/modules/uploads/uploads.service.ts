import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { FileUpload, UploadContext } from './entities/file-upload.entity';
import {
  RequestUploadInput,
  UPLOAD_CONSTRAINTS,
  UploadRequest,
  DownloadUrl,
} from './dto/uploads.types';

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private s3: S3Client;
  private bucket: string;
  private uploadUrlExpiry: number;
  private downloadUrlExpiry: number;

  constructor(
    @InjectRepository(FileUpload)
    private fileRepo: Repository<FileUpload>,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const endpoint = this.configService.get<string>('storage.endpoint');
    const region = this.configService.get<string>('storage.region');
    const accessKeyId = this.configService.get<string>('storage.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'storage.secretAccessKey',
    );

    this.bucket = this.configService.get<string>('storage.bucket') ?? 'Axis';
    this.uploadUrlExpiry =
      this.configService.get<number>('storage.uploadUrlExpiry') ?? 900;
    this.downloadUrlExpiry =
      this.configService.get<number>('storage.downloadUrlExpiry') ?? 3600;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'Storage credentials not configured — file uploads will fail. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env',
      );
    }

    // SPRINT-7: MinIO (used locally) requires path-style addressing
    // (http://host:port/bucket/key). Cloudflare R2 and AWS S3 both
    // support virtual-host style (http://bucket.host/key) and prefer
    // it. We detect MinIO via the endpoint and toggle accordingly.
    const isMinio =
      !!endpoint && /localhost|127\.0\.0\.1|minio/i.test(endpoint);

    this.s3 = new S3Client({
      region: region ?? 'auto',
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId: accessKeyId ?? '',
        secretAccessKey: secretAccessKey ?? '',
      },
      forcePathStyle: isMinio,
      // AWS SDK v3 adds x-amz-checksum-crc32 to PUTs by default.
      // MinIO doesn't accept that header and returns 403. R2 accepts
      // either. We disable per-request checksums so the presigned URL
      // doesn't include the checksum constraint.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  /**
   * Phase 1: Generate a presigned PUT URL. Client uploads directly to R2.
   * WHY direct upload: Backend never handles file bytes — no memory pressure,
   * no streaming complexity, and upload throughput is not limited by the API tier.
   */
  async requestUpload(
    userId: string,
    tenantId: string,
    input: RequestUploadInput,
  ): Promise<UploadRequest> {
    const constraints = UPLOAD_CONSTRAINTS[input.context];

    if (input.size > constraints.maxSizeBytes) {
      throw new BadRequestException(
        `File too large. Maximum size for ${input.context} is ${Math.round(constraints.maxSizeBytes / 1024 / 1024)} MB`,
      );
    }

    if (!constraints.allowedMimeTypes.includes(input.mimeType)) {
      throw new BadRequestException(
        `File type "${input.mimeType}" is not allowed for ${input.context}`,
      );
    }

    const ext = extname(input.filename).toLowerCase();
    const fileId = uuidv4();
    // Key structure: {tenantId}/{context}/{userId}/{uuid}{ext}
    // WHY: Tenant isolation at the storage level. CloudFlare R2 bucket policies
    // can restrict by prefix, and keys are unguessable.
    const key = `${tenantId}/${input.context}/${userId}/${fileId}${ext}`;

    // Create the pending (unconfirmed) record before generating the presigned URL
    // so we have a fileId to return. Unconfirmed records are excluded from all
    // data queries until Phase 2 (confirmUpload) completes.
    const record = this.fileRepo.create({
      id: fileId,
      key,
      originalName: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      context: input.context,
      contextId: input.contextId ?? null,
      uploadedById: userId,
      tenantId,
      confirmed: false,
    });
    await this.fileRepo.save(record);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: input.mimeType,
      ContentLength: input.size,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: this.uploadUrlExpiry,
    });

    return { fileId, uploadUrl, key, expiresIn: this.uploadUrlExpiry };
  }

  /**
   * Phase 2: Client calls this after a successful PUT to R2.
   * Marks the record confirmed so it appears in queries.
   */
  async confirmUpload(
    fileId: string,
    userId: string,
    tenantId: string,
  ): Promise<FileUpload> {
    const file = await this.fileRepo.findOne({
      where: { id: fileId, tenantId },
    });

    if (!file) {
      throw new NotFoundException('Upload record not found');
    }

    if (file.uploadedById !== userId) {
      throw new ForbiddenException('You did not initiate this upload');
    }

    if (file.confirmed) {
      return file; // Idempotent — already confirmed
    }

    file.confirmed = true;
    return this.fileRepo.save(file);
  }

  /**
   * Attach a confirmed upload to a parent entity (e.g. link file to submission).
   * Called after the parent entity is created/saved.
   */
  async attachToContext(
    fileId: string,
    contextId: string,
    userId: string,
    tenantId: string,
  ): Promise<FileUpload> {
    const file = await this.fileRepo.findOne({
      where: { id: fileId, tenantId, confirmed: true },
    });

    if (!file) {
      throw new NotFoundException('Confirmed upload not found');
    }

    if (file.uploadedById !== userId) {
      throw new ForbiddenException('You did not upload this file');
    }

    file.contextId = contextId;
    return this.fileRepo.save(file);
  }

  /** Get a presigned download URL for a private file. */
  async getDownloadUrl(
    fileId: string,
    userId: string,
    tenantId: string,
  ): Promise<DownloadUrl> {
    const file = await this.fileRepo.findOne({
      where: { id: fileId, tenantId, confirmed: true },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Any authenticated user in the same tenant can download.
    // Finer-grained access control (e.g. only the submitter or their instructor)
    // should be enforced by the calling context, not here.
    void userId;

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: file.key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    });

    const url = await getSignedUrl(this.s3, command, {
      expiresIn: this.downloadUrlExpiry,
    });

    return { url, expiresIn: this.downloadUrlExpiry };
  }

  /** List confirmed uploads for a specific context entity. */
  async findByContext(
    context: UploadContext,
    contextId: string,
    tenantId: string,
  ): Promise<FileUpload[]> {
    return this.fileRepo.find({
      where: { context, contextId, tenantId, confirmed: true },
      order: { createdAt: 'ASC' },
    });
  }

  /** Delete a file from R2 and remove the DB record. */
  async deleteFile(
    fileId: string,
    userId: string,
    tenantId: string,
  ): Promise<boolean> {
    const file = await this.fileRepo.findOne({
      where: { id: fileId, tenantId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.uploadedById !== userId) {
      throw new ForbiddenException('You can only delete your own files');
    }

    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: file.key }),
      );
    } catch (err) {
      // Log but don't fail — the DB record should still be cleaned up
      this.logger.error(`Failed to delete R2 object ${file.key}`, err);
    }

    await this.fileRepo.remove(file);
    return true;
  }

  /**
   * Verify a file exists in R2 (used for health checks and data integrity).
   * Returns false if the object is missing rather than throwing.
   */
  async verifyExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }
}
