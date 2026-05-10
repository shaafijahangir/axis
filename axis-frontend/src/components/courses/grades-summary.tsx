'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface GradedAssignment {
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: string;
  pointsPossible: number;
  score: number;
  percentage: number;
  gradedAt: string;
  feedback?: string;
}

interface CourseSectionGrades {
  sectionId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  sectionInstructor?: string;
  totalPointsEarned: number;
  totalPointsPossible: number;
  overallPercentage: number;
  assignments: GradedAssignment[];
}

function percentageColor(pct: number): string {
  if (pct >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 80) return 'text-blue-600 dark:text-blue-400';
  if (pct >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function GradesSummary({
  sections,
}: {
  sections: CourseSectionGrades[];
}) {
  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-medium">No grades yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Grades will appear here once your assignments have been graded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <Card key={section.sectionId}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {section.courseCode} — {section.courseTitle}
                </CardTitle>
                {section.sectionInstructor && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {section.sectionInstructor}
                  </p>
                )}
              </div>
              <div
                className={`text-2xl font-bold ${percentageColor(section.overallPercentage)}`}
              >
                {section.overallPercentage}%
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    %
                  </TableHead>
                  <TableHead className="text-right">Graded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.assignments.map((a) => (
                  <TableRow key={a.assignmentId}>
                    <TableCell className="font-medium">
                      {a.assignmentTitle}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="text-xs capitalize">
                        {a.assignmentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {a.score}/{a.pointsPossible}
                    </TableCell>
                    <TableCell
                      className={`hidden text-right font-medium sm:table-cell ${percentageColor(a.percentage)}`}
                    >
                      {a.percentage}%
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(a.gradedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="hidden sm:table-cell" />
                  <TableCell className="text-right font-semibold">
                    {section.totalPointsEarned}/{section.totalPointsPossible}
                  </TableCell>
                  <TableCell
                    className={`hidden text-right font-semibold sm:table-cell ${percentageColor(section.overallPercentage)}`}
                  >
                    {section.overallPercentage}%
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
