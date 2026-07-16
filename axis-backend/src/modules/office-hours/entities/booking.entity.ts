import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { User } from '../../../database/entities/user.entity';
import { OfficeHourBlock } from './office-hour-block.entity';

/**
 * FEAT-018: A single booked office-hours appointment against a recurring block.
 */

export enum BookingStatus {
  BOOKED = 'booked',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

registerEnumType(BookingStatus, { name: 'BookingStatus' });

@ObjectType()
@Entity('bookings')
@Index(['tenantId'])
@Index(['studentId'])
@Index(['instructorId'])
@Index(['date'])
// Composite index backing the double-booking re-check in bookSlot() and the
// per-day availability scan. Not UNIQUE: a cancelled slot must be re-bookable,
// so uniqueness of the *active* (BOOKED) row is enforced in the transaction
// (pessimistic lock on the parent block) rather than by a DB constraint —
// partial indexes aren't used anywhere else in this schema.
@Index(['blockId', 'date', 'startTime'])
export class Booking extends TenantScopedEntity {
  @Field()
  @Column()
  blockId: string;

  @Field()
  @Column()
  studentId: string;

  /**
   * Denormalized from the parent block.
   * WHY: the instructor dashboard ("my bookings") and cancel-authorization checks
   * filter by instructor on every request. Denormalizing avoids a join to
   * office_hour_blocks on the hottest read path; the block's instructor never
   * changes after creation, so there's no update-anomaly risk.
   */
  @Field()
  @Column()
  instructorId: string;

  /** Calendar day of the appointment, "YYYY-MM-DD" (Postgres `date`). */
  @Field()
  @Column({ type: 'date' })
  date: string;

  /** Slot start "HH:MM" (Postgres `time`). */
  @Field()
  @Column({ type: 'time' })
  startTime: string;

  @Field()
  @Column({ type: 'time' })
  endTime: string;

  @Field(() => BookingStatus)
  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.BOOKED,
  })
  status: BookingStatus;

  /** Optional topic the student wants to discuss. */
  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Field(() => OfficeHourBlock)
  @ManyToOne(() => OfficeHourBlock, { eager: false })
  @JoinColumn({ name: 'blockId' })
  block: OfficeHourBlock;

  @Field(() => User)
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Field(() => User)
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;
}
