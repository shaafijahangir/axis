import { InputType, ObjectType, Field, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import {
  OfficeHourDay,
  OfficeHourLocationType,
} from '../entities/office-hour-block.entity';

// Shared validation fragments ------------------------------------------------
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/; // "HH:MM" 24h
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // "YYYY-MM-DD"

@InputType()
export class CreateOfficeHourBlockInput {
  @Field(() => OfficeHourDay)
  @IsEnum(OfficeHourDay)
  dayOfWeek: OfficeHourDay;

  @Field()
  @Matches(TIME_REGEX, { message: 'startTime must be "HH:MM" 24h' })
  startTime: string;

  @Field()
  @Matches(TIME_REGEX, { message: 'endTime must be "HH:MM" 24h' })
  endTime: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  slotMinutes?: number;

  @Field(() => OfficeHourLocationType)
  @IsEnum(OfficeHourLocationType)
  locationType: OfficeHourLocationType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  location?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  meetingUrl?: string;
}

@InputType()
export class UpdateOfficeHourBlockInput {
  @Field()
  @Matches(UUID_REGEX)
  id: string;

  @Field(() => OfficeHourDay, { nullable: true })
  @IsOptional()
  @IsEnum(OfficeHourDay)
  dayOfWeek?: OfficeHourDay;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'startTime must be "HH:MM" 24h' })
  startTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'endTime must be "HH:MM" 24h' })
  endTime?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  slotMinutes?: number;

  @Field(() => OfficeHourLocationType, { nullable: true })
  @IsOptional()
  @IsEnum(OfficeHourLocationType)
  locationType?: OfficeHourLocationType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  location?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  meetingUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@InputType()
export class AvailableSlotsInput {
  @Field()
  @Matches(UUID_REGEX)
  instructorId: string;

  /** Inclusive range start "YYYY-MM-DD". Defaults to today when omitted. */
  @Field({ nullable: true })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'startDate must be "YYYY-MM-DD"' })
  startDate?: string;

  /** Inclusive range end "YYYY-MM-DD". Defaults to today + 14 days. */
  @Field({ nullable: true })
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'endDate must be "YYYY-MM-DD"' })
  endDate?: string;
}

@InputType()
export class BookSlotInput {
  @Field()
  @Matches(UUID_REGEX)
  blockId: string;

  @Field()
  @Matches(DATE_REGEX, { message: 'date must be "YYYY-MM-DD"' })
  date: string;

  @Field()
  @Matches(TIME_REGEX, { message: 'startTime must be "HH:MM" 24h' })
  startTime: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@InputType()
export class CreateBusyBlockInput {
  @Field(() => OfficeHourDay)
  @IsEnum(OfficeHourDay)
  dayOfWeek: OfficeHourDay;

  @Field()
  @Matches(TIME_REGEX, { message: 'startTime must be "HH:MM" 24h' })
  startTime: string;

  @Field()
  @Matches(TIME_REGEX, { message: 'endTime must be "HH:MM" 24h' })
  endTime: string;

  /** What the time is blocked for, e.g. "Research", "Dept meeting". */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string;
}

/**
 * A single generated, still-open slot. Computed on the fly from a block minus
 * existing BOOKED bookings — never persisted, so it's an ObjectType, not an entity.
 */
@ObjectType()
export class AvailableSlot {
  @Field()
  blockId: string;

  @Field()
  instructorId: string;

  /** "YYYY-MM-DD" */
  @Field()
  date: string;

  /** "HH:MM" */
  @Field()
  startTime: string;

  /** "HH:MM" */
  @Field()
  endTime: string;

  @Field(() => OfficeHourLocationType)
  locationType: OfficeHourLocationType;

  @Field(() => String, { nullable: true })
  location: string | null;

  @Field(() => String, { nullable: true })
  meetingUrl: string | null;
}
