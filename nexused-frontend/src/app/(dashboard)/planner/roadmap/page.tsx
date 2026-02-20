'use client';

/**
 * GRAD-001 / GRAD-002 / GRAD-003 / GRAD-004: Graduation Roadmap
 *
 * Displays the student's active graduation plan as a semester timeline.
 * GRAD-002 additions:
 *   - Debounced auto-regeneration on control changes.
 *   - Skip-semester checkboxes for time off.
 *   - Diff panel showing what changed vs. previous plan.
 * GRAD-003 additions:
 *   - Per-semester cost display (estimated tuition + fees).
 *   - Running total cost column.
 *   - Estimated total cost in the summary bar.
 *   - "Configure tuition rates" prompt when no tuition config is set.
 * GRAD-004 additions:
 *   - Per-semester financial aid status (full-time / SAP warnings).
 *   - Yellow badge: below full-time threshold.
 *   - Red badge: approaching SAP maximum timeframe.
 *   - "Configure Aid Rules" admin prompt when no aid config is set.
 *
 * LAYOUT:
 *  - Left panel (280px sticky): plan controls + skip-semester checkboxes
 *  - Top bar: summary stats (grad date, semesters, credits, % complete, total cost)
 *  - Diff panel: shown after regeneration (dismissible)
 *  - Right panel: semester card timeline with per-semester cost + aid badges
 */

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import {
  ChevronLeft,
  GraduationCap,
  Sparkles,
  Calendar,
  BookOpen,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  X,
  GitCompare,
  DollarSign,
  Settings,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MY_DEGREE_PROFILES_QUERY } from '@/lib/graphql/queries/planner';
import {
  MY_GRADUATION_PLANS_QUERY,
  GET_TUITION_CONFIG_QUERY,
  GET_FINANCIAL_AID_CONFIG_QUERY,
} from '@/lib/graphql/queries/graduation-planner';
import { GENERATE_GRADUATION_PLAN_MUTATION } from '@/lib/graphql/mutations/graduation-planner';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DegreeProfile {
  id: string;
  status: string;
  degreeProgram: {
    id: string;
    name: string;
    code: string;
    totalCreditsRequired: number;
  };
}

interface PlannedCourse {
  courseId: string;
  code: string;
  title: string;
  credits: number;
  fulfillsRequirement: string;
}

interface SemesterAidStatus {
  isFullTime: boolean;
  isHalfTime: boolean;
  aidWarning?: string | null;
  sapWarning?: string | null;
}

interface PlannedSemester {
  termKey: string;
  term: string;
  year: number;
  courses: PlannedCourse[];
  totalCredits: number;
  cumulativeCredits: number;
  completionPercentage: number;
  estimatedCost?: number | null;
  estimatedCumulativeCost?: number | null;
  aidStatus?: SemesterAidStatus | null;
}

interface FinancialAidConfig {
  fullTimeThreshold?: number | null;
  halfTimeThreshold?: number | null;
  maxTimeframePercent?: number | null;
}

interface GraduationPlanConstraints {
  maxCreditsPerSemester: number;
  startTerm: string;
  startYear: number;
  includeSummer: boolean;
  excludedTermKeys: string[];
}

interface DiffCourse {
  courseId: string;
  code: string;
  title: string;
  termKey: string;
}

interface MovedCourse {
  courseId: string;
  code: string;
  title: string;
  fromTermKey: string;
  toTermKey: string;
}

interface PlanDiff {
  semestersAdded: number;
  semestersRemoved: number;
  graduationDateChange?: string | null;
  added: DiffCourse[];
  removed: DiffCourse[];
  moved: MovedCourse[];
}

interface GraduationPlan {
  id: string;
  profileId: string;
  status: string;
  totalSemesters: number;
  estimatedGraduationTerm: string;
  estimatedGraduationYear: number;
  totalCreditsPlanned: number;
  totalCreditsCompleted: number;
  overallCompletionPercentage: number;
  estimatedTotalCost?: number | null;
  constraints: GraduationPlanConstraints;
  semesters: PlannedSemester[];
  diff?: PlanDiff | null;
  createdAt: string;
}

interface TuitionConfig {
  perCreditCost?: number | null;
  flatRateMin?: number | null;
  flatRateMax?: number | null;
  flatRateCost?: number | null;
  summerPerCreditCost?: number | null;
  fees?: Array<{ name: string; amount: number; type: string }> | null;
}

interface PlanControls {
  maxCredits: number;
  startTerm: string;
  startYear: number;
  includeSummer: boolean;
  excludedTermKeys: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTerm(term: string, year: number): string {
  const labels: Record<string, string> = {
    fall: 'Fall',
    spring: 'Spring',
    summer: 'Summer',
  };
  return `${labels[term] ?? term} ${year}`;
}

function formatTermKey(termKey: string): string {
  const [term, year] = termKey.split('_');
  return formatTerm(term, parseInt(year));
}

const REQUIREMENT_COLORS: Record<string, string> = {
  core: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  elective:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  general_education:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  concentration:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function reqColor(groupName: string): string {
  for (const [key, cls] of Object.entries(REQUIREMENT_COLORS)) {
    if (groupName.toLowerCase().includes(key)) return cls;
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
}

function formatCost(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Plan Diff Panel ──────────────────────────────────────────────────────────

function PlanDiffPanel({
  diff,
  onDismiss,
}: {
  diff: PlanDiff;
  onDismiss: () => void;
}) {
  const totalChanges =
    diff.moved.length + diff.added.length + diff.removed.length;

  if (totalChanges === 0 && !diff.graduationDateChange) return null;

  return (
    <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <GitCompare className="h-4 w-4" aria-hidden="true" />
          What Changed
          {totalChanges > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 border-0"
            >
              {totalChanges} change{totalChanges !== 1 ? 's' : ''}
            </Badge>
          )}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-7 w-7 p-0 text-amber-600 hover:text-amber-800 dark:text-amber-400"
          aria-label="Dismiss diff"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Graduation date change */}
      {diff.graduationDateChange && (
        <div className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {diff.graduationDateChange}
        </div>
      )}

      {/* Semester count delta */}
      {(diff.semestersAdded > 0 || diff.semestersRemoved > 0) && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {diff.semestersAdded > 0 &&
            `${diff.semestersAdded} semester slot${diff.semestersAdded !== 1 ? 's' : ''} added`}
          {diff.semestersAdded > 0 && diff.semestersRemoved > 0 && ', '}
          {diff.semestersRemoved > 0 &&
            `${diff.semestersRemoved} semester slot${diff.semestersRemoved !== 1 ? 's' : ''} removed`}
        </p>
      )}

      {/* Moved courses */}
      {diff.moved.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
            Moved ({diff.moved.length})
          </p>
          <div className="space-y-1">
            {diff.moved.slice(0, 6).map((c) => (
              <div
                key={c.courseId}
                className="flex items-center gap-1.5 text-xs"
              >
                <span className="font-mono text-amber-800 dark:text-amber-200 shrink-0">
                  {c.code}
                </span>
                <span className="text-amber-600 dark:text-amber-400 truncate min-w-0">
                  {c.title}
                </span>
                <ArrowRight
                  className="h-3 w-3 text-amber-500 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-amber-700 dark:text-amber-300 shrink-0 whitespace-nowrap">
                  {formatTermKey(c.toTermKey)}
                </span>
              </div>
            ))}
            {diff.moved.length > 6 && (
              <p className="text-xs text-amber-500 dark:text-amber-500">
                +{diff.moved.length - 6} more moved
              </p>
            )}
          </div>
        </div>
      )}

      {/* Added / Removed in a two-column layout when both exist */}
      <div className="grid sm:grid-cols-2 gap-3">
        {diff.added.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">
              Added ({diff.added.length})
            </p>
            {diff.added.slice(0, 4).map((c) => (
              <div key={c.courseId} className="text-xs flex items-center gap-1">
                <span className="font-mono text-green-700 dark:text-green-400">
                  {c.code}
                </span>
                <span className="text-muted-foreground truncate">
                  {c.title}
                </span>
              </div>
            ))}
            {diff.added.length > 4 && (
              <p className="text-xs text-muted-foreground">
                +{diff.added.length - 4} more
              </p>
            )}
          </div>
        )}
        {diff.removed.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
              Removed ({diff.removed.length})
            </p>
            {diff.removed.slice(0, 4).map((c) => (
              <div key={c.courseId} className="text-xs flex items-center gap-1">
                <span className="font-mono text-red-700 dark:text-red-400">
                  {c.code}
                </span>
                <span className="text-muted-foreground truncate">
                  {c.title}
                </span>
              </div>
            ))}
            {diff.removed.length > 4 && (
              <p className="text-xs text-muted-foreground">
                +{diff.removed.length - 4} more
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Semester Card ────────────────────────────────────────────────────────────

function SemesterCard({
  semester,
  index,
  totalCreditsRequired,
}: {
  semester: PlannedSemester;
  index: number;
  totalCreditsRequired: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const pct = Math.min(100, semester.completionPercentage);
  const isFull = pct >= 100;
  const hasCost = semester.estimatedCost != null;
  const aid = semester.aidStatus;
  const hasAidWarning = aid?.aidWarning != null;
  const hasSapWarning = aid?.sapWarning != null;

  return (
    <div
      className={`rounded-xl border bg-card overflow-hidden ${
        hasSapWarning
          ? 'border-red-300 dark:border-red-700'
          : hasAidWarning
            ? 'border-amber-300 dark:border-amber-700'
            : ''
      }`}
    >
      {/* Semester header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`Toggle ${formatTerm(semester.term, semester.year)} courses`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
              isFull ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'
            }`}
            aria-hidden="true"
          >
            {index + 1}
          </span>
          <div className="text-left">
            <p className="font-semibold text-sm flex items-center gap-2">
              {formatTerm(semester.term, semester.year)}
              {/* Aid warning badges (GRAD-004) */}
              {hasSapWarning && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  title={aid?.sapWarning ?? undefined}
                >
                  <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                  SAP Risk
                </span>
              )}
              {!hasSapWarning && hasAidWarning && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  title={aid?.aidWarning ?? undefined}
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {aid?.isHalfTime === false
                    ? 'Below Half-Time'
                    : 'Below Full-Time'}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {semester.courses.length} course
              {semester.courses.length !== 1 ? 's' : ''} ·{' '}
              {semester.totalCredits} credits
              {hasCost && (
                <>
                  {' · '}
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {formatCost(semester.estimatedCost!)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Cost running total (GRAD-003) */}
          {hasCost && (
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCost(semester.estimatedCumulativeCost ?? 0)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                cumulative cost
              </span>
            </div>
          )}
          {/* Cumulative progress */}
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold tabular-nums">
              {semester.cumulativeCredits} / {totalCreditsRequired} cr
            </span>
            <span className="text-xs text-muted-foreground">
              {pct.toFixed(1)}% complete
            </span>
          </div>
          {/* Progress bar */}
          <div className="hidden sm:block w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isFull ? 'bg-green-500' : 'bg-primary'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Course list */}
      {expanded && (
        <div className="px-5 pb-4 space-y-2">
          <Separator className="mb-3" />

          {/* Aid warnings expanded detail (GRAD-004) */}
          {(hasSapWarning || hasAidWarning) && (
            <div className="space-y-1.5 mb-3">
              {hasSapWarning && (
                <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                  <ShieldAlert
                    className="h-3.5 w-3.5 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{aid?.sapWarning}</span>
                </div>
              )}
              {hasAidWarning && (
                <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
                  <AlertTriangle
                    className="h-3.5 w-3.5 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{aid?.aidWarning}</span>
                </div>
              )}
            </div>
          )}

          {semester.courses.map((course) => (
            <div
              key={course.courseId}
              className="flex items-center justify-between py-1.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <BookOpen
                  className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    <span className="font-mono text-xs text-muted-foreground mr-1.5">
                      {course.code}
                    </span>
                    {course.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Badge
                  variant="secondary"
                  className={`text-[10px] hidden md:inline-flex ${reqColor(course.fulfillsRequirement)}`}
                >
                  {course.fulfillsRequirement}
                </Badge>
                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  {course.credits} cr
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Controls Panel ───────────────────────────────────────────────────────────

function ControlsPanel({
  controls,
  planSemesters,
  onChange,
  onGenerate,
  generating,
  hasActivePlan,
}: {
  controls: PlanControls;
  /** Future semesters from the active plan — used to render skip-semester checkboxes */
  planSemesters: PlannedSemester[];
  onChange: (partial: Partial<PlanControls>) => void;
  onGenerate: () => void;
  generating: boolean;
  hasActivePlan: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);

  function toggleExcludedTerm(termKey: string, excluded: boolean) {
    if (excluded) {
      onChange({
        excludedTermKeys: [...controls.excludedTermKeys, termKey],
      });
    } else {
      onChange({
        excludedTermKeys: controls.excludedTermKeys.filter(
          (k) => k !== termKey,
        ),
      });
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-5 sticky top-6">
      <div>
        <h2 className="font-semibold text-sm">Plan Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Changes auto-update your plan
        </p>
      </div>

      <div className="space-y-4">
        {/* Max credits */}
        <div className="space-y-1.5">
          <Label className="text-xs">Credits per semester</Label>
          <Select
            value={String(controls.maxCredits)}
            onValueChange={(v) => onChange({ maxCredits: parseInt(v) })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[9, 12, 15, 18, 21].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} credits{n === 15 ? ' (default)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start term */}
        <div className="space-y-1.5">
          <Label className="text-xs">Start term</Label>
          <Select
            value={controls.startTerm}
            onValueChange={(v) => onChange({ startTerm: v })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fall">Fall</SelectItem>
              <SelectItem value="spring">Spring</SelectItem>
              <SelectItem value="summer">Summer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Start year */}
        <div className="space-y-1.5">
          <Label className="text-xs">Start year</Label>
          <Select
            value={String(controls.startYear)}
            onValueChange={(v) => onChange({ startYear: parseInt(v) })}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Include summer */}
        <div className="flex items-center gap-2.5">
          <input
            id="include-summer"
            type="checkbox"
            className="rounded"
            checked={controls.includeSummer}
            onChange={(e) => onChange({ includeSummer: e.target.checked })}
          />
          <Label htmlFor="include-summer" className="text-xs cursor-pointer">
            Include summer terms
          </Label>
        </div>

        {/* Skip individual semesters */}
        {planSemesters.length > 0 && (
          <div className="space-y-2 pt-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Skip semesters (time off)
            </Label>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {planSemesters.map((sem) => {
                const isExcluded = controls.excludedTermKeys.includes(
                  sem.termKey,
                );
                return (
                  <div key={sem.termKey} className="flex items-center gap-2">
                    <input
                      id={`skip-${sem.termKey}`}
                      type="checkbox"
                      className="rounded"
                      checked={isExcluded}
                      onChange={(e) =>
                        toggleExcludedTerm(sem.termKey, e.target.checked)
                      }
                    />
                    <Label
                      htmlFor={`skip-${sem.termKey}`}
                      className="text-xs cursor-pointer"
                    >
                      {formatTerm(sem.term, sem.year)}
                    </Label>
                    {isExcluded && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] py-0 px-1 h-4 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0"
                      >
                        skipped
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Button
        className="w-full gap-2"
        onClick={onGenerate}
        disabled={generating}
      >
        <RefreshCw
          className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        {generating
          ? 'Generating…'
          : hasActivePlan
            ? 'Regenerate Plan'
            : 'Generate Plan'}
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const currentYear = new Date().getFullYear();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.includes(UserRole.ADMIN) ?? false;

  const [controls, setControls] = useState<PlanControls>({
    maxCredits: 15,
    startTerm: 'fall',
    startYear: currentYear,
    includeSummer: false,
    excludedTermKeys: [],
  });

  const [planDiff, setPlanDiff] = useState<PlanDiff | null>(null);

  // ── Load tuition config (GRAD-003) ────────────────────────────────
  const { data: tuitionData } = useQuery<{
    getTuitionConfig: TuitionConfig | null;
  }>(GET_TUITION_CONFIG_QUERY, { fetchPolicy: 'cache-and-network' });
  const tuitionConfig = tuitionData?.getTuitionConfig ?? null;

  // ── Load financial aid config (GRAD-004) ───────────────────────────
  const { data: aidData } = useQuery<{
    getFinancialAidConfig: FinancialAidConfig | null;
  }>(GET_FINANCIAL_AID_CONFIG_QUERY, { fetchPolicy: 'cache-and-network' });
  const aidConfig = aidData?.getFinancialAidConfig ?? null;

  // ── Load active profile ────────────────────────────────────────────
  const { data: profilesData, loading: profilesLoading } = useQuery<{
    myDegreeProfiles: DegreeProfile[];
  }>(MY_DEGREE_PROFILES_QUERY, { fetchPolicy: 'cache-and-network' });

  const activeProfile = profilesData?.myDegreeProfiles?.find(
    (p) => p.status === 'active',
  );

  // ── Load existing plans ────────────────────────────────────────────
  const {
    data: plansData,
    loading: plansLoading,
    refetch: refetchPlans,
  } = useQuery<{ myGraduationPlans: GraduationPlan[] }>(
    MY_GRADUATION_PLANS_QUERY,
    {
      variables: { profileId: activeProfile?.id },
      skip: !activeProfile,
      fetchPolicy: 'cache-and-network',
    },
  );

  const activePlan = plansData?.myGraduationPlans?.find(
    (p) => p.status === 'active',
  );

  // ── Generate mutation ──────────────────────────────────────────────
  const [generatePlan, { loading: generating }] = useMutation<{
    generateGraduationPlan: GraduationPlan;
  }>(GENERATE_GRADUATION_PLAN_MUTATION);

  // ── Refs for debounced auto-regen (avoids stale closures) ─────────
  //
  // WHY refs: The debounce callback fires 600ms after the last control
  // change. By the time it fires, React state may have changed multiple
  // times. Refs let us read the latest values without creating new
  // debounce timers on every render.
  const activePlanRef = useRef<GraduationPlan | null>(null);
  const activeProfileRef = useRef<DegreeProfile | null>(null);
  const controlsRef = useRef<PlanControls>(controls);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs current on every render
  activePlanRef.current = activePlan ?? null;
  activeProfileRef.current = activeProfile ?? null;
  controlsRef.current = controls;

  // ── Sync controls from active plan on first load ───────────────────
  const [synced, setSynced] = useState(false);
  if (activePlan && !synced) {
    setSynced(true);
    setControls({
      maxCredits: activePlan.constraints.maxCreditsPerSemester,
      startTerm: activePlan.constraints.startTerm,
      startYear: activePlan.constraints.startYear,
      includeSummer: activePlan.constraints.includeSummer,
      excludedTermKeys: activePlan.constraints.excludedTermKeys ?? [],
    });
  }

  // ── Core generate function ─────────────────────────────────────────
  const triggerGenerate = useCallback(
    (ctrl: PlanControls, profile: DegreeProfile) => {
      generatePlan({
        variables: {
          input: {
            profileId: profile.id,
            maxCreditsPerSemester: ctrl.maxCredits,
            startTerm: ctrl.startTerm,
            startYear: ctrl.startYear,
            includeSummer: ctrl.includeSummer,
            excludedTermKeys: ctrl.excludedTermKeys,
          },
        },
      })
        .then((result) => {
          const diff = result.data?.generateGraduationPlan?.diff ?? null;
          setPlanDiff(diff);
          return refetchPlans();
        })
        .catch(console.error);
    },
    [generatePlan, refetchPlans],
  );

  // ── Control-change handler — triggers debounced auto-regen ─────────
  //
  // WHY: We want immediate visual feedback as the student adjusts
  // constraints without requiring a button click. The 600ms debounce
  // prevents a regen on every keystroke/tick while still feeling instant.
  function handleControlChange(partial: Partial<PlanControls>) {
    const updated = { ...controlsRef.current, ...partial };
    setControls(updated);
    controlsRef.current = updated;

    // Only auto-regen if there's already an active plan and a profile loaded
    if (!activePlanRef.current || !activeProfileRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const profile = activeProfileRef.current;
      if (!profile) return;
      triggerGenerate(controlsRef.current, profile);
    }, 600);
  }

  // ── Explicit generate (button click) ──────────────────────────────
  function handleGenerate() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!activeProfile) return;
    setPlanDiff(null);
    triggerGenerate(controls, activeProfile);
  }

  // ── Loading ────────────────────────────────────────────────────────
  if (profilesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <Skeleton className="h-64" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── No profile → send to /planner ─────────────────────────────────
  if (!activeProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/planner"
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Graduation Roadmap</h1>
        </div>
        <div className="rounded-xl border bg-card p-12 text-center space-y-4">
          <GraduationCap
            className="h-12 w-12 text-muted-foreground mx-auto"
            aria-hidden="true"
          />
          <h2 className="text-lg font-semibold">No degree profile found</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Set up your degree program on the Planner page before generating a
            roadmap.
          </p>
          <Link href="/planner">
            <Button>Go to Planner</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/planner"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Back to planner"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Graduation Roadmap</h1>
            <p className="text-muted-foreground text-sm">
              {activeProfile.degreeProgram.name} (
              {activeProfile.degreeProgram.code})
            </p>
          </div>
        </div>
        <Link href="/ai?agent=course-planner">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Ask AI Planner
          </Button>
        </Link>
      </div>

      {/* Summary bar (only when plan exists) */}
      {activePlan && (
        <>
          <div
            className={`grid gap-3 ${
              activePlan.estimatedTotalCost != null
                ? 'grid-cols-2 sm:grid-cols-5'
                : 'grid-cols-2 sm:grid-cols-4'
            }`}
          >
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Est. Graduation</p>
              <p className="text-lg font-bold capitalize">
                {activePlan.estimatedGraduationTerm}{' '}
                {activePlan.estimatedGraduationYear}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Semesters Planned</p>
              <p className="text-lg font-bold">{activePlan.totalSemesters}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Credits Completed</p>
              <p className="text-lg font-bold tabular-nums">
                {activePlan.totalCreditsCompleted}
                <span className="text-sm font-normal text-muted-foreground">
                  /{activeProfile.degreeProgram.totalCreditsRequired}
                </span>
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground">Overall Progress</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${activePlan.overallCompletionPercentage}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {activePlan.overallCompletionPercentage.toFixed(1)}%
                </span>
              </div>
            </div>
            {/* Total cost card — only when tuition is configured (GRAD-003) */}
            {activePlan.estimatedTotalCost != null && (
              <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-4">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" aria-hidden="true" />
                  Est. Total Cost
                </p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {formatCost(activePlan.estimatedTotalCost)}
                </p>
              </div>
            )}
          </div>

          {/* Admin prompt to configure tuition (GRAD-003) */}
          {isAdmin && !tuitionConfig && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-card text-sm text-muted-foreground">
              <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                No tuition rates configured — students can&apos;t see cost
                projections.
              </span>
              <Link href="/admin/tuition-config" className="ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                >
                  <DollarSign className="h-3 w-3" />
                  Configure Rates
                </Button>
              </Link>
            </div>
          )}

          {/* Admin prompt to configure financial aid rules (GRAD-004) */}
          {isAdmin && !aidConfig && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-card text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                No financial aid thresholds configured — aid warnings won&apos;t
                appear on student plans.
              </span>
              <Link href="/admin/financial-aid-config" className="ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                >
                  <Settings className="h-3 w-3" />
                  Configure Aid Rules
                </Button>
              </Link>
            </div>
          )}
        </>
      )}

      {/* Diff panel — shown after any regeneration */}
      {planDiff && (
        <PlanDiffPanel diff={planDiff} onDismiss={() => setPlanDiff(null)} />
      )}

      {/* Main two-column layout */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Controls */}
        <ControlsPanel
          controls={controls}
          planSemesters={activePlan?.semesters ?? []}
          onChange={handleControlChange}
          onGenerate={handleGenerate}
          generating={generating}
          hasActivePlan={!!activePlan}
        />

        {/* Roadmap */}
        <div className="space-y-4">
          {plansLoading && !activePlan && (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </>
          )}

          {/* Generating overlay hint */}
          {generating && activePlan && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
              Recalculating plan…
            </div>
          )}

          {!plansLoading && !activePlan && (
            <div className="rounded-xl border border-dashed bg-card p-16 text-center space-y-4">
              <Calendar
                className="h-10 w-10 text-muted-foreground mx-auto"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-lg font-semibold">No plan yet</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Configure your settings and click{' '}
                  <strong>Generate Plan</strong> to create your
                  semester-by-semester roadmap to graduation.
                </p>
              </div>
            </div>
          )}

          {activePlan && activePlan.semesters.length === 0 && (
            <div className="rounded-xl border bg-card p-12 text-center space-y-3">
              <GraduationCap
                className="h-10 w-10 text-green-500 mx-auto"
                aria-hidden="true"
              />
              <h2 className="text-lg font-semibold">All requirements met!</h2>
              <p className="text-sm text-muted-foreground">
                Based on your completed courses, you have satisfied all degree
                requirements.
              </p>
            </div>
          )}

          {activePlan &&
            activePlan.semesters.map((semester, i) => (
              <SemesterCard
                key={semester.termKey}
                semester={semester}
                index={i}
                totalCreditsRequired={
                  activeProfile.degreeProgram.totalCreditsRequired
                }
              />
            ))}
        </div>
      </div>
    </div>
  );
}
