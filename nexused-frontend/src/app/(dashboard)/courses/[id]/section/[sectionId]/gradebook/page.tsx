'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft, Download } from 'lucide-react';
import { SECTION_QUERY } from '@/lib/graphql/queries/courses';
import { SECTION_GRADEBOOK_QUERY } from '@/lib/graphql/queries/gradebook';
import { CourseHeader } from '@/components/courses/course-header';
import { SectionGradebook } from '@/components/courses/section-gradebook';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface SectionData {
  id: string;
  location?: string;
  course: { id: string; code: string; title: string };
  instructor: { firstName: string; lastName: string };
}

interface GradebookGrade {
  assignmentId: string;
  submissionId?: string;
  score?: number;
  submittedAt?: string;
  gradedAt?: string;
}

interface GradebookStudentRow {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  grades: GradebookGrade[];
  totalEarned: number;
  totalPossible: number;
  percentage: number;
}

interface GradebookAssignmentColumn {
  id: string;
  title: string;
  type: string;
  pointsPossible: number;
  dueAt?: string;
  averageScore?: number;
  medianScore?: number;
}

interface GradebookData {
  sectionGradebook: {
    assignments: GradebookAssignmentColumn[];
    students: GradebookStudentRow[];
    classAverage: number;
  };
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadGradebookCsv(
  assignments: GradebookAssignmentColumn[],
  students: GradebookStudentRow[],
  courseCode?: string,
) {
  const headers = [
    'Last Name',
    'First Name',
    'Email',
    ...assignments.map((a) => `${a.title} (${a.pointsPossible})`),
    'Total Earned',
    'Total Possible',
    'Percentage',
  ];

  const rows = students.map((s) => [
    escapeCsvField(s.lastName),
    escapeCsvField(s.firstName),
    escapeCsvField(s.email),
    ...s.grades.map((g) => (g.score != null ? String(g.score) : '')),
    String(s.totalEarned),
    String(s.totalPossible),
    `${s.percentage.toFixed(2)}%`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `gradebook${courseCode ? `-${courseCode}` : ''}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function GradebookSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export default function GradebookPage() {
  const params = useParams();
  const courseId = params.id as string;
  const sectionId = params.sectionId as string;

  const { data: sectionData, loading: sectionLoading } = useQuery<{
    section: SectionData;
  }>(SECTION_QUERY, { variables: { id: sectionId } });

  const {
    data: gradebookData,
    loading: gradebookLoading,
    error,
  } = useQuery<GradebookData>(SECTION_GRADEBOOK_QUERY, {
    variables: { sectionId },
  });

  const section = sectionData?.section;
  const gradebook = gradebookData?.sectionGradebook;

  return (
    <div className="-m-6">
      {sectionLoading ? (
        <div className="border-b p-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-8 w-64" />
        </div>
      ) : section ? (
        <CourseHeader
          courseId={section.course.id}
          courseCode={section.course.code}
          courseTitle={section.course.title}
          instructorName={`${section.instructor.firstName} ${section.instructor.lastName}`}
          location={section.location}
        />
      ) : null}

      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild size="sm" variant="ghost">
              <Link href={`/courses/${courseId}/section/${sectionId}`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
            <h2 className="text-xl font-semibold">Gradebook</h2>
          </div>
          {gradebook && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {gradebook.students.length} student
                {gradebook.students.length !== 1 ? 's' : ''} &middot;{' '}
                {gradebook.assignments.length} assignment
                {gradebook.assignments.length !== 1 ? 's' : ''}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadGradebookCsv(
                    gradebook.assignments,
                    gradebook.students,
                    section?.course.code,
                  )
                }
              >
                <Download className="mr-1 h-4 w-4" />
                CSV
              </Button>
            </div>
          )}
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            Failed to load gradebook. {error.message}
          </div>
        ) : gradebookLoading ? (
          <GradebookSkeleton />
        ) : gradebook ? (
          <SectionGradebook
            assignments={gradebook.assignments}
            students={gradebook.students}
            classAverage={gradebook.classAverage}
          />
        ) : null}
      </div>
    </div>
  );
}
