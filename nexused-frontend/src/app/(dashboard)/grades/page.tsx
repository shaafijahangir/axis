'use client';

import { useQuery } from '@apollo/client/react';
import { GraduationCap } from 'lucide-react';
import { MY_GRADES_QUERY } from '@/lib/graphql/queries/grades';
import { GradesSummary } from '@/components/courses/grades-summary';
import { Skeleton } from '@/components/ui/skeleton';

export default function GradesPage() {
  const { data, loading, error } = useQuery(MY_GRADES_QUERY);

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
        <GradesSummary sections={data?.myGrades ?? []} />
      )}
    </div>
  );
}
