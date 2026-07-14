import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { User } from '../../../database/entities/user.entity';

/**
 * FEAT-018: Recurring weekly office-hours availability defined by an instructor.
 *
 * WHY a separate entity (not a JSONB blob on User): office hours are queried,
 * booked against, and joined to bookings — they need indexes and referential
 * integrity, which a JSONB field can't provide.
 */

export enum OfficeHourDay {
  MON = 'mon',
  TUE = 'tue',
  WED = 'wed',
  THU = 'thu',
  FRI = 'fri',
}

/**
 * Where the meeting happens. IN_PERSON pairs with `location` (building + room,
 * e.g. "ECS 618" — the format UVic/SFU directories use, see shaafilook.md §2).
 * ZOOM pairs with `meetingUrl`.
 */
export enum OfficeHourLocationType {
  IN_PERSON = 'in_person',
  ZOOM = 'zoom',
}

registerEnumType(OfficeHourDay, { name: 'OfficeHourDay' });
registerEnumType(OfficeHourLocationType, { name: 'OfficeHourLocationType' });

@ObjectType()
@Entity('office_hour_blocks')
@Index(['tenantId'])
@Index(['instructorId'])
@Index(['instructorId', 'active'])
export class OfficeHourBlock extends TenantScopedEntity {
  @Field()
  @Column()
  instructorId: string;

  @Field(() => OfficeHourDay)
  @Column({ type: 'enum', enum: OfficeHourDay })
  dayOfWeek: OfficeHourDay;

  /** "HH:MM" 24h — Postgres `time`, matching CourseSection's schedule columns. */
  @Field()
  @Column({ type: 'time' })
  startTime: string;

  @Field()
  @Column({ type: 'time' })
  endTime: string;

  /** Length of each bookable slot in minutes. 15 by default. */
  @Field(() => Int)
  @Column({ type: 'int', default: 15 })
  slotMinutes: number;

  @Field(() => OfficeHourLocationType)
  @Column({
    type: 'enum',
    enum: OfficeHourLocationType,
    default: OfficeHourLocationType.IN_PERSON,
  })
  locationType: OfficeHourLocationType;

  /** Building + room for IN_PERSON blocks, e.g. "ECS 618". Null for Zoom. */
  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  location: string | null;

  /** Meeting URL for ZOOM blocks. Null for in-person. */
  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 512, nullable: true })
  meetingUrl: string | null;

  /** Soft on/off switch. Deactivated blocks stop offering new slots but keep history. */
  @Field()
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Field(() => User)
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;
}
