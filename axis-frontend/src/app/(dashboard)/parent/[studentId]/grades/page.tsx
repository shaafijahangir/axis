'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { PARENT_STUDENT_GRADES_QUERY } from '@/lib/graphql/queries/parent';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ParentGradeItem {
  assignmentId: string;
  assignmentTitle: string;
  courseCode: string;
  pointsPossible: number;
  score?: number;
  gradedAt?: string;
  dueAt?: string;
}

function scoreColor(pct: number): string {
  if (pct >= 90) return 'text-green-600';
  if (pct >= 70) return 'text-yellow-600';
  return 'text-red-600';
}

export default function ParentStudentGradesPage() {
  const { studentId } = useParams<{ studentId: string }>();

  const { data, loading } = useQuery<{
    parentStudentGrades: ParentGradeItem[];
  }>(PARENT_STUDENT_GRADES_QUERY, { variables: { studentId } });

  const grades = data?.parentStudentGrades ?? [];

  // Group by course
  const byCourse = grades.reduce<Record<string, ParentGradeItem[]>>(
    (acc, g) => {
      if (!acc[g.courseCode]) acc[g.courseCode] = [];
      acc[g.courseCode].push(g);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parent">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Grades</h1>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : Object.keys(byCourse).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No graded assignments yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCourse).map(([courseCode, items]) => {
            const graded = items.filter((i) => i.score != null);
            const totalEarned = graded.reduce((s, i) => s + (i.score ?? 0), 0);
            const totalPossible = graded.reduce(
              (s, i) => s + i.pointsPossible,
              0,
            );
            const pct =
              totalPossible > 0
                ? Math.round((totalEarned / totalPossible) * 100)
                : null;

            return (
              <Card key={courseCode}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{courseCode}</CardTitle>
                    {pct !== null && (
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2 w-24" />
                        <span
                          className={`text-sm font-semibold ${scoreColor(pct)}`}
                        >
                          {pct}%
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="divide-y">
                  {items.map((item) => {
                    const itemPct =
                      item.score != null
                        ? Math.round((item.score / item.pointsPossible) * 100)
                        : null;
                    return (
                      <div
                        key={item.assignmentId}
                        className="flex items-center justify-between py-2.5"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {item.assignmentTitle}
                          </p>
                          {item.dueAt && (
                            <p className="text-xs text-muted-foreground">
                              Due {new Date(item.dueAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {item.score != null ? (
                            <>
                              <p
                                className={`text-sm font-semibold ${scoreColor(itemPct ?? 0)}`}
                              >
                                {item.score}/{item.pointsPossible}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {itemPct}%
                              </p>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Not graded
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
