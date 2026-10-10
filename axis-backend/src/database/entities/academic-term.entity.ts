import { Entity, Column, Index } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { TenantScopedEntity } from './base.entity';

@ObjectType()
@Entity('academic_terms')
@Index(['tenantId'])
@Index(['tenantId', 'isCurrent'])
export class AcademicTerm extends TenantScopedEntity {
  @Field()
  @Column()
  name: string;

  /**
   * Calendar dates, "YYYY-MM-DD" (Postgres `date`). WHY string, not Date:
   * node-postgres returns `date` columns as strings, and exposing them as the
   * GraphQL DateTime scalar failed to serialize ("DateTime.serialize(
   * \"2026-09-02\") returned null"), breaking every academicTerms query. A
   * term boundary is a calendar day with no timezone, so a date-only string
   * is also the honest type — same as Booking.date and Attendance.date.
   */
  @Field(() => String)
  @Column({ type: 'date' })
  startDate: string;

  @Field(() => String)
  @Column({ type: 'date' })
  endDate: string;

  @Field()
  @Column({ default: false })
  isCurrent: boolean;

  /**
   * ONBOARD-001: When students can start enrolling in sections for this term.
   * WHY: Institutions control enrollment windows — registration opens weeks
   * before the term starts and closes after add/drop period.
   */
  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  enrollmentWindowStart: Date;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  enrollmentWindowEnd: Date;

  /**
   * ONBOARD-001: Deadline after which students can no longer drop without record.
   * Before this date: student drops, enrollment deleted (no transcript record).
   */
  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  dropDeadline: Date;

  /**
   * ONBOARD-001: Deadline after which students can no longer withdraw.
   * Between dropDeadline and withdrawDeadline: "W" on transcript.
   * After withdrawDeadline: student is locked in.
   */
  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  withdrawDeadline: Date;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;
}
