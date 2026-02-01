'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  COURSE_QUERY,
  COURSE_SECTIONS_QUERY,
} from '@/lib/graphql/queries/courses';
import { SectionList } from '@/components/courses/section-list';

export default function CourseDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: courseData, loading: courseLoading } = useQuery<{
    course: any;
  }>(COURSE_QUERY, { variables: { id } });
  const { data: sectionsData, loading: sectionsLoading } = useQuery<{
    courseSections: any[];
  }>(COURSE_SECTIONS_QUERY, { variables: { courseId: id } });

  if (courseLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const course = courseData?.course;
  if (!course) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Course not found.</p>
        <Link href="/courses" className="mt-2 inline-block">
          <Button variant="outline">Back to Courses</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{course.code}</Badge>
            {course.credits && (
              <Badge variant="outline">{course.credits} credits</Badge>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold">{course.title}</h1>
        </div>
      </div>

      {course.description && (
        <p className="text-muted-foreground">{course.description}</p>
      )}

      <Separator />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Sections</h2>
        {sectionsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <SectionList
            courseId={id}
            sections={sectionsData?.courseSections ?? []}
            showEnroll
          />
        )}
      </div>
    </div>
  );
}
