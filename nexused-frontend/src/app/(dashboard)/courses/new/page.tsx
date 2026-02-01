'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  CourseForm,
  type CourseFormValues,
} from '@/components/courses/course-form';
import { CREATE_COURSE_MUTATION } from '@/lib/graphql/mutations/courses';
import { COURSES_QUERY } from '@/lib/graphql/queries/courses';

export default function NewCoursePage() {
  const router = useRouter();
  const [createCourse, { loading, error }] = useMutation(
    CREATE_COURSE_MUTATION,
    {
      refetchQueries: [{ query: COURSES_QUERY }],
      onCompleted: () => router.push('/courses'),
    },
  );

  const handleSubmit = (data: CourseFormValues) => {
    createCourse({
      variables: {
        input: {
          code: data.code,
          title: data.title,
          description: data.description || undefined,
          credits: data.credits || undefined,
          departmentId: data.departmentId || undefined,
        },
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/courses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Course</h1>
          <p className="text-muted-foreground">
            Add a new course to your institution.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{error.message}</p>
        </div>
      )}

      <CourseForm onSubmit={handleSubmit} isLoading={loading} />
    </div>
  );
}
