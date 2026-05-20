'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PARENT_STUDENT_REPORT_CARDS_QUERY } from '@/lib/graphql/queries/parent';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ParentReportCard {
  id: string;
  courseCode: string;
  courseTitle: string;
  termName: string;
  status: string;
  finalGrade?: string;
  teacherComment?: string;
  gradeSummary?: string;
  attendanceSummary?: string;
  publishedAt?: string;
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

function ReportCardItem({ card }: { card: ParentReportCard }) {
  const [expanded, setExpanded] = useState(false);

  const grade: GradeSummary | null = card.gradeSummary
    ? (JSON.parse(card.gradeSummary) as GradeSummary)
    : null;
  const attendance: AttendanceSummary | null = card.attendanceSummary
    ? (JSON.parse(card.attendanceSummary) as AttendanceSummary)
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{card.courseCode}</Badge>
              <span className="text-sm text-muted-foreground">
                {card.termName}
              </span>
            </div>
            <CardTitle className="mt-1 text-base">{card.courseTitle}</CardTitle>
            {card.publishedAt && (
              <CardDescription>
                Published {new Date(card.publishedAt).toLocaleDateString()}
              </CardDescription>
            )}
          </div>
          <div className="text-right">
            {card.finalGrade ? (
              <span className="text-2xl font-bold text-primary">
                {card.finalGrade}
              </span>
            ) : grade ? (
              <span className="text-2xl font-bold text-primary">
                {grade.percentage}%
              </span>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {card.teacherComment && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Teacher comment
            </p>
            <p>{card.teacherComment}</p>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-0 text-xs text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>
              <ChevronUp className="mr-1 h-3 w-3" /> Hide details
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-3 w-3" /> Show details
            </>
          )}
        </Button>

        {expanded && (
          <div className="grid gap-3 sm:grid-cols-2">
            {grade && (
              <div className="rounded-md border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Grades
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Points earned</span>
                    <span className="font-medium">
                      {grade.totalEarned}/{grade.totalPossible}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Percentage</span>
                    <span className="font-medium">{grade.percentage}%</span>
                  </div>
                </div>
              </div>
            )}
            {attendance && (
              <div className="rounded-md border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Attendance
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Present</span>
                    <span className="font-medium">{attendance.present}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Absent</span>
                    <span className="font-medium">{attendance.absent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Late</span>
                    <span className="font-medium">{attendance.late}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate</span>
                    <span className="font-medium">
                      {attendance.attendanceRate}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ParentStudentReportCardsPage() {
  const { studentId } = useParams<{ studentId: string }>();

  const { data, loading } = useQuery<{
    parentStudentReportCards: ParentReportCard[];
  }>(PARENT_STUDENT_REPORT_CARDS_QUERY, { variables: { studentId } });

  const cards = data?.parentStudentReportCards ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parent">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Report Cards</h1>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              No published report cards yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <ReportCardItem key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
