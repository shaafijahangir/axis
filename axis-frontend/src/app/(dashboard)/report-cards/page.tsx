'use client';

import { useQuery } from '@apollo/client/react';
import { FileText, Printer } from 'lucide-react';
import { MY_REPORT_CARDS_QUERY } from '@/lib/graphql/queries/report-cards';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ReportCardSummary {
  id: string;
  courseCode: string;
  courseTitle: string;
  termName: string;
  status: 'DRAFT' | 'PUBLISHED';
  teacherComment?: string;
  finalGrade?: string;
  gradeSummary?: string;
  attendanceSummary?: string;
  publishedAt?: string;
  createdAt: string;
}

interface GradeSummary {
  totalEarned: number;
  totalPossible: number;
  percentage: number;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

function parseJson<T>(s?: string): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function percentageColor(pct: number): string {
  if (pct >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 80) return 'text-blue-600 dark:text-blue-400';
  if (pct >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ReportCardsPage() {
  const { data, loading, error } = useQuery<{
    myReportCards: ReportCardSummary[];
  }>(MY_REPORT_CARDS_QUERY);

  const cards = data?.myReportCards ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">Report Cards</h1>
        </div>
        {cards.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border p-6 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">
            Failed to load report cards.
          </p>
        </div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-lg font-medium">No report cards yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Report cards will appear here once your instructor publishes them.
          </p>
        </div>
      ) : (
        <div className="space-y-6 print:space-y-4">
          {cards.map((card) => {
            const grade = parseJson<GradeSummary>(card.gradeSummary);
            const attend = parseJson<AttendanceSummary>(card.attendanceSummary);

            return (
              <Card key={card.id} className="print:shadow-none print:border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">
                        {card.courseCode} — {card.courseTitle}
                      </CardTitle>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {card.termName}
                      </p>
                      {card.publishedAt && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Published {formatDate(card.publishedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {card.finalGrade && (
                        <span className="text-3xl font-bold tracking-tight">
                          {card.finalGrade}
                        </span>
                      )}
                      <Badge variant="secondary">{card.termName}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Grade summary */}
                  {grade && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                        Grade Summary
                      </p>
                      <div className="flex items-center gap-4">
                        <div>
                          <span
                            className={`text-2xl font-bold ${percentageColor(grade.percentage)}`}
                          >
                            {grade.percentage}%
                          </span>
                          <span className="ml-1.5 text-sm text-muted-foreground">
                            ({grade.totalEarned}/{grade.totalPossible} pts)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attendance summary */}
                  {attend && attend.total > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                          Attendance
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div>
                            <span
                              className={`font-semibold ${percentageColor(attend.attendanceRate)}`}
                            >
                              {attend.attendanceRate}%
                            </span>
                            <span className="ml-1 text-muted-foreground">
                              attendance rate
                            </span>
                          </div>
                          <div className="flex gap-3 text-muted-foreground">
                            <span>
                              Present:{' '}
                              <strong className="text-foreground">
                                {attend.present}
                              </strong>
                            </span>
                            <span>
                              Absent:{' '}
                              <strong className="text-foreground">
                                {attend.absent}
                              </strong>
                            </span>
                            {attend.late > 0 && (
                              <span>
                                Late:{' '}
                                <strong className="text-foreground">
                                  {attend.late}
                                </strong>
                              </span>
                            )}
                            {attend.excused > 0 && (
                              <span>
                                Excused:{' '}
                                <strong className="text-foreground">
                                  {attend.excused}
                                </strong>
                              </span>
                            )}
                            <span>
                              Total:{' '}
                              <strong className="text-foreground">
                                {attend.total}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Teacher comment */}
                  {card.teacherComment && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                          Teacher Comment
                        </p>
                        <p className="text-sm leading-relaxed">
                          {card.teacherComment}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
