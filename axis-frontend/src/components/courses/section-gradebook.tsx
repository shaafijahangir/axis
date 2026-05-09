'use client';

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface SectionGradebookProps {
  assignments: GradebookAssignmentColumn[];
  students: GradebookStudentRow[];
  classAverage: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function percentageColor(pct: number): string {
  if (pct >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 80) return 'text-blue-600 dark:text-blue-400';
  if (pct >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function formatType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SectionGradebook({
  assignments,
  students,
  classAverage,
}: SectionGradebookProps) {
  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-medium">No assignments yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Grades will appear here once assignments are created.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 z-10 min-w-[200px] bg-muted/50 px-4 py-3 text-left font-medium">
              Student
            </th>
            {assignments.map((a) => (
              <th
                key={a.id}
                className="min-w-[120px] px-4 py-3 text-center font-medium"
              >
                <div className="truncate" title={a.title}>
                  {a.title}
                </div>
                <div className="text-xs font-normal text-muted-foreground">
                  {formatType(a.type)} &middot; {a.pointsPossible} pts
                </div>
              </th>
            ))}
            <th className="min-w-[130px] px-4 py-3 text-center font-medium">
              Total
            </th>
          </tr>
        </thead>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <tbody>
          {students.map((student) => (
            <tr
              key={student.studentId}
              className="border-b transition-colors hover:bg-muted/30"
            >
              <td className="sticky left-0 z-10 bg-background px-4 py-3">
                <div className="font-medium">
                  {student.lastName}, {student.firstName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {student.email}
                </div>
              </td>
              {student.grades.map((grade) => (
                <td
                  key={grade.assignmentId}
                  className="px-4 py-3 text-center tabular-nums"
                >
                  {grade.score != null ? (
                    <span className="font-medium">{grade.score}</span>
                  ) : grade.submittedAt ? (
                    <span
                      className="text-muted-foreground"
                      role="img"
                      aria-label="Submitted, not yet graded"
                      title="Submitted, not yet graded"
                    >
                      —
                    </span>
                  ) : null}
                </td>
              ))}
              <td className="px-4 py-3 text-center tabular-nums">
                <div className="font-medium">
                  {student.totalEarned}/{student.totalPossible}
                </div>
                <div
                  className={`text-xs font-semibold ${percentageColor(student.percentage)}`}
                >
                  {student.percentage.toFixed(1)}%
                </div>
              </td>
            </tr>
          ))}

          {students.length === 0 && (
            <tr>
              <td
                colSpan={assignments.length + 2}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                No students enrolled.
              </td>
            </tr>
          )}
        </tbody>

        {/* ── Footer: Stats ──────────────────────────────────────────── */}
        <tfoot>
          <tr className="border-t bg-muted/50 font-medium">
            <td className="sticky left-0 z-10 bg-muted/50 px-4 py-2 text-sm">
              Average
            </td>
            {assignments.map((a) => (
              <td
                key={a.id}
                className="px-4 py-2 text-center text-sm tabular-nums"
              >
                {a.averageScore != null ? a.averageScore.toFixed(1) : '–'}
              </td>
            ))}
            <td className="px-4 py-2 text-center text-sm">
              <span
                className={`font-semibold ${percentageColor(classAverage)}`}
              >
                {classAverage.toFixed(1)}%
              </span>
            </td>
          </tr>
          <tr className="bg-muted/50 font-medium">
            <td className="sticky left-0 z-10 bg-muted/50 px-4 py-2 text-sm">
              Median
            </td>
            {assignments.map((a) => (
              <td
                key={a.id}
                className="px-4 py-2 text-center text-sm tabular-nums"
              >
                {a.medianScore != null ? a.medianScore.toFixed(1) : '–'}
              </td>
            ))}
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
