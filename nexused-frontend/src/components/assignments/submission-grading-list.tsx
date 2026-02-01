'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Clock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ASSIGNMENT_SUBMISSIONS_QUERY } from '@/lib/graphql/queries/assignments';
import { GRADE_SUBMISSION_MUTATION } from '@/lib/graphql/mutations/assignments';

/**
 * WHY: Separate schema per grading action, not one big form for all submissions.
 * Each submission gets its own form state. Tried the "one form rules them all"
 * approach back in 2004 with JSF. Never again.
 */
const gradeSchema = z.object({
  score: z.coerce
    .number({ error: 'Enter a number' })
    .min(0, 'Score cannot be negative'),
  feedback: z.string().optional(),
});

type GradeFormValues = z.infer<typeof gradeSchema>;

interface SubmissionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface SubmissionEntry {
  id: string;
  userId: string;
  attempt: number;
  content?: string;
  submittedAt?: string;
  score?: number;
  gradedAt?: string;
  gradedBy?: string;
  feedback?: string;
  user: SubmissionUser;
}

interface SubmissionGradingListProps {
  assignmentId: string;
  pointsPossible: number;
}

export function SubmissionGradingList({
  assignmentId,
  pointsPossible,
}: SubmissionGradingListProps) {
  const { data, loading } = useQuery<{
    assignmentSubmissions: SubmissionEntry[];
  }>(ASSIGNMENT_SUBMISSIONS_QUERY, { variables: { assignmentId } });

  const submissions = data?.assignmentSubmissions ?? [];
  const gradedCount = submissions.filter((s) => s.gradedAt).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submissions</CardTitle>
        <CardDescription>
          {gradedCount} of {submissions.length} graded
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {submissions.map((submission) => (
          <SubmissionRow
            key={submission.id}
            submission={submission}
            assignmentId={assignmentId}
            pointsPossible={pointsPossible}
          />
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * WHY: Each row manages its own expand/collapse and form state independently.
 * PATTERN: Local state per row, not lifted — keeps re-renders scoped.
 * I've seen juniors try to manage N forms in one parent state.
 * It always ends in tears.
 */
function SubmissionRow({
  submission,
  assignmentId,
  pointsPossible,
}: {
  submission: SubmissionEntry;
  assignmentId: string;
  pointsPossible: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isGraded = submission.gradedAt != null;
  const { user } = submission;
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  // Parse submission content for display
  let displayText = '';
  if (submission.content) {
    try {
      const parsed =
        typeof submission.content === 'string'
          ? JSON.parse(submission.content)
          : submission.content;
      displayText = parsed.text ?? JSON.stringify(parsed);
    } catch {
      displayText = String(submission.content);
    }
  }

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/50"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            Attempt {submission.attempt}
            {submission.submittedAt &&
              ` — ${new Date(submission.submittedAt).toLocaleDateString()}`}
          </p>
        </div>
        {isGraded ? (
          <Badge variant="secondary" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {submission.score}/{pointsPossible}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-amber-600"
          >
            <Clock className="h-3 w-3" />
            Ungraded
          </Badge>
        )}
      </button>

      {expanded && (
        <div className="border-t p-3 space-y-4">
          {displayText && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Student response
              </p>
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                {displayText}
              </div>
            </div>
          )}

          <InlineGradeForm
            submissionId={submission.id}
            assignmentId={assignmentId}
            pointsPossible={pointsPossible}
            currentScore={submission.score}
            currentFeedback={submission.feedback}
          />
        </div>
      )}
    </div>
  );
}

function InlineGradeForm({
  submissionId,
  assignmentId,
  pointsPossible,
  currentScore,
  currentFeedback,
}: {
  submissionId: string;
  assignmentId: string;
  pointsPossible: number;
  currentScore?: number;
  currentFeedback?: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema) as Resolver<GradeFormValues>,
    defaultValues: {
      score: currentScore ?? undefined,
      feedback: currentFeedback ?? '',
    },
  });

  const [gradeSubmission, { loading, error, data }] = useMutation<{
    gradeSubmission: { gradedAt: string };
  }>(GRADE_SUBMISSION_MUTATION, {
    refetchQueries: [
      { query: ASSIGNMENT_SUBMISSIONS_QUERY, variables: { assignmentId } },
    ],
  });

  const saved = data?.gradeSubmission?.gradedAt != null;

  const onSubmit = async (values: GradeFormValues) => {
    await gradeSubmission({
      variables: {
        input: {
          submissionId,
          score: values.score,
          feedback: values.feedback || undefined,
        },
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div className="space-y-1">
          <Label htmlFor={`score-${submissionId}`}>
            Score (out of {pointsPossible})
          </Label>
          <Input
            id={`score-${submissionId}`}
            type="number"
            min={0}
            step="any"
            {...register('score')}
          />
          {errors.score && (
            <p className="text-xs text-red-500">{errors.score.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`feedback-${submissionId}`}>Feedback</Label>
          <Textarea
            id={`feedback-${submissionId}`}
            placeholder="Optional feedback for the student..."
            className="min-h-[60px]"
            {...register('feedback')}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500">Failed to save grade. Try again.</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading
            ? 'Saving...'
            : currentScore != null
              ? 'Update Grade'
              : 'Save Grade'}
        </Button>
        {saved && <span className="text-xs text-green-600">Saved.</span>}
      </div>
    </form>
  );
}
