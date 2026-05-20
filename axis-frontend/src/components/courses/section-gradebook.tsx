'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { OVERRIDE_GRADE_MUTATION } from '@/lib/graphql/mutations/assignments';

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
  sectionId: string;
  assignments: GradebookAssignmentColumn[];
  students: GradebookStudentRow[];
  classAverage: number;
  onRefetch: () => void;
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

// ─── Editable Grade Cell ─────────────────────────────────────────────────────

function GradeCell({
  sectionId,
  studentId,
  assignmentId,
  score,
  pointsPossible,
  onRefetch,
}: {
  sectionId: string;
  studentId: string;
  assignmentId: string;
  score?: number;
  pointsPossible: number;
  onRefetch: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [overrideGrade] = useMutation(OVERRIDE_GRADE_MUTATION);

  const startEdit = useCallback(() => {
    setDraft(score != null ? String(score) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [score]);

  const save = useCallback(async () => {
    const parsed = parseFloat(draft);
    if (draft.trim() === '' || isNaN(parsed)) {
      setEditing(false);
      return;
    }
    if (parsed < 0 || parsed > pointsPossible) {
      toast.error(`Score must be between 0 and ${pointsPossible}`);
      return;
    }
    if (parsed === score) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await overrideGrade({
        variables: {
          input: { sectionId, studentId, assignmentId, score: parsed },
        },
      });
      toast.success('Grade saved');
      onRefetch();
    } catch {
      toast.error('Failed to save grade');
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [
    draft,
    score,
    pointsPossible,
    sectionId,
    studentId,
    assignmentId,
    overrideGrade,
    onRefetch,
  ]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        max={pointsPossible}
        step="0.5"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-16 rounded border border-primary bg-background px-1 py-0.5 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
        aria-label="Enter grade"
        disabled={saving}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className="group relative min-w-[3rem] rounded px-2 py-1 text-center tabular-nums hover:bg-muted/60 focus:outline-none focus:ring-1 focus:ring-ring"
      title="Click to edit grade"
      aria-label={
        score != null
          ? `Grade: ${score}. Click to edit`
          : 'No grade. Click to enter'
      }
    >
      {score != null ? (
        <span className="font-medium">{score}</span>
      ) : (
        <span className="text-muted-foreground/40 group-hover:text-muted-foreground">
          —
        </span>
      )}
    </button>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SectionGradebook({
  sectionId,
  assignments,
  students,
  classAverage,
  onRefetch,
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
              {student.grades.map((grade) => {
                const assignment = assignments.find(
                  (a) => a.id === grade.assignmentId,
                );
                return (
                  <td
                    key={grade.assignmentId}
                    className="px-2 py-1 text-center"
                  >
                    <GradeCell
                      sectionId={sectionId}
                      studentId={student.studentId}
                      assignmentId={grade.assignmentId}
                      score={grade.score}
                      pointsPossible={assignment?.pointsPossible ?? 100}
                      onRefetch={onRefetch}
                    />
                  </td>
                );
              })}
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
      <p className="px-4 py-2 text-xs text-muted-foreground">
        Click any grade cell to edit. Press Enter to save, Escape to cancel.
      </p>
    </div>
  );
}
