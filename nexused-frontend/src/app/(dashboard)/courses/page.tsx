'use client';

import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
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
import { COURSES_QUERY } from '@/lib/graphql/queries/courses';

export default function CoursesPage() {
  const { data, loading } = useQuery<{ courses: any[] }>(COURSES_QUERY);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Browse and manage courses.</p>
        </div>
        <Link href="/courses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : (data?.courses?.length ?? 0) > 0 ? (
        <div className="rounded-md border">
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
