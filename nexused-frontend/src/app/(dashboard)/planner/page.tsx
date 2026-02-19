'use client';

import { useState } from 'react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import {
  MY_DEGREE_PROFILES_QUERY,
  DEGREE_PROGRESS_QUERY,
  ELIGIBLE_COURSES_QUERY,
  DEGREE_PROGRAMS_QUERY,
  SIMULATE_MAJOR_CHANGE_QUERY,
} from '@/lib/graphql/queries/planner';
import { CREATE_STUDENT_PROFILE_MUTATION } from '@/lib/graphql/mutations/planner';
import { useAuthStore } from '@/stores/auth.store';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Map,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  CircleDot,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ──────────────────────────────────────────────────────────────

interface DegreeProgram {
  id: string;
  name: string;
  code: string;
  department: string | null;
  description: string | null;
  totalCreditsRequired: number;
  status: string;
}

interface DegreeProfile {
  id: string;
  userId: string;
  degreeProgramId: string;
  degreeProgram: {
    id: string;
    name: string;
    code: string;
    department: string | null;
    totalCreditsRequired: number;
  };
  enrollmentYear: number;
  expectedGraduationYear: number | null;
  completedCourseIds: string[];
  currentCourseIds: string[];
  status: string;
}

interface RequirementProgress {
  groupName: string;
  type: string;
  creditsRequired: number;
  creditsCompleted: number;
  coursesRequired: number;
  coursesCompleted: number;
  fulfilled: boolean;
  completedCourseIds: string[];
  remainingCourseIds: string[];
}

interface DegreeProgress {
  overallPercentage: number;
  totalCreditsRequired: number;
  totalCreditsCompleted: number;
  creditsRemaining: number;
  estimatedSemestersRemaining: number;
  requirementProgress: RequirementProgress[];
}

interface EligibleCourse {
  id: string;
  code: string;
  title: string;
  credits: number;
  fulfillsRequirement: string;
  prerequisitesMet: boolean;
}

// ─── Progress Ring ──────────────────────────────────────────────────────

function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 10,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-primary transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold">{percentage.toFixed(1)}%</span>
        <span className="text-xs text-muted-foreground">Complete</span>
      </div>
    </div>
  );
}

// ─── Requirement Group Card ─────────────────────────────────────────────

function RequirementCard({ req }: { req: RequirementProgress }) {
  const percentage =
    req.creditsRequired > 0
      ? Math.min(100, (req.creditsCompleted / req.creditsRequired) * 100)
      : 0;

  const typeColors: Record<string, string> = {
    core: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    elective:
      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    general_education:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    concentration:
      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <Card
      className={
        req.fulfilled ? 'border-green-300 dark:border-green-800' : undefined
      }
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              {req.fulfilled ? (
                <CheckCircle2
                  className="h-4 w-4 text-green-600"
                  aria-hidden="true"
                />
              ) : (
                <CircleDot
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <h3 className="font-medium text-sm">{req.groupName}</h3>
            </div>
            <Badge
              className={`mt-1 text-[10px] ${typeColors[req.type] || 'bg-gray-100 text-gray-700'}`}
              variant="secondary"
            >
              {req.type.replace('_', ' ')}
            </Badge>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {req.creditsCompleted}/{req.creditsRequired} cr
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              req.fulfilled ? 'bg-green-500' : 'bg-primary'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {req.coursesCompleted}/{req.coursesRequired} courses
          </span>
          <span className="text-xs text-muted-foreground">
            {percentage.toFixed(0)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Setup Dialog ───────────────────────────────────────────────────────

function SetupProfileDialog({
  open,
  onOpenChange,
  programs,
  onSetup,
  saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  programs: DegreeProgram[];
  onSetup: (programId: string, year: number) => void;
  saving: boolean;
}) {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [enrollmentYear, setEnrollmentYear] = useState(
    String(new Date().getFullYear()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
            Set Up Your Degree Plan
          </DialogTitle>
          <DialogDescription>
            Select your degree program to start tracking your progress toward
            graduation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Degree Program</Label>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger>
                <SelectValue placeholder="Select your program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="enrollment-year">Enrollment Year</Label>
            <Input
              id="enrollment-year"
              type="number"
              value={enrollmentYear}
              onChange={(e) => setEnrollmentYear(e.target.value)}
              min={2000}
              max={2030}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSetup(selectedProgram, parseInt(enrollmentYear, 10))
            }
            disabled={!selectedProgram || saving}
          >
            {saving ? 'Setting up...' : 'Start Tracking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function PlannerPage() {
  const { user } = useAuthStore();
  const [setupOpen, setSetupOpen] = useState(false);
  const [simulateProgram, setSimulateProgram] = useState('');

  // Queries
  const {
    data: profilesData,
    loading: profilesLoading,
    refetch: refetchProfiles,
  } = useQuery<{ myDegreeProfiles: DegreeProfile[] }>(
    MY_DEGREE_PROFILES_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );

  const { data: programsData } = useQuery<{
    degreePrograms: DegreeProgram[];
  }>(DEGREE_PROGRAMS_QUERY, { fetchPolicy: 'cache-first' });

  const activeProfile = profilesData?.myDegreeProfiles?.find(
    (p) => p.status === 'active',
  );

  const { data: progressData, loading: progressLoading } = useQuery<{
    degreeProgress: DegreeProgress;
  }>(DEGREE_PROGRESS_QUERY, {
    variables: { profileId: activeProfile?.id },
    skip: !activeProfile,
    fetchPolicy: 'cache-and-network',
  });

  const { data: eligibleData, loading: eligibleLoading } = useQuery<{
    eligibleCourses: EligibleCourse[];
  }>(ELIGIBLE_COURSES_QUERY, {
    variables: { profileId: activeProfile?.id },
    skip: !activeProfile,
    fetchPolicy: 'cache-and-network',
  });

  const [fetchSimulation, { data: simulationData, loading: simulating }] =
    useLazyQuery<{ simulateMajorChange: DegreeProgress }>(
      SIMULATE_MAJOR_CHANGE_QUERY,
    );

  const [createProfile, { loading: creating }] = useMutation(
    CREATE_STUDENT_PROFILE_MUTATION,
    {
      onCompleted: () => {
        setSetupOpen(false);
        refetchProfiles();
      },
    },
  );

  const progress = progressData?.degreeProgress;
  const eligible = eligibleData?.eligibleCourses ?? [];
  const programs = programsData?.degreePrograms ?? [];

  const handleSetup = async (programId: string, year: number) => {
    if (!user) return;
    try {
      await createProfile({
        variables: {
          input: {
            userId: user.id,
            degreeProgramId: programId,
            enrollmentYear: year,
          },
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Setup failed';
      console.error(msg);
    }
  };

  const handleSimulate = (targetProgramId: string) => {
    if (!activeProfile) return;
    setSimulateProgram(targetProgramId);
    fetchSimulation({
      variables: {
        profileId: activeProfile.id,
        targetProgramId,
      },
    });
  };

  // ── Loading State ──
  if (profilesLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  // ── No Profile Yet ──
  if (!activeProfile) {
    return (
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Map className="h-8 w-8" aria-hidden="true" />
            Degree Planner
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your progress toward graduation with AI-powered course
            recommendations.
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap
              className="h-12 w-12 text-muted-foreground mb-4"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold">Set up your degree plan</h2>
            <p className="text-muted-foreground max-w-sm mt-1">
              Select your degree program to start tracking your progress toward
              graduation.
            </p>
            <Button className="mt-4 gap-2" onClick={() => setSetupOpen(true)}>
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              Get Started
            </Button>
          </CardContent>
        </Card>

        <SetupProfileDialog
          open={setupOpen}
          onOpenChange={setSetupOpen}
          programs={programs}
          onSetup={handleSetup}
          saving={creating}
        />
      </div>
    );
  }

  // ── Main Dashboard ──
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Map className="h-8 w-8" aria-hidden="true" />
            Degree Planner
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeProfile.degreeProgram.name} (
            {activeProfile.degreeProgram.code})
            {activeProfile.degreeProgram.department &&
              ` — ${activeProfile.degreeProgram.department}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/planner/roadmap">
            <Button variant="outline" className="gap-2">
              <Map className="h-4 w-4" aria-hidden="true" />
              View Roadmap
            </Button>
          </Link>
          <Link href="/ai?agent=course-planner">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Ask Course Planner AI
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Overview */}
      {progressLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : progress ? (
        <div className="grid gap-4 md:grid-cols-4">
          {/* Progress Ring */}
          <Card className="md:row-span-2 flex items-center justify-center">
            <CardContent className="pt-6">
              <ProgressRing percentage={progress.overallPercentage} />
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-medium">Credits Completed</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {progress.totalCreditsCompleted}
                <span className="text-sm font-normal text-muted-foreground">
                  /{progress.totalCreditsRequired}
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-medium">Credits Remaining</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {progress.creditsRemaining}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-medium">Est. Semesters Left</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {progress.estimatedSemestersRemaining}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Requirements Breakdown */}
      {progress && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Requirements Breakdown</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {progress.requirementProgress.map((req) => (
              <RequirementCard key={req.groupName} req={req} />
            ))}
          </div>
        </div>
      )}

      {/* Eligible Courses */}
      <div>
        <h2 className="text-xl font-semibold mb-3">
          Eligible Courses
          {!eligibleLoading && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({eligible.length} available)
            </span>
          )}
        </h2>
        {eligibleLoading ? (
          <div className="grid gap-2 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : eligible.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {eligible.map((course) => (
              <Card key={course.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {course.code} — {course.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {course.credits} credits
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {course.fulfillsRequirement}
                      </Badge>
                      {course.prerequisitesMet ? (
                        <Badge
                          variant="default"
                          className="text-[10px] bg-green-600"
                        >
                          Prereqs met
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          Prereqs not met
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground">
              <CheckCircle2
                className="h-8 w-8 mx-auto mb-2"
                aria-hidden="true"
              />
              All requirements satisfied, or no eligible courses found.
            </CardContent>
          </Card>
        )}
      </div>

      {/* What-If Simulator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
            What-If Simulator
          </CardTitle>
          <CardDescription>
            See how your credits would transfer if you switched to a different
            major.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs">Switch to...</Label>
              <Select
                value={simulateProgram}
                onValueChange={(val) => handleSimulate(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a program to compare" />
                </SelectTrigger>
                <SelectContent>
                  {programs
                    .filter(
                      (p) =>
                        p.id !== activeProfile.degreeProgramId &&
                        p.status === 'active',
                    )
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {simulating && (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}

          {simulationData?.simulateMajorChange && !simulating && (
            <div className="mt-4 p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <p className="text-sm font-medium">Transfer Analysis</p>
                  <p className="text-2xl font-bold">
                    {simulationData.simulateMajorChange.overallPercentage.toFixed(
                      1,
                    )}
                    % complete
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>
                    {simulationData.simulateMajorChange.totalCreditsCompleted}{' '}
                    of {simulationData.simulateMajorChange.totalCreditsRequired}{' '}
                    credits transfer
                  </p>
                  <p>
                    {simulationData.simulateMajorChange.creditsRemaining}{' '}
                    credits remaining
                  </p>
                  <p>
                    ~
                    {
                      simulationData.simulateMajorChange
                        .estimatedSemestersRemaining
                    }{' '}
                    semesters to go
                  </p>
                </div>
              </div>
              {/* Per-requirement breakdown */}
              <div className="grid gap-2 md:grid-cols-2">
                {simulationData.simulateMajorChange.requirementProgress.map(
                  (req) => (
                    <div
                      key={req.groupName}
                      className="flex items-center justify-between text-sm p-2 rounded bg-background"
                    >
                      <span className="flex items-center gap-1.5">
                        {req.fulfilled ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-green-600"
                            aria-hidden="true"
                          />
                        ) : (
                          <CircleDot
                            className="h-3.5 w-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                        )}
                        {req.groupName}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {req.creditsCompleted}/{req.creditsRequired} cr
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA to AI */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-6">
          <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold">Need personalized advice?</p>
            <p className="text-sm text-muted-foreground">
              The AI Course Planner can help you build the perfect semester
              schedule, explore what-if scenarios, and find the fastest path to
              graduation.
            </p>
          </div>
          <Link href="/ai?agent=course-planner">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Talk to Course Planner
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
