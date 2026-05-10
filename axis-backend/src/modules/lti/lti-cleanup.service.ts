import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LtiService } from './lti.service';

/**
 * LTI Cleanup Service
 *
 * Periodically cleans up expired LTI states to prevent database bloat.
 * States expire after 10 minutes (configurable), so we clean up
 * every 15 minutes to ensure no orphaned records.
 */
@Injectable()
export class LtiCleanupService {
  private readonly logger = new Logger(LtiCleanupService.name);

  constructor(private ltiService: LtiService) {}

  /**
   * Clean up expired LTI states every 15 minutes
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredStates(): Promise<void> {
    try {
      const count = await this.ltiService.cleanupExpiredStates();
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} expired LTI states`);
      }
    } catch (error) {
      this.logger.error('Failed to clean up expired LTI states', error);
    }
  }
}
