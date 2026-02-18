'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  Users,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  COURSE_CATALOG_QUERY,
  DEPARTMENT_LIST_QUERY,
} from '@/lib/graphql/queries/student-catalog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CatalogInstructor {
  id: string;
  firstName: string;
  lastName: string;
}

interface CatalogSection {
  id: string;
  schedule: string | null;
  location: string | null;
  capacity: number | null;
  enrolledCount: number;
  seatsAvailable: number | null;
  enrollmentMode: 'open' | 'invite_only';
  termId: string;
  termName: string;
  instructor: CatalogInstructor;
}

interface CatalogCourse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  credits: number | null;
  department: string | null;
  category: string | null;
  courseLevel: number | null;
  prerequisiteCourseIds: string[];
  sections: CatalogSection[];
}

interface StudentCatalogPage {
  total: number;
  items: CatalogCourse[];
}

interface Schedule {
  days?: string[];
  startTime?: string;
  endTime?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSchedule(raw: string | null): Schedule | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Schedule;
  } catch {
    return null;
  }
}

function formatSchedule(raw: string | null): string {
  const sched = parseSchedule(raw);
  if (!sched) return '';
  const days = sched.days?.join('') ?? '';
  const time =
    sched.startTime && sched.endTime
      ? ` ${sched.startTime}–${sched.endTime}`
      : '';
  return days + time;
}

function formatSeatCount(section: CatalogSection): string {
  if (section.capacity === null) return 'Unlimited seats';
  return `${section.seatsAvailable ?? 0} / ${section.capacity} seats`;
}

function seatColor(section: CatalogSection): string {
  if (section.capacity === null) return 'text-muted-foreground';
  const pct =
    section.capacity > 0 ? (section.seatsAvailable ?? 0) / section.capacity : 0;
  if (pct <= 0) return 'text-destructive';
  if (pct <= 0.2) return 'text-orange-500';
  return 'text-green-600 dark:text-green-500';
}

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Core',
  elective: 'Elective',
  general_education: 'Gen Ed',
  lab: 'Lab',
  seminar: 'Seminar',
};

const CATEGORY_OPTIONS = [
  { value: 'core', label: 'Core' },
  { value: 'elective', label: 'Elective' },
  { value: 'general_education', label: 'Gen Ed' },
  { value: 'lab', label: 'Lab' },
  { value: 'seminar', label: 'Seminar' },
];

const LEVEL_OPTIONS = [
  { value: '100', label: '100-level (Intro)' },
  { value: '200', label: '200-level' },
  { value: '300', label: '300-level' },
  { value: '400', label: '400-level' },
  { value: '500', label: '500-level (Grad)' },
];

const PAGE_SIZE = 20;

// ─── Course Detail Dialog ────────────────────────────────────────────────────

function CourseDetailDialog({
  course,
  open,
  onClose,
}: {
  course: CatalogCourse | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            <span className="text-muted-foreground mr-2 font-mono text-base">
              {course.code}
            </span>
            {course.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Meta row */}
          <div className="flex flex-wrap gap-2">
            {course.category && (
              <Badge variant="secondary">
                {CATEGORY_LABELS[course.category] ?? course.category}
              </Badge>
            )}
            {course.credits != null && (
              <Badge variant="outline">{course.credits} credits</Badge>
            )}
            {course.courseLevel != null && (
              <Badge variant="outline">{course.courseLevel}-level</Badge>
            )}
            {course.department && (
              <Badge variant="outline">{course.department}</Badge>
            )}
          </div>

          {/* Description */}
          {course.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {course.description}
            </p>
          )}

          {/* Prerequisites */}
          {course.prerequisiteCourseIds.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Prerequisites</p>
              <p className="text-sm text-muted-foreground">
                {course.prerequisiteCourseIds.length} prerequisite
                {course.prerequisiteCourseIds.length !== 1 ? 's' : ''} required
              </p>
            </div>
          )}

          <Separator />

          {/* Sections */}
          <div>
            <p className="text-sm font-semibold mb-3">
              Available Sections ({course.sections.length})
            </p>
            <div className="space-y-3">
              {course.sections.map((section) => {
                const schedStr = formatSchedule(section.schedule);
                return (
                  <div
                    key={section.id}
                    className="rounded-lg border p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {section.instructor.firstName}{' '}
                          {section.instructor.lastName}
                        </span>
                        {section.enrollmentMode === 'invite_only' && (
                          <Badge variant="secondary" className="text-xs">
                            Invite Only
                          </Badge>
                        )}
                      </div>
                      <span
                        className={`text-sm font-medium ${seatColor(section)}`}
                      >
                        {formatSeatCount(section)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {schedStr && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {schedStr}
                        </span>
                      )}
                      {section.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {section.location}
                        </span>
                      )}
                      <span>{section.termName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Filter Dialog ────────────────────────────────────────────────────────────

function FilterDialog({
  departments,
  filters,
  onFiltersChange,
  activeFilterCount,
}: {
  departments: string[];
  filters: FilterState;
  onFiltersChange: (f: Partial<FilterState>) => void;
  activeFilterCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="relative"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs h-4 w-4">
            {activeFilterCount}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Filter Courses</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Department */}
            <div className="space-y-1.5">
              <Label htmlFor="dept-filter">Department</Label>
              <Select
                value={filters.department ?? 'all'}
                onValueChange={(v) =>
                  onFiltersChange({ department: v === 'all' ? undefined : v })
                }
              >
                <SelectTrigger id="dept-filter">
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-filter">Category</Label>
              <Select
                value={filters.category ?? 'all'}
                onValueChange={(v) =>
                  onFiltersChange({ category: v === 'all' ? undefined : v })
                }
              >
                <SelectTrigger id="cat-filter">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level */}
            <div className="space-y-1.5">
              <Label htmlFor="level-filter">Course Level</Label>
              <Select
                value={filters.courseLevel ?? 'all'}
                onValueChange={(v) =>
                  onFiltersChange({ courseLevel: v === 'all' ? undefined : v })
                }
              >
                <SelectTrigger id="level-filter">
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {LEVEL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Has seats */}
            <div className="flex items-center gap-3">
              <input
                id="has-seats"
                type="checkbox"
                className="rounded border-input"
                checked={filters.hasSeats ?? false}
                onChange={(e) =>
                  onFiltersChange({ hasSeats: e.target.checked || undefined })
                }
              />
              <Label htmlFor="has-seats" className="cursor-pointer">
                Available seats only
              </Label>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onFiltersChange({
                    department: undefined,
                    category: undefined,
                    courseLevel: undefined,
                    hasSeats: undefined,
                  });
                }}
              >
                Clear all
              </Button>
              <Button className="flex-1" onClick={() => setOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({
  course,
  onClick,
}: {
  course: CatalogCourse;
  onClick: () => void;
}) {
  const totalSeats = course.sections.reduce(
    (sum, s) => sum + (s.seatsAvailable ?? Infinity),
    0,
  );
  const totalCapacity = course.sections.reduce(
    (sum, s) => sum + (s.capacity ?? 0),
    0,
  );

  // Show the first section's instructor/schedule as a preview
  const primary = course.sections[0];

  return (
    <button
      className="w-full text-left rounded-lg border bg-card p-5 hover:shadow-md hover:border-primary/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
      aria-label={`View details for ${course.code}: ${course.title}`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs text-muted-foreground">
                {course.code}
              </span>
              {course.category && (
                <Badge variant="secondary" className="text-xs">
                  {CATEGORY_LABELS[course.category] ?? course.category}
                </Badge>
              )}
              {course.courseLevel != null && (
                <Badge variant="outline" className="text-xs">
                  {course.courseLevel}-level
                </Badge>
              )}
            </div>
            <h3 className="font-semibold leading-snug">{course.title}</h3>
          </div>
          {course.credits != null && (
            <span className="shrink-0 text-sm font-medium text-muted-foreground">
              {course.credits} cr
            </span>
          )}
        </div>

        {/* Description preview */}
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        )}

        {/* Primary section info */}
        {primary && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" aria-hidden="true" />
              {primary.instructor.firstName} {primary.instructor.lastName}
            </span>
            {formatSchedule(primary.schedule) && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {formatSchedule(primary.schedule)}
              </span>
            )}
            {primary.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                {primary.location}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {course.sections.length} section
            {course.sections.length !== 1 ? 's' : ''}
          </span>
          {totalCapacity > 0 ? (
            <span
              className={`text-xs font-medium ${
                totalSeats <= 0
                  ? 'text-destructive'
                  : totalSeats / totalCapacity <= 0.2
                    ? 'text-orange-500'
                    : 'text-green-600 dark:text-green-500'
              }`}
            >
              {Math.max(0, isFinite(totalSeats) ? totalSeats : 0)} seats
              available
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Unlimited seats
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState {
  search: string;
  department?: string;
  category?: string;
  courseLevel?: string;
  hasSeats?: boolean;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CourseCatalogPage() {
  const [filters, setFilters] = useState<FilterState>({ search: '' });
  const [page, setPage] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<CatalogCourse | null>(
    null,
  );

  const activeFilterCount = [
    filters.department,
    filters.category,
    filters.courseLevel,
    filters.hasSeats,
  ].filter(Boolean).length;

  const graphqlFilters = {
    search: filters.search || undefined,
    department: filters.department,
    category: filters.category,
    courseLevel: filters.courseLevel
      ? parseInt(filters.courseLevel)
      : undefined,
    hasSeats: filters.hasSeats,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };

  const { data, loading, error } = useQuery<{
    courseCatalog: StudentCatalogPage;
  }>(COURSE_CATALOG_QUERY, {
    variables: { filters: graphqlFilters },
    fetchPolicy: 'cache-and-network',
  });

  const { data: deptData } = useQuery<{ departmentList: string[] }>(
    DEPARTMENT_LIST_QUERY,
    { fetchPolicy: 'cache-first' },
  );

  const updateFilters = useCallback((partial: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
    setPage(0);
  }, []);

  const catalog = data?.courseCatalog;
  const totalPages = catalog ? Math.ceil(catalog.total / PAGE_SIZE) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/courses"
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Back to courses</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Course Catalog</h1>
          <p className="text-muted-foreground text-sm">
            Browse available courses for the current term
          </p>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            className="pl-9"
            placeholder="Search by title, code, or instructor…"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            aria-label="Search courses"
          />
          {filters.search && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => updateFilters({ search: '' })}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <FilterDialog
          departments={deptData?.departmentList ?? []}
          filters={filters}
          onFiltersChange={updateFilters}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Results count */}
      {!loading && catalog && (
        <p className="text-sm text-muted-foreground">
          {catalog.total} course{catalog.total !== 1 ? 's' : ''} found
          {page > 0 && ` · Page ${page + 1} of ${totalPages}`}
        </p>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load catalog. Please try again.
        </div>
      )}

      {/* Loading skeletons */}
      {loading && !catalog && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-5 space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Course grid */}
      {catalog && catalog.items.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {catalog.items.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onClick={() => setSelectedCourse(course)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {catalog && catalog.items.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-16 text-center">
          <BookOpen
            className="h-10 w-10 text-muted-foreground mb-3"
            aria-hidden="true"
          />
          <h3 className="text-lg font-medium">No courses found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            {activeFilterCount > 0 || filters.search
              ? 'Try adjusting your search or filters.'
              : 'No courses are available for the current term.'}
          </p>
          {(activeFilterCount > 0 || filters.search) && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setFilters({ search: '' });
                setPage(0);
              }}
            >
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* Course detail dialog */}
      <CourseDetailDialog
        course={selectedCourse}
        open={selectedCourse !== null}
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
}
