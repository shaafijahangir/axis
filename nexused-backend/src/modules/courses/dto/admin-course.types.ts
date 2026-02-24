import { InputType, Field, Int } from '@nestjs/graphql';
import { IsOptional, IsString, IsEnum, IsUUID, IsArray } from 'class-validator';
import { SectionStatus } from '../../../database/entities/course-section.entity';
import {
  EnrollmentRole,
  EnrollmentStatus,
} from '../../../database/entities/enrollment.entity';

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
  @IsUUID()
  instructorId?: string;

  @Field({ nullable: true })
  @IsOptional()
  schedule?: string;
}

@InputType()
export class AdminEnrollInput {
  @Field()
  @IsUUID()
  userId: string;

  @Field()
  @IsUUID()
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
  @IsUUID()
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
  @IsUUID('4', { each: true })
  enrollmentIds: string[];
}

@InputType()
export class BulkMoveInput {
  @Field(() => [String])
  @IsArray()
  @IsUUID('4', { each: true })
  enrollmentIds: string[];

  @Field()
  @IsUUID()
  targetSectionId: string;
}

@InputType()
export class AdminCreateSectionInput {
  @Field()
  @IsUUID()
  courseId: string;

  @Field()
  @IsUUID()
  termId: string;

  @Field()
  @IsUUID()
  instructorId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  capacity?: number;

  @Field({ nullable: true })
  @IsOptional()
  schedule?: string;
}
