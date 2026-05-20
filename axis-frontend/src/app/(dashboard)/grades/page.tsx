'use client';

import { useQuery } from '@apollo/client/react';
import { GraduationCap } from 'lucide-react';
import { MY_GRADES_QUERY } from '@/lib/graphql/queries/grades';
import { MY_ATTENDANCE_SUMMARIES_QUERY } from '@/lib/graphql/queries/attendance';
import { GradesSummary } from '@/components/courses/grades-summary';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceSummary {
  userId: string;
  sectionId: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

export default function GradesPage() {
  const { data, loading, error } = useQuery<{
    myGrades: {
      sectionId: string;
      courseId: string;
      courseCode: string;
      courseTitle: string;
      sectionInstructor?: string;
      totalPointsEarned: number;
      totalPointsPossible: number;
      overallPercentage: number;
      assignments: {
        assignmentId: string;
        assignmentTitle: string;
        assignmentType: string;
        pointsPossible: number;
        score: number;
        percentage: number;
        gradedAt: string;
        feedback?: string;
      }[];
    }[];
  }>(MY_GRADES_QUERY);

  const { data: attendanceData } = useQuery<{
    myAttendanceSummaries: AttendanceSummary[];
  }>(MY_ATTENDANCE_SUMMARIES_QUERY);

  // Build a sectionId → attendance map so GradesSummary can look up by section
  const attendanceMap = new Map<string, AttendanceSummary>();
  for (const a of attendanceData?.myAttendanceSummaries ?? []) {
    attendanceMap.set(a.sectionId, a);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-7 w-7 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">Grades</h1>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-lg border p-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load grades. Please try again later.
          </p>
        </div>
      ) : (
        <GradesSummary
          sections={data?.myGrades ?? []}
          attendanceMap={attendanceMap}
        />
      )}
    </div>
  );
}
