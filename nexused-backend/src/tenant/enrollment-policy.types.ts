import {
  ObjectType,
  Field,
  InputType,
  Int,
  registerEnumType,
} from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum PrerequisiteEnforcement {
  STRICT = 'strict', // Block enrollment if prerequisites not met
  WARN = 'warn', // Allow but log warning (default — supports late admits, transfer)
  OFF = 'off', // No prerequisite checking
}

registerEnumType(PrerequisiteEnforcement, {
  name: 'PrerequisiteEnforcement',
  description:
    'How strictly prerequisite requirements are enforced during enrollment',
});

/**
 * EnrollmentPolicy — persisted as tenant.settings.enrollmentPolicy JSONB.
 *
 * WHY JSONB not a table: Policy is a singleton per tenant, changes rarely,
 * and the Tenant entity already has a settings column. Adding a table would
 * require a new migration and a 1:1 relation for no gain.
 */
@ObjectType()
export class EnrollmentPolicy {
  @Field(() => PrerequisiteEnforcement)
  prerequisiteEnforcement: PrerequisiteEnforcement;

  /** Max credits a student may take in a single term. null = unlimited. */
  @Field(() => Int, { nullable: true })
  creditHourLimitPerTerm: number | null;

  /** ISO 8601 date-time string. null = no window restriction. */
  @Field({ nullable: true })
  enrollmentWindowStart: string | null;

  @Field({ nullable: true })
  enrollmentWindowEnd: string | null;
}

@InputType()
export class UpdateEnrollmentPolicyInput {
  @Field(() => PrerequisiteEnforcement, { nullable: true })
  @IsOptional()
  @IsEnum(PrerequisiteEnforcement)
  prerequisiteEnforcement?: PrerequisiteEnforcement;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  creditHourLimitPerTerm?: number | null;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  enrollmentWindowStart?: string | null;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  enrollmentWindowEnd?: string | null;
}

export const DEFAULT_ENROLLMENT_POLICY: EnrollmentPolicy = {
  prerequisiteEnforcement: PrerequisiteEnforcement.WARN,
  creditHourLimitPerTerm: 18,
  enrollmentWindowStart: null,
  enrollmentWindowEnd: null,
};
