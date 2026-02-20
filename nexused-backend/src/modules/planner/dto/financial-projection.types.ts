import { ObjectType, Field, Float, InputType } from '@nestjs/graphql';
import {
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Tuition Configuration ────────────────────────────────────────────────────

/**
 * A flat fee applied every semester or per credit hour.
 *
 * Examples: "Technology fee: $150/semester", "Lab fee: $45/credit"
 */
@ObjectType('TuitionFeeResult')
@InputType('TuitionFeeInput')
export class TuitionFee {
  @Field()
  @IsString()
  name: string;

  /** Dollar amount — per semester OR multiplied by credits */
  @Field(() => Float)
  @IsNumber()
  @Min(0)
  amount: number;

  /** 'per_semester' = flat charge each term; 'per_credit' = multiplied by credits enrolled */
  @Field()
  @IsString()
  @IsIn(['per_semester', 'per_credit'])
  type: 'per_semester' | 'per_credit';
}

/**
 * Tuition pricing model for a tenant institution.
 *
 * WHY: Institutions use one of two billing models:
 *   1. Per-credit: student pays N * credits (community colleges, part-time focused)
 *   2. Flat-rate band: 12-18 credits at the same price, incentivizing full-time enrollment
 *
 * When both `flatRateCost` + `flatRateMin/Max` are configured, the flat rate
 * applies when `flatRateMin <= credits <= flatRateMax`. Below `flatRateMin`,
 * the per-credit rate applies. Above `flatRateMax`, per-credit rate applies
 * to the excess credits added to the flat rate.
 *
 * If `summerPerCreditCost` is not set, summer uses `perCreditCost`.
 * Fees are always added on top of the tuition amount.
 *
 * Stored in `Tenant.settings.tuitionConfig` (JSONB). No schema migration needed.
 */
@ObjectType('TuitionConfigResult')
@InputType('TuitionConfigInput')
export class TuitionConfig {
  /**
   * Cost per credit hour (used when below/above flat-rate band or when
   * no flat rate is configured). Required if flat rate is not set.
   */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  perCreditCost?: number;

  /** Minimum credits for flat-rate billing to apply (inclusive). e.g. 12 */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  flatRateMin?: number;

  /** Maximum credits for flat-rate billing to apply (inclusive). e.g. 18 */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  flatRateMax?: number;

  /** Flat-rate tuition cost per semester (when credits in [flatRateMin, flatRateMax]). */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  flatRateCost?: number;

  /** Per-credit cost for summer terms (if different from regular rate). */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  summerPerCreditCost?: number;

  /** Fixed and per-credit fees charged every semester (tech fee, activity fee, etc.) */
  @Field(() => [TuitionFee], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TuitionFee)
  fees?: TuitionFee[];
}

// ─── Cost Result ──────────────────────────────────────────────────────────────

/**
 * Calculated cost for a single planned semester.
 * Returned as part of GraduationPlanResult semesters.
 */
@ObjectType()
export class SemesterCostResult {
  /** Total estimated cost for this semester (tuition + fees). */
  @Field(() => Float)
  total: number;

  /** Tuition portion only (before fees). */
  @Field(() => Float)
  tuition: number;

  /** Total fees for this semester. */
  @Field(() => Float)
  fees: number;

  /** Whether this semester used the flat-rate model. */
  @Field()
  usedFlatRate: boolean;
}
