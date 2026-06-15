import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { User } from '../../database/entities/user.entity';
import { UploadsService } from './uploads.service';

/**
 * SPRINT-7: Daily cleanup of two classes of stale row:
 *   1. FileUploads that were issued a presigned URL but never confirmed
 *      after 24h — these are orphans. Either the upload failed mid-PUT
 *      or the user navigated away before the confirm mutation fired.
 *   2. Expired password reset tokens.
 *
 * WHY delete the R2 object too: a presigned PUT can succeed even when the
 * client never fires the confirm mutation (user closes the tab). In that case
 * the unconfirmed row DOES have a real R2 object behind it — deleting only the
 * DB row would leak storage forever. So we purge the object first, then the
 * row, and only delete rows whose object is gone (or whose deletion failed
 * harmlessly), letting the next run retry transient R2 failures.
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
    private uploadsService: UploadsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runCleanup(): Promise<void> {
    const orphans = await this.cleanupOrphanUploads();
    const tokens = await this.cleanupExpiredResetTokens();

    this.logger.log(
      `Cleanup: removed ${orphans} orphan uploads, cleared ${tokens} expired reset tokens`,
    );
  }

  /**
   * Delete the R2 object for each orphan, then remove the rows whose object is
   * confirmed gone. Rows whose R2 delete failed are left for the next run.
   */
  private async cleanupOrphanUploads(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const orphans = await this.fileRepo.find({
      where: { confirmed: false, createdAt: LessThan(cutoff) },
    });
    if (orphans.length === 0) {
      return 0;
    }

    const deletable: FileUpload[] = [];
    for (const orphan of orphans) {
      const purged = await this.uploadsService.deleteObjectByKey(orphan.key);
      if (purged) {
        deletable.push(orphan);
      }
    }

    if (deletable.length > 0) {
      await this.fileRepo.remove(deletable);
    }
    return deletable.length;
  }

  private async cleanupExpiredResetTokens(): Promise<number> {
    const result = await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({
        resetToken: null as unknown as string,
        resetTokenExpiry: null as unknown as Date,
      })
      .where('resetTokenExpiry IS NOT NULL')
      .andWhere('resetTokenExpiry < :now', { now: new Date() })
      .execute();
    return result.affected ?? 0;
  }
}
