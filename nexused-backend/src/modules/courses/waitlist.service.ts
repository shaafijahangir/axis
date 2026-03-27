import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, LessThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Enrollment,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { TenantService } from '../../tenant/tenant.service';
import { NexusEvents } from '../ai/events/ai-events';

/**
 * WaitlistService — manages waitlist placement, promotion, and confirmation.
 *
 * ENROLL-010: When a section is full and waitlistEnabled is true, students
 * are placed on a waitlist instead of being rejected. When a seat opens
 * (via drop/withdraw), the top waitlisted student is promoted.
 *
 * PATTERN: Separate from CoursesService to keep enrollment lifecycle
 * logic modular. CoursesService calls into WaitlistService, not the
 * other way around.
 */
@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(CourseSection)
    private readonly sectionRepo: Repository<CourseSection>,
    private readonly tenantService: TenantService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Place a student on the waitlist for a section.
   *
   * Assigns the next waitlist position and creates the enrollment
   * with WAITLISTED status.
   *
   * @returns The created waitlisted enrollment
   */
  async placeOnWaitlist(
    tenantId: string,
    userId: string,
    sectionId: string,
  ): Promise<Enrollment> {
    const policy = await this.tenantService.getEnrollmentPolicy(tenantId);

    // Check waitlist max size
    if (policy.waitlistMaxSize != null) {
      const waitlistCount = await this.enrollmentRepo.count({
        where: { sectionId, status: EnrollmentStatus.WAITLISTED },
      });
      if (waitlistCount >= policy.waitlistMaxSize) {
        throw new ForbiddenException(
          'The waitlist for this section is full. Please try another section.',
        );
      }
    }

    // Determine next position (max existing position + 1, or 1)
    const maxResult = await this.enrollmentRepo
      .createQueryBuilder('e')
      .select('MAX(e.waitlistPosition)', 'maxPos')
      .where('e.sectionId = :sectionId', { sectionId })
      .andWhere('e.status = :status', { status: EnrollmentStatus.WAITLISTED })
      .getRawOne<{ maxPos: number | null }>();

    const nextPosition = (maxResult?.maxPos ?? 0) + 1;

    const enrollment = this.enrollmentRepo.create({
      tenantId,
      userId,
      sectionId,
      status: EnrollmentStatus.WAITLISTED,
      waitlistPosition: nextPosition,
      waitlistConfirmBy: null,
      enrolledAt: new Date(),
    });

    const saved = await this.enrollmentRepo.save(enrollment);

    this.logger.log(
      `User ${userId} placed on waitlist for section ${sectionId} at position ${nextPosition}`,
    );

    return saved;
  }

  /**
   * Promote the top waitlisted student for a section when a seat opens.
   *
   * If waitlistAutoPromote is true: directly activates the enrollment.
   * If false: sets a confirmation deadline and waits for student action.
   *
   * Called by CoursesService after a drop/withdraw frees a seat.
   */
  async promoteFromWaitlist(
    sectionId: string,
    tenantId: string,
  ): Promise<Enrollment | null> {
    const policy = await this.tenantService.getEnrollmentPolicy(tenantId);
    if (!policy.waitlistEnabled) return null;

    // Check if there's actually a seat available now
    const section = await this.sectionRepo.findOne({
      where: { id: sectionId },
    });
    if (!section || section.capacity == null) return null;

    const activeCount = await this.enrollmentRepo.count({
      where: {
        sectionId,
        status: In([EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING]),
      },
    });

    if (activeCount >= section.capacity) return null;

    // Find the top waitlisted student (lowest position)
    const topWaitlisted = await this.enrollmentRepo.findOne({
      where: {
        sectionId,
        status: EnrollmentStatus.WAITLISTED,
        waitlistConfirmBy: IsNull(), // not already in confirmation window
      },
      order: { waitlistPosition: 'ASC' },
    });

    if (!topWaitlisted) return null;

    if (policy.waitlistAutoPromote) {
      // Direct promotion — activate immediately
      return this.activateWaitlistedEnrollment(topWaitlisted, tenantId);
    } else {
      // Set confirmation window
      const confirmBy = new Date();
      confirmBy.setHours(
        confirmBy.getHours() + policy.waitlistConfirmationHours,
      );

      await this.enrollmentRepo.update(topWaitlisted.id, {
        waitlistConfirmBy: confirmBy,
      });

      this.logger.log(
        `Waitlist promotion offered to user ${topWaitlisted.userId} ` +
          `for section ${sectionId}. Confirm by ${confirmBy.toISOString()}`,
      );

      return this.enrollmentRepo.findOneOrFail({
        where: { id: topWaitlisted.id },
      });
    }
  }

  /**
   * Student confirms their waitlist promotion and becomes actively enrolled.
   */
  async confirmWaitlistPromotion(
    enrollmentId: string,
    userId: string,
    tenantId: string,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId, tenantId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.userId !== userId) {
      throw new ForbiddenException(
        'You can only confirm your own waitlist promotion',
      );
    }
    if (enrollment.status !== EnrollmentStatus.WAITLISTED) {
      throw new ForbiddenException(
        'This enrollment is not in waitlisted status',
      );
    }
    if (!enrollment.waitlistConfirmBy) {
      throw new ForbiddenException(
        'No promotion has been offered for this enrollment yet',
      );
    }

    // Check if confirmation window has expired
    if (new Date() > enrollment.waitlistConfirmBy) {
      throw new ForbiddenException(
        'The confirmation window has expired. You have been moved back on the waitlist.',
      );
    }

    return this.activateWaitlistedEnrollment(enrollment, tenantId);
  }

  /**
   * Student cancels their waitlist entry voluntarily.
   */
  async cancelWaitlistEntry(
    enrollmentId: string,
    userId: string,
    tenantId: string,
  ): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId, tenantId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (enrollment.userId !== userId) {
      throw new ForbiddenException(
        'You can only cancel your own waitlist entry',
      );
    }
    if (enrollment.status !== EnrollmentStatus.WAITLISTED) {
      throw new ForbiddenException(
        'This enrollment is not in waitlisted status',
      );
    }

    await this.enrollmentRepo.update(enrollmentId, {
      status: EnrollmentStatus.DROPPED,
      waitlistPosition: null,
      waitlistConfirmBy: null,
    });

    // Reorder remaining waitlist positions
    await this.reorderWaitlist(enrollment.sectionId);

    return this.enrollmentRepo.findOneOrFail({
      where: { id: enrollmentId },
    });
  }

  /**
   * Get the waitlist position for a specific enrollment.
   */
  async getWaitlistPosition(
    enrollmentId: string,
    tenantId: string,
  ): Promise<number | null> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { id: enrollmentId, tenantId },
    });
    if (!enrollment) return null;
    if (enrollment.status !== EnrollmentStatus.WAITLISTED) return null;
    return enrollment.waitlistPosition;
  }

  /**
   * Process expired confirmation windows.
   *
   * When a promoted student doesn't confirm in time:
   * 1. Move them back to the end of the waitlist
   * 2. Promote the next student
   *
   * Called periodically (e.g. by a scheduled job or on-demand check).
   */
  async processExpiredConfirmations(): Promise<number> {
    const now = new Date();

    // Find all enrollments with expired confirmation windows
    const expired = await this.enrollmentRepo.find({
      where: {
        status: EnrollmentStatus.WAITLISTED,
        waitlistConfirmBy: LessThanOrEqual(now),
      },
      relations: ['section', 'section.course'],
    });

    let processedCount = 0;

    for (const enrollment of expired) {
      const tenantId = enrollment.tenantId;

      // Move to end of waitlist
      const maxResult = await this.enrollmentRepo
        .createQueryBuilder('e')
        .select('MAX(e.waitlistPosition)', 'maxPos')
        .where('e.sectionId = :sectionId', { sectionId: enrollment.sectionId })
        .andWhere('e.status = :status', {
          status: EnrollmentStatus.WAITLISTED,
        })
        .getRawOne<{ maxPos: number | null }>();

      const endPosition = (maxResult?.maxPos ?? 0) + 1;

      await this.enrollmentRepo.update(enrollment.id, {
        waitlistPosition: endPosition,
        waitlistConfirmBy: null,
      });

      this.logger.log(
        `Expired confirmation for user ${enrollment.userId} in section ` +
          `${enrollment.sectionId}. Moved to waitlist position ${endPosition}.`,
      );

      // Try to promote the next student
      await this.promoteFromWaitlist(enrollment.sectionId, tenantId);
      processedCount++;
    }

    return processedCount;
  }

  /**
   * Get the count of waitlisted students for a section.
   */
  async getWaitlistCount(sectionId: string): Promise<number> {
    return this.enrollmentRepo.count({
      where: { sectionId, status: EnrollmentStatus.WAITLISTED },
    });
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  /**
   * Activate a waitlisted enrollment: set ACTIVE, clear waitlist fields,
   * reorder the remaining waitlist, and fire the event.
   */
  private async activateWaitlistedEnrollment(
    enrollment: Enrollment,
    tenantId: string,
  ): Promise<Enrollment> {
    await this.enrollmentRepo.update(enrollment.id, {
      status: EnrollmentStatus.ACTIVE,
      waitlistPosition: null,
      waitlistConfirmBy: null,
    });

    // Reorder remaining waitlist
    await this.reorderWaitlist(enrollment.sectionId);

    this.eventEmitter.emit(NexusEvents.ENROLLMENT_CREATED, {
      enrollmentId: enrollment.id,
      userId: enrollment.userId,
      sectionId: enrollment.sectionId,
      tenantId,
    });

    this.logger.log(
      `Waitlisted user ${enrollment.userId} promoted to ACTIVE in section ${enrollment.sectionId}`,
    );

    return this.enrollmentRepo.findOneOrFail({
      where: { id: enrollment.id },
    });
  }

  /**
   * Reorder waitlist positions for a section so they're sequential (1, 2, 3, ...).
   * Called after a student is promoted or cancels.
   */
  private async reorderWaitlist(sectionId: string): Promise<void> {
    const waitlisted = await this.enrollmentRepo.find({
      where: { sectionId, status: EnrollmentStatus.WAITLISTED },
      order: { waitlistPosition: 'ASC' },
    });

    for (let i = 0; i < waitlisted.length; i++) {
      const correctPosition = i + 1;
      if (waitlisted[i].waitlistPosition !== correctPosition) {
        await this.enrollmentRepo.update(waitlisted[i].id, {
          waitlistPosition: correctPosition,
        });
      }
    }
  }
}
