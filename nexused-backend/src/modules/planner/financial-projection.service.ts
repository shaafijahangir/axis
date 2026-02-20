import { Injectable } from '@nestjs/common';
import {
  TuitionConfig,
  SemesterCostResult,
  FinancialAidConfig,
  SemesterAidStatus,
} from './dto/financial-projection.types';
import { GraduationPlanResult } from './dto/graduation-planner.types';
import { PlannedSemesterData } from './entities/graduation-plan.entity';

/**
 * Pure-math service for computing tuition costs over a graduation plan.
 *
 * WHY: Financial projection logic is complex enough to warrant its own service
 * (flat-rate bands, summer overrides, mixed fee types). Keeping it separate
 * from GraduationPlannerService makes both services testable in isolation.
 *
 * PATTERN: Stateless service — no DB access. All inputs are passed as
 * arguments so the logic is pure and deterministic.
 *
 * GRAD-003: Financial Projections
 */
@Injectable()
export class FinancialProjectionService {
  /**
   * Calculate the cost for a single semester.
   *
   * BILLING MODEL:
   *  1. If `isSummer` and `config.summerPerCreditCost` is set → use that rate.
   *  2. If credits fall in [flatRateMin, flatRateMax] and flatRateCost is
   *     configured → flat rate for the band; per-credit for any credits over
   *     `flatRateMax` (e.g. 20 credits when max is 18 = flatRate + 2*perCredit).
   *  3. Otherwise → credits * perCreditCost.
   *  4. Fees are summed on top: 'per_semester' = flat amount,
   *     'per_credit' = amount * credits.
   */
  calculateSemesterCost(
    credits: number,
    isSummer: boolean,
    config: TuitionConfig,
  ): SemesterCostResult {
    const fees = config.fees ?? [];
    const feeTotal = fees.reduce((sum, fee) => {
      if (fee.type === 'per_semester') return sum + fee.amount;
      return sum + fee.amount * credits;
    }, 0);

    // ── Tuition computation ───────────────────────────────────────────
    let tuition = 0;
    let usedFlatRate = false;

    if (isSummer && config.summerPerCreditCost != null) {
      // Summer override always uses per-credit
      tuition = credits * config.summerPerCreditCost;
    } else if (
      config.flatRateCost != null &&
      config.flatRateMin != null &&
      config.flatRateMax != null &&
      credits >= config.flatRateMin
    ) {
      usedFlatRate = true;
      if (credits <= config.flatRateMax) {
        // Fully within band
        tuition = config.flatRateCost;
      } else {
        // Overload: flat rate + per-credit for excess credits
        const overload = credits - config.flatRateMax;
        const perCredit = config.perCreditCost ?? 0;
        tuition = config.flatRateCost + overload * perCredit;
      }
    } else if (config.perCreditCost != null) {
      tuition = credits * config.perCreditCost;
    }

    const total = Math.round((tuition + feeTotal) * 100) / 100;
    return {
      total,
      tuition: Math.round(tuition * 100) / 100,
      fees: Math.round(feeTotal * 100) / 100,
      usedFlatRate,
    };
  }

  /**
   * Compute per-semester and total costs for an entire graduation plan.
   *
   * Returns a parallel array to `semesters` with cost data for each, plus
   * the cumulative running total and the plan's overall estimated cost.
   */
  calculatePlanCosts(
    semesters: PlannedSemesterData[],
    config: TuitionConfig,
  ): {
    semesterCosts: (SemesterCostResult & { cumulativeCost: number })[];
    totalCost: number;
  } {
    const semesterCosts: (SemesterCostResult & { cumulativeCost: number })[] =
      [];
    let running = 0;

    for (const sem of semesters) {
      const isSummer = sem.term === 'summer';
      const cost = this.calculateSemesterCost(
        Number(sem.totalCredits),
        isSummer,
        config,
      );
      running += cost.total;
      semesterCosts.push({
        ...cost,
        cumulativeCost: Math.round(running * 100) / 100,
      });
    }

    return {
      semesterCosts,
      totalCost: Math.round(running * 100) / 100,
    };
  }

  /**
   * Enrich a GraduationPlanResult with financial projections.
   *
   * WHY: The plan result type includes optional cost fields. This method
   * fills them in when tuition config is available. When config is absent,
   * the fields stay null (frontend shows "Configure tuition rates" prompt).
   *
   * TRADEOFF: Mutates the plan result object in-place. Acceptable here
   * because this is a pure enrichment step at the edge of the service layer.
   */
  enrichPlanWithCosts(
    plan: GraduationPlanResult,
    config: TuitionConfig | null | undefined,
  ): GraduationPlanResult {
    if (!config) return plan;

    const { semesterCosts, totalCost } = this.calculatePlanCosts(
      // Convert GQL PlannedSemester → minimal PlannedSemesterData shape
      plan.semesters.map((s) => ({
        termKey: s.termKey,
        term: s.term,
        year: s.year,
        courses: s.courses.map((c) => ({
          courseId: c.courseId,
          code: c.code,
          title: c.title,
          credits: c.credits,
          fulfillsRequirement: c.fulfillsRequirement,
        })),
        totalCredits: s.totalCredits,
        cumulativeCredits: s.cumulativeCredits,
        completionPercentage: s.completionPercentage,
      })),
      config,
    );

    return {
      ...plan,
      estimatedTotalCost: totalCost,
      semesters: plan.semesters.map((sem, i) => ({
        ...sem,
        estimatedCost: semesterCosts[i]?.total ?? null,
        estimatedCumulativeCost: semesterCosts[i]?.cumulativeCost ?? null,
      })),
    };
  }

  /**
   * Format a dollar amount for display.
   * e.g. 48000 → "$48,000" | 1234.50 → "$1,234.50"
   */
  formatCost(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // ─── Financial Aid Status ────────────────────────────────────────────

  /**
   * Compute financial aid eligibility status for a single semester.
   *
   * THRESHOLDS:
   *   - aidWarning (yellow): semester credits < fullTimeThreshold
   *     Below half-time → stronger message
   *   - sapWarning (red): cumulative credits ≥ 90% of the SAP limit
   *     SAP limit = totalRequired * maxTimeframePercent / 100
   *
   * WHY pure function: No DB access, deterministic, easy to unit test.
   */
  checkSemesterAidStatus(
    semesterCredits: number,
    cumulativeCredits: number,
    totalRequired: number,
    config: FinancialAidConfig,
  ): SemesterAidStatus {
    const fullTimeThreshold = config.fullTimeThreshold ?? 12;
    const halfTimeThreshold = config.halfTimeThreshold ?? 6;
    const maxTimeframePercent = config.maxTimeframePercent ?? 150;

    const isFullTime = semesterCredits >= fullTimeThreshold;
    const isHalfTime = semesterCredits >= halfTimeThreshold;

    // ── Enrollment intensity warning ──────────────────────────────────
    let aidWarning: string | undefined;
    if (!isFullTime) {
      if (!isHalfTime) {
        aidWarning = `Below half-time (${semesterCredits} < ${halfTimeThreshold} credits) — significant impact on financial aid eligibility`;
      } else {
        aidWarning = `Below full-time (${semesterCredits} < ${fullTimeThreshold} credits) — may affect financial aid`;
      }
    }

    // ── SAP maximum timeframe warning ─────────────────────────────────
    // SAP limit = total required credits * (maxTimeframePercent / 100)
    // Warn when cumulative credits reach 90% of that limit.
    let sapWarning: string | undefined;
    if (totalRequired > 0) {
      const sapLimit = totalRequired * (maxTimeframePercent / 100);
      const pct = Math.round((cumulativeCredits / totalRequired) * 100);

      if (cumulativeCredits >= sapLimit) {
        sapWarning = `At ${pct}% of maximum timeframe (${maxTimeframePercent}% limit) — contact financial aid office immediately`;
      } else if (cumulativeCredits >= sapLimit * 0.9) {
        sapWarning = `Approaching maximum timeframe (${pct}% of ${maxTimeframePercent}% limit) — review SAP status with financial aid office`;
      }
    }

    return { isFullTime, isHalfTime, aidWarning, sapWarning };
  }

  /**
   * Annotate each semester in a GraduationPlanResult with its financial
   * aid eligibility status.
   *
   * WHY: Like enrichPlanWithCosts(), this is a pure enrichment step that
   * runs after the plan is built. Keeping it here keeps GraduationPlannerService
   * thin.
   *
   * When aidConfig is absent, aidStatus fields remain null on every semester.
   */
  enrichPlanWithAidStatus(
    plan: GraduationPlanResult,
    aidConfig: FinancialAidConfig | null | undefined,
  ): GraduationPlanResult {
    if (!aidConfig) return plan;

    // totalRequired ≈ completed + planned (the plan covers exactly what's needed)
    const totalRequired = plan.totalCreditsCompleted + plan.totalCreditsPlanned;
    if (totalRequired === 0) return plan;

    return {
      ...plan,
      semesters: plan.semesters.map((sem) => ({
        ...sem,
        aidStatus: this.checkSemesterAidStatus(
          sem.totalCredits,
          sem.cumulativeCredits,
          totalRequired,
          aidConfig,
        ),
      })),
    };
  }
}
