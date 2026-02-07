'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { COURSES_QUERY } from '@/lib/graphql/queries/courses';
import { REMOVE_COURSE_MUTATION } from '@/lib/graphql/mutations/admin-academics';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EditCourseDialog } from './edit-course-dialog';

interface Course {
  id: string;
  code: string;
  title: string;
  description: string | null;
  credits: number | null;
  createdAt: string;
}

export function CoursesTable() {
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);

  const { data, loading, refetch } = useQuery<{ courses: Course[] }>(
    COURSES_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );

  const [removeCourse, { loading: removing }] = useMutation(
    REMOVE_COURSE_MUTATION,
    {
      onCompleted: () => {
        toast.success('Course deleted');
        setDeleteCourse(null);
        refetch();
      },
      onError: (error) => toast.error(error.message),
    },
  );

  const courses = data?.courses ?? [];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {courses.length} course{courses.length !== 1 ? 's' : ''}
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && courses.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : courses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No courses yet.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-mono text-sm">
                    {course.code}
                  </TableCell>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell>{course.credits ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setEditCourse(course)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => setDeleteCourse(course)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditCourseDialog
        open={!!editCourse}
        onOpenChange={(open) => !open && setEditCourse(null)}
        course={editCourse}
        onSuccess={() => refetch()}
      />
      <AlertDialog
        open={!!deleteCourse}
        onOpenChange={(open) => !open && setDeleteCourse(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteCourse?.code} —{' '}
              {deleteCourse?.title}&rdquo;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteCourse &&
                removeCourse({ variables: { id: deleteCourse.id } })
              }
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
