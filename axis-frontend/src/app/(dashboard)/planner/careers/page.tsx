'use client';

import { useState } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import {
  CAREERS_QUERY,
  CAREER_CATEGORIES_QUERY,
  CAREER_SKILL_GAP_QUERY,
} from '@/lib/graphql/queries/careers';
import { MY_DEGREE_PROFILES_QUERY } from '@/lib/graphql/queries/planner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Briefcase,
  TrendingUp,
  Star,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ──────────────────────────────────────────────────────────────

interface CareerProfile {
  id: string;
  title: string;
  category: string;
  description: string | null;
  medianSalaryMin: number | null;
  medianSalaryMax: number | null;
  requiredSkills: string[];
  recommendedDegreeIds: string[];
  recommendedCourseIds: string[];
  isActive: boolean;
}

interface DegreeProfile {
  id: string;
  status: string;
  degreeProgram: { name: string; code: string };
}

interface SkillGapCourse {
  courseId: string;
  code: string;
  title: string;
  credits: number;
  status: 'completed' | 'in_progress' | 'missing';
}

interface CareerSkillGap {
  careerId: string;
  careerTitle: string;
  readinessPercent: number;
  completedCount: number;
  inProgressCount: number;
  missingCount: number;
  courses: SkillGapCourse[];
}

// ─── Readiness Ring ─────────────────────────────────────────────────────

function ReadinessRing({
  percent,
  size = 96,
}: {
  percent: number;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  const color =
    percent >= 75
      ? 'stroke-green-500'
      : percent >= 40
        ? 'stroke-yellow-500'
        : 'stroke-red-500';

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
          className={`${color} transition-all duration-700`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-bold leading-none">{percent}%</span>
        <span className="text-[10px] text-muted-foreground">ready</span>
      </div>
    </div>
  );
}

// ─── Skill Gap Panel ─────────────────────────────────────────────────────

function SkillGapPanel({ gap }: { gap: CareerSkillGap; onClose: () => void }) {
  const statusMeta: Record<
    SkillGapCourse['status'],
    { icon: React.ReactNode; label: string; className: string }
  > = {
    completed: {
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      label: 'Completed',
      className: 'text-green-700 dark:text-green-400',
    },
    in_progress: {
      icon: <Clock className="h-4 w-4 text-yellow-600" />,
      label: 'In Progress',
      className: 'text-yellow-700 dark:text-yellow-400',
    },
    missing: {
      icon: <XCircle className="h-4 w-4 text-red-500" />,
      label: 'Missing',
      className: 'text-red-700 dark:text-red-400',
    },
  };

  const groups: SkillGapCourse['status'][] = [
    'completed',
    'in_progress',
    'missing',
  ];

  return (
    <div className="space-y-4">
      {/* Readiness summary */}
      <div className="flex items-center gap-6 p-4 rounded-lg border bg-muted/40">
        <ReadinessRing percent={gap.readinessPercent} />
        <div className="text-sm space-y-1">
          <p>
            <span className="font-medium text-green-600">
              {gap.completedCount}
            </span>{' '}
            courses completed
          </p>
          <p>
            <span className="font-medium text-yellow-600">
              {gap.inProgressCount}
            </span>{' '}
            in progress
          </p>
          <p>
            <span className="font-medium text-red-500">{gap.missingCount}</span>{' '}
            missing
          </p>
        </div>
      </div>

      {/* Course lists grouped by status */}
      {groups.map((status) => {
        const courses = gap.courses.filter((c) => c.status === status);
        if (courses.length === 0) return null;
        const meta = statusMeta[status];
        return (
          <div key={status}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              {meta.icon}
              {meta.label} ({courses.length})
            </h4>
            <div className="space-y-1.5">
              {courses.map((c) => (
                <div
                  key={c.courseId}
                  className="flex items-center justify-between text-sm p-2 rounded bg-background border"
                >
                  <span className={`font-medium ${meta.className}`}>
                    {c.code} — {c.title}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {c.credits} cr
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* CTA to AI */}
      {gap.missingCount > 0 && (
        <Link href="/ai?agent=course-planner">
          <Button className="w-full gap-2 mt-2">
            <Sparkles className="h-4 w-4" />
            Plan a path to this career with AI
          </Button>
        </Link>
      )}
    </div>
  );
}

// ─── Career Card ─────────────────────────────────────────────────────────

function CareerCard({
  career,
  hasProfile,
  onAnalyse,
}: {
  career: CareerProfile;
  hasProfile: boolean;
  onAnalyse: (career: CareerProfile) => void;
}) {
  const salaryLabel =
    career.medianSalaryMin && career.medianSalaryMax
      ? `$${(career.medianSalaryMin / 1000).toFixed(0)}k – $${(career.medianSalaryMax / 1000).toFixed(0)}k`
      : career.medianSalaryMin
        ? `From $${(career.medianSalaryMin / 1000).toFixed(0)}k`
        : null;

  return (
    <Card className="hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">
            {career.title}
          </CardTitle>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {career.category}
          </Badge>
        </div>
        {salaryLabel && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            {salaryLabel} / yr
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-3 pt-0">
        {career.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {career.description}
          </p>
        )}
        {career.requiredSkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {career.requiredSkills.slice(0, 5).map((skill) => (
              <Badge key={skill} variant="outline" className="text-[10px]">
                {skill}
              </Badge>
            ))}
            {career.requiredSkills.length > 5 && (
              <Badge
                variant="outline"
                className="text-[10px] text-muted-foreground"
              >
                +{career.requiredSkills.length - 5} more
              </Badge>
            )}
          </div>
        )}
        <div className="mt-auto pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => onAnalyse(career)}
            disabled={!hasProfile}
            title={
              !hasProfile
                ? 'Set up a degree profile to see your readiness'
                : undefined
            }
          >
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            {hasProfile ? 'Check my readiness' : 'Set up a profile first'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function CareersPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCareer, setSelectedCareer] = useState<CareerProfile | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  // Data queries
  const { data: careersData, loading: careersLoading } = useQuery<{
    careers: CareerProfile[];
  }>(CAREERS_QUERY, {
    variables: selectedCategory !== 'all' ? { category: selectedCategory } : {},
    fetchPolicy: 'cache-and-network',
  });

  const { data: categoriesData } = useQuery<{ careerCategories: string[] }>(
    CAREER_CATEGORIES_QUERY,
    { fetchPolicy: 'cache-first' },
  );

  const { data: profilesData } = useQuery<{
    myDegreeProfiles: DegreeProfile[];
  }>(MY_DEGREE_PROFILES_QUERY, { fetchPolicy: 'cache-and-network' });

  const [fetchSkillGap, { data: gapData, loading: gapLoading }] = useLazyQuery<{
    careerSkillGap: CareerSkillGap;
  }>(CAREER_SKILL_GAP_QUERY);

  const careers = careersData?.careers ?? [];
  const categories = categoriesData?.careerCategories ?? [];
  const activeProfile = profilesData?.myDegreeProfiles?.find(
    (p) => p.status === 'active',
  );

  const handleAnalyse = (career: CareerProfile) => {
    setSelectedCareer(career);
    setSheetOpen(true);
    if (activeProfile) {
      fetchSkillGap({
        variables: { careerId: career.id, profileId: activeProfile.id },
      });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/planner"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Degree Planner
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-8 w-8" aria-hidden="true" />
            Career Explorer
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover career paths and see how your coursework prepares you.
          </p>
        </div>
        <Link href="/ai?agent=course-planner">
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Ask the Course Planner AI
          </Button>
        </Link>
      </div>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* No profile banner */}
      {!activeProfile && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
          <CardContent className="flex items-center gap-3 py-3">
            <Star
              className="h-5 w-5 text-yellow-600 shrink-0"
              aria-hidden="true"
            />
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Set up a degree profile in the{' '}
              <Link href="/planner" className="underline font-medium">
                Degree Planner
              </Link>{' '}
              to see your readiness for each career.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Career Grid */}
      {careersLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-52" />
          ))}
        </div>
      ) : careers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {careers.map((career) => (
            <CareerCard
              key={career.id}
              career={career}
              hasProfile={!!activeProfile}
              onAnalyse={handleAnalyse}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase
              className="h-12 w-12 text-muted-foreground mb-4"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold">No careers found</h2>
            <p className="text-muted-foreground max-w-sm mt-1">
              {selectedCategory !== 'all'
                ? `No career profiles in the "${selectedCategory}" category yet.`
                : 'No career profiles have been added to your institution yet.'}
            </p>
            {selectedCategory !== 'all' && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setSelectedCategory('all')}
              >
                View all categories
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Skill Gap Dialog */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader className="mb-2">
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
              {selectedCareer?.title}
            </DialogTitle>
            <DialogDescription>
              {activeProfile
                ? `Readiness analysis for ${activeProfile.degreeProgram.name} (${activeProfile.degreeProgram.code})`
                : 'Career overview'}
            </DialogDescription>
          </DialogHeader>

          {gapLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-4 w-40" />
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : gapData?.careerSkillGap ? (
            <SkillGapPanel
              gap={gapData.careerSkillGap}
              onClose={() => setSheetOpen(false)}
            />
          ) : selectedCareer ? (
            <div className="space-y-4">
              {selectedCareer.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedCareer.description}
                </p>
              )}
              {selectedCareer.requiredSkills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Required Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCareer.requiredSkills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {!activeProfile && (
                <Link href="/planner">
                  <Button variant="outline" className="w-full gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Set up a degree profile to see readiness
                  </Button>
                </Link>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
