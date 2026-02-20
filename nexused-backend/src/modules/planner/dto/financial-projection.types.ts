import { ObjectType, Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
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

// ─── Financial Aid Configuration ──────────────────────────────────────────────

/**
 * Financial aid eligibility thresholds per tenant.
 *
 * WHY: Aid eligibility rules vary by institution and aid type (Pell Grant,
 * subsidized loans, institutional aid). Configuring these here lets NexusEd
 * flag at-risk semesters without hard-coding federal defaults (which may not
 * apply to all institutions or aid types).
 *
 * DEFAULTS (federal standards):
 *   - fullTimeThreshold: 12 credits
 *   - halfTimeThreshold: 6 credits
 *   - maxTimeframePercent: 150 (SAP rule — can't exceed 150% of program length)
 *
 * Stored in `Tenant.settings.financialAidConfig` (JSONB). No migration needed.
 *
 * GRAD-004: Financial Aid Awareness
 */
@ObjectType('FinancialAidConfigResult')
@InputType('FinancialAidConfigInput')
export class FinancialAidConfig {
  /**
   * Minimum credits per semester to be considered full-time.
   * Below this threshold → yellow "may affect aid" warning.
   * Federal default: 12 credits.
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  fullTimeThreshold?: number;

  /**
   * Minimum credits per semester to maintain half-time status.
   * Below this threshold → stronger "significant impact" warning.
   * Federal default: 6 credits.
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  halfTimeThreshold?: number;

  /**
   * Satisfactory Academic Progress (SAP) maximum timeframe as a percentage
   * of total program credits. A student cannot attempt more than this
   * percentage of the total required credits.
   *
   * Example: 150 means a 120-credit program allows at most 180 attempted credits.
   * A warning triggers when cumulative credits reach 90% of this limit.
   *
   * Federal default: 150%.
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(300)
  maxTimeframePercent?: number;
}

// ─── Aid Status Result ────────────────────────────────────────────────────────

/**
 * Financial aid eligibility status for a single planned semester.
 *
 * WHY: Students need to understand which semesters in their plan may
 * affect their financial aid before they commit to that plan. A proactive
 * warning is far better than a surprise financial aid suspension.
 *
 * Computed by FinancialProjectionService.enrichPlanWithAidStatus() when
 * the tenant has a financialAidConfig set.
 *
 * GRAD-004: Financial Aid Awareness
 */
@ObjectType()
export class SemesterAidStatus {
  /** Whether this semester meets the full-time credit threshold. */
  @Field()
  isFullTime: boolean;

  /** Whether this semester meets the half-time credit threshold. */
  @Field()
  isHalfTime: boolean;

  /**
   * Yellow warning: semester is below full-time (or half-time) threshold.
   * e.g. "Below full-time (9 < 12 credits) — may affect financial aid"
   * Null when the student is enrolled full-time.
   */
  @Field({ nullable: true })
  aidWarning?: string;

  /**
   * Red warning: cumulative credits are approaching or exceeding the SAP
   * maximum timeframe limit.
   * e.g. "At 148% of maximum timeframe (150% limit) — contact financial aid"
   * Null when the student is within safe timeframe.
   */
  @Field({ nullable: true })
  sapWarning?: string;
}
