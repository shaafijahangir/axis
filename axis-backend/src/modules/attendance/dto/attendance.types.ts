import { InputType, ObjectType, Field, Float, Int } from '@nestjs/graphql';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AttendanceStatus } from '../../../database/entities/attendance.entity';

@InputType()
export class AttendanceRecordInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  studentId: string;

  @Field(() => AttendanceStatus)
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

@InputType()
export class MarkAttendanceInput {
  @Field()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  sectionId: string;

  @Field()
  @IsDateString()
  date: string;

  @Field(() => [AttendanceRecordInput])
  records: AttendanceRecordInput[];
}

@ObjectType()
export class AttendanceRecord {
  @Field()
  id: string;

  @Field()
  userId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => AttendanceStatus)
  status: AttendanceStatus;

  @Field({ nullable: true })
  notes?: string;
}

@ObjectType()
export class DayAttendance {
  @Field()
  date: string;

  @Field(() => [AttendanceRecord])
  records: AttendanceRecord[];
}

@ObjectType()
export class StudentAttendanceSummary {
  @Field()
  userId: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  present: number;

  @Field(() => Int)
  absent: number;

  @Field(() => Int)
  late: number;

  @Field(() => Int)
  excused: number;

  @Field(() => Float)
  attendanceRate: number;
}
