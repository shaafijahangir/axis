import { InputType, Field, Int } from '@nestjs/graphql';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { SectionStatus } from '../../../database/entities/course-section.entity';
import {
  EnrollmentRole,
  EnrollmentStatus,
} from '../../../database/entities/enrollment.entity';
import { MEETING_DAY_CODES, MeetingDay, TIME_REGEX } from './course.types';

@InputType()
export class UpdateSectionInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  capacity?: number;

  @Field(() => SectionStatus, { nullable: true })
  @IsOptional()
  @IsEnum(SectionStatus)
  status?: SectionStatus;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  instructorId?: string;

  // ── SPRINT-1: typed schedule fields ──
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(MEETING_DAY_CODES, { each: true })
  meetingDays?: MeetingDay[];

  @Field({ nullable: true })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'startTime must be in HH:MM (24h) format' })
  startTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'endTime must be in HH:MM (24h) format' })
  endTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  room?: string;

  /** @deprecated SPRINT-1: kept for one release. */
  @Field({ nullable: true })
  @IsOptional()
  schedule?: string;
}

@InputType()
export class AdminEnrollInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  userId: string;

  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  sectionId: string;

  @Field(() => EnrollmentRole, { nullable: true })
  @IsOptional()
  @IsEnum(EnrollmentRole)
  role?: EnrollmentRole;
}

@InputType()
export class AdminUpdateEnrollmentInput {
  @Field(() => EnrollmentStatus, { nullable: true })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @Field(() => EnrollmentRole, { nullable: true })
  @IsOptional()
  @IsEnum(EnrollmentRole)
  role?: EnrollmentRole;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  finalGrade?: string;
}

@InputType()
export class BulkEnrollInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  sectionId: string;

  @Field(() => [String])
  userIds: string[];

  @Field(() => EnrollmentRole, { nullable: true })
  @IsOptional()
  @IsEnum(EnrollmentRole)
  role?: EnrollmentRole;
}

@InputType()
export class BulkDropInput {
  @Field(() => [String])
  @IsArray()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    each: true,
  })
  enrollmentIds: string[];
}

@InputType()
export class BulkMoveInput {
  @Field(() => [String])
  @IsArray()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    each: true,
  })
  enrollmentIds: string[];

  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  targetSectionId: string;
}

@InputType()
export class AdminCreateSectionInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  courseId: string;

  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  termId: string;

  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  instructorId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  capacity?: number;

  // ── SPRINT-1: typed schedule fields ──
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(MEETING_DAY_CODES, { each: true })
  meetingDays?: MeetingDay[];

  @Field({ nullable: true })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'startTime must be in HH:MM (24h) format' })
  startTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Matches(TIME_REGEX, { message: 'endTime must be in HH:MM (24h) format' })
  endTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  room?: string;

  /** @deprecated SPRINT-1: kept for one release. */
  @Field({ nullable: true })
  @IsOptional()
  schedule?: string;
}
