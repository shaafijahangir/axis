import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { User } from '../../database/entities/user.entity';

/**
 * SPRINT-7: Daily cleanup of two classes of stale row:
 *   1. FileUploads that were issued a presigned URL but never confirmed
 *      after 24h — these are orphans. Either the upload failed mid-PUT
 *      or the user navigated away before the confirm mutation fired.
 *   2. Expired password reset tokens.
 *
 * Both safe to delete: the FileUpload row has no corresponding R2 object
 * yet (confirm step is what creates the linkage); the reset token has
 * already expired and would be rejected on use anyway.
 *
 * WHY a cron and not on-demand: lets us batch the deletions, and means
 * no user request ever pays the cleanup cost.
 */
@Injectable()
export class UploadsCleanupService {
  private readonly logger = new Logger(UploadsCleanupService.name);

  constructor(
    @InjectRepository(FileUpload)
    private fileRepo: Repository<FileUpload>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runCleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const orphanResult = await this.fileRepo
      .createQueryBuilder()
      .delete()
      .where('confirmed = false')
      .andWhere('createdAt < :cutoff', { cutoff })
      .execute();

    const tokenResult = await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({
        resetToken: null as unknown as string,
        resetTokenExpiry: null as unknown as Date,
      })
      .where('resetTokenExpiry IS NOT NULL')
      .andWhere('resetTokenExpiry < :now', { now: new Date() })
      .execute();

    this.logger.log(
      `Cleanup: removed ${orphanResult.affected ?? 0} orphan uploads, cleared ${tokenResult.affected ?? 0} expired reset tokens`,
    );
  }
}
