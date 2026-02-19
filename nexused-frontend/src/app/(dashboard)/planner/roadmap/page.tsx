'use client';

/**
 * GRAD-001: Graduation Roadmap — semester-by-semester course plan.
 *
 * Displays the student's generated graduation plan as a vertical timeline of
 * semester cards. If no plan exists, shows a "Generate Plan" panel with
 * constraint controls. If a profile doesn't exist yet, redirects to /planner.
 *
 * LAYOUT:
 *  - Left panel: plan controls (max credits, start term, include summer)
 *  - Right panel: semester timeline with course cards per semester
 *  - Top bar: overall completion progress + estimated graduation
 */

import { useState } from 'react';
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
import { MY_GRADUATION_PLANS_QUERY } from '@/lib/graphql/queries/graduation-planner';
import { GENERATE_GRADUATION_PLAN_MUTATION } from '@/lib/graphql/mutations/graduation-planner';

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

interface PlannedSemester {
  termKey: string;
  term: string;
  year: number;
  courses: PlannedCourse[];
  totalCredits: number;
  cumulativeCredits: number;
  completionPercentage: number;
}

interface GraduationPlanConstraints {
  maxCreditsPerSemester: number;
  startTerm: string;
  startYear: number;
  includeSummer: boolean;
  excludedTermKeys: string[];
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
  constraints: GraduationPlanConstraints;
  semesters: PlannedSemester[];
  createdAt: string;
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

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
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
            <p className="font-semibold text-sm">
              {formatTerm(semester.term, semester.year)}
            </p>
            <p className="text-xs text-muted-foreground">
              {semester.courses.length} course
              {semester.courses.length !== 1 ? 's' : ''} ·{' '}
              {semester.totalCredits} credits
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

interface PlanControls {
  maxCredits: number;
  startTerm: string;
  startYear: number;
  includeSummer: boolean;
}

function ControlsPanel({
  controls,
  onChange,
  onGenerate,
  generating,
  hasActivePlan,
}: {
  controls: PlanControls;
  onChange: (partial: Partial<PlanControls>) => void;
  onGenerate: () => void;
  generating: boolean;
  hasActivePlan: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear + i);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-5 sticky top-6">
      <div>
        <h2 className="font-semibold text-sm">Plan Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Adjust constraints and regenerate
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
                  {n} credits
                  {n === 15 ? ' (default)' : ''}
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
  const [controls, setControls] = useState<PlanControls>({
    maxCredits: 15,
    startTerm: 'fall',
    startYear: currentYear,
    includeSummer: false,
  });

  // ── Load active profile ────────────────────────────────────────────────
  const { data: profilesData, loading: profilesLoading } = useQuery<{
    myDegreeProfiles: DegreeProfile[];
  }>(MY_DEGREE_PROFILES_QUERY, { fetchPolicy: 'cache-and-network' });

  const activeProfile = profilesData?.myDegreeProfiles?.find(
    (p) => p.status === 'active',
  );

  // ── Load existing plans ────────────────────────────────────────────────
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

  // ── Generate mutation ──────────────────────────────────────────────────
  const [generatePlan, { loading: generating }] = useMutation<{
    generateGraduationPlan: GraduationPlan;
  }>(GENERATE_GRADUATION_PLAN_MUTATION, {
    onCompleted: () => refetchPlans(),
  });

  function handleGenerate() {
    if (!activeProfile) return;
    generatePlan({
      variables: {
        input: {
          profileId: activeProfile.id,
          maxCreditsPerSemester: controls.maxCredits,
          startTerm: controls.startTerm,
          startYear: controls.startYear,
          includeSummer: controls.includeSummer,
        },
      },
    }).catch((err) => {
      console.error('Plan generation failed:', err);
    });
  }

  // ── Sync controls from active plan ────────────────────────────────────
  // Populate controls from the active plan's constraints on first load
  const [synced, setSynced] = useState(false);
  if (activePlan && !synced) {
    setSynced(true);
    setControls({
      maxCredits: activePlan.constraints.maxCreditsPerSemester,
      startTerm: activePlan.constraints.startTerm,
      startYear: activePlan.constraints.startYear,
      includeSummer: activePlan.constraints.includeSummer,
    });
  }

  // ── Loading ────────────────────────────────────────────────────────────
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

  // ── No profile → send to /planner ─────────────────────────────────────
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
        </div>
      )}

      {/* Main two-column layout */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-start">
        {/* Controls */}
        <ControlsPanel
          controls={controls}
          onChange={(partial) =>
            setControls((prev) => ({ ...prev, ...partial }))
          }
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
