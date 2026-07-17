import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { User } from '../../../database/entities/user.entity';
import { OfficeHourDay } from './office-hour-block.entity';

/**
 * FEAT-019: Recurring weekly unavailability declared by an instructor
 * (research time, department meetings, personal blocks).
 *
 * WHY a separate entity (not `active: false` office-hour blocks): a busy block
 * is not a paused availability — it *suppresses* slots from any overlapping
 * office-hour block without the instructor having to edit or delete those
 * blocks. computeAvailableSlots() subtracts busy windows after expanding
 * blocks into slots.
 */
@ObjectType()
@Entity('busy_blocks')
@Index(['tenantId'])
@Index(['instructorId'])
export class BusyBlock extends TenantScopedEntity {
  @Field()
  @Column()
  instructorId: string;

  /**
   * Reuses the office-hours weekday enum — both describe a weekly grid.
   * enumName pins the Postgres type to the one FEAT-018 already created, so
   * synchronize (dev) and the migration (prod) both reuse it instead of
   * minting a duplicate `busy_blocks_dayofweek_enum`.
   */
  @Field(() => OfficeHourDay)
  @Column({
    type: 'enum',
    enum: OfficeHourDay,
    enumName: 'office_hour_blocks_dayofweek_enum',
  })
  dayOfWeek: OfficeHourDay;

  /** "HH:MM" 24h — Postgres `time`, matching the other schedule tables. */
  @Field()
  @Column({ type: 'time' })
  startTime: string;

  @Field()
  @Column({ type: 'time' })
  endTime: string;

  /** What the time is blocked for, e.g. "Research", "Dept meeting". */
  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 128, nullable: true })
  label: string | null;

  @Field(() => User)
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;
}
