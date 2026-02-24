'use client';

import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { Plus, Library, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  COURSES_QUERY,
  MY_ENROLLMENTS_QUERY,
} from '@/lib/graphql/queries/courses';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';

type EnrollmentStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'dropped'
  | 'withdrawn'
  | 'waitlisted'
  | 'rejected';

const STATUS_BADGE: Record<
  EnrollmentStatus,
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  dropped: { label: 'Dropped', className: '' },
  withdrawn: { label: 'Withdrawn', className: '' },
  waitlisted: { label: 'Waitlisted', className: '' },
  rejected: { label: 'Not approved', className: 'text-destructive' },
};

function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  const cfg = STATUS_BADGE[status] ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

/** Student view — their enrolled sections */
function StudentCoursesView() {
  const { data, loading } = useQuery<{ myEnrollments: any[] }>(
    MY_ENROLLMENTS_QUERY,
  );

  const enrollments = data?.myEnrollments ?? [];
  // Show active + pending first, then the rest
  const sorted = [...enrollments].sort((a, b) => {
    const order = [
      'active',
      'pending',
      'waitlisted',
      'completed',
      'dropped',
      'withdrawn',
      'rejected',
    ];
    return order.indexOf(a.status) - order.indexOf(b.status);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Courses</h1>
          <p className="text-muted-foreground">
            Courses you&apos;re enrolled in this term.
          </p>
        </div>
        <Link href="/courses/catalog">
          <Button variant="outline">
            <Library className="mr-2 h-4 w-4" aria-hidden="true" />
            Browse Catalog
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded" />
          ))}
        </div>
      ) : sorted.length > 0 ? (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden space-y-3">
            {sorted.map((enrollment: any) => {
              const { section } = enrollment;
              const courseUrl = `/courses/${section.course.id}/section/${section.id}`;
              const canOpen =
                enrollment.status === 'active' ||
                enrollment.status === 'pending';
              return (
                <Link key={enrollment.id} href={courseUrl} className="block">
                  <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">
                            {section.course.code}
                          </Badge>
                          <EnrollmentStatusBadge
                            status={enrollment.status as EnrollmentStatus}
                          />
                        </div>
                        <p className="font-medium mt-1.5 truncate">
                          {section.course.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {section.instructor.firstName}{' '}
                          {section.instructor.lastName}
                        </p>
                      </div>
                      {canOpen && (
                        <BookOpen
                          className="h-4 w-4 shrink-0 text-muted-foreground mt-1"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((enrollment: any) => {
                  const { section } = enrollment;
                  const courseUrl = `/courses/${section.course.id}/section/${section.id}`;
                  return (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <Link href={courseUrl} className="hover:underline">
                          <Badge variant="secondary" className="mr-2">
                            {section.course.code}
                          </Badge>
                          <span className="font-medium">
                            {section.course.title}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {section.instructor.firstName}{' '}
                        {section.instructor.lastName}
                      </TableCell>
                      <TableCell>
                        <EnrollmentStatusBadge
                          status={enrollment.status as EnrollmentStatus}
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {(enrollment.status === 'active' ||
                          enrollment.status === 'pending') && (
                          <Button asChild size="sm" variant="ghost">
                            <Link href={courseUrl}>
                              <BookOpen
                                className="mr-1 h-4 w-4"
                                aria-hidden="true"
                              />
                              Open
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">No courses yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the catalog to find and enroll in courses.
          </p>
          <Link href="/courses/catalog" className="mt-4">
            <Button>
              <Library className="mr-2 h-4 w-4" />
              Browse Catalog
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

/** Instructor / Admin view — all courses in the tenant */
function InstructorCoursesView() {
  const { data, loading } = useQuery<{ courses: any[] }>(COURSES_QUERY);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Browse and manage courses.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/courses/catalog">
            <Button variant="outline">
              <Library className="mr-2 h-4 w-4" aria-hidden="true" />
              Browse Catalog
            </Button>
          </Link>
          <Link href="/courses/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Create Course
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : (data?.courses?.length ?? 0) > 0 ? (
        <>
          {/* Mobile: card list */}
          <div className="md:hidden space-y-3">
            {data!.courses.map((course: any) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="block"
              >
                <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Badge variant="secondary">{course.code}</Badge>
                      <p className="font-medium mt-1.5 truncate">
                        {course.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {course.credits ? `${course.credits} credits · ` : ''}
                        {new Date(course.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <BookOpen
                      className="h-4 w-4 shrink-0 text-muted-foreground mt-1"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.courses.map((course: any) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <Link
                        href={`/courses/${course.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        <Badge variant="secondary">{course.code}</Badge>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/courses/${course.id}`}
                        className="hover:underline"
                      >
                        {course.title}
                      </Link>
                    </TableCell>
                    <TableCell>{course.credits ?? '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(course.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">No courses yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating your first course.
          </p>
          <Link href="/courses/new" className="mt-4">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function CoursesPage() {
  const { user } = useAuthStore();
  const isStudent =
    user?.roles.length === 1 && user.roles[0] === UserRole.STUDENT;

  return isStudent ? <StudentCoursesView /> : <InstructorCoursesView />;
}
