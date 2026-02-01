'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@apollo/client/react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ASSIGNMENT_QUERY,
  MY_SUBMISSIONS_QUERY,
} from '@/lib/graphql/queries/assignments';
import { AssignmentDetail } from '@/components/assignments/assignment-detail';
import { SubmissionForm } from '@/components/assignments/submission-form';
import { SubmissionHistory } from '@/components/assignments/submission-history';
import { SubmissionGradingList } from '@/components/assignments/submission-grading-list';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';

interface AssignmentData {
  id: string;
  sectionId: string;
  title: string;
  description?: string;
  type: string;
  pointsPossible: number;
  dueAt?: string;
  unlockAt?: string;
  lockAt?: string;
}

interface SubmissionData {
  id: string;
  attempt: number;
  content?: string;
  submittedAt?: string;
  score?: number;
  gradedAt?: string;
  feedback?: string;
}

export default function AssignmentPage() {
  const params = useParams();
  const courseId = params.id as string;
  const sectionId = params.sectionId as string;
  const assignmentId = params.assignmentId as string;
  const { user } = useAuthStore();

  /**
   * WHY: Instructors, TAs, and admins see the grading view.
   * Students see the submission form and their own history.
   * Same URL — the page adapts. Forty years of building UIs and this
   * pattern has never failed me: one resource, role-based rendering.
   */
  const isGrader = user?.roles.some((r) =>
    [UserRole.INSTRUCTOR, UserRole.TA, UserRole.ADMIN].includes(r),
  );

  const { data: assignmentData, loading: assignmentLoading } = useQuery<{
    assignment: AssignmentData;
  }>(ASSIGNMENT_QUERY, { variables: { id: assignmentId } });

  const { data: submissionsData, loading: submissionsLoading } = useQuery<{
    mySubmissions: SubmissionData[];
  }>(MY_SUBMISSIONS_QUERY, {
    variables: { assignmentId },
    skip: isGrader === true,
  });

  const assignment = assignmentData?.assignment;

  if (assignmentLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">Assignment not found.</p>
        <Link
          href={`/courses/${courseId}/section/${sectionId}`}
          className="mt-2 inline-block"
        >
          <Button variant="outline">Back to Timeline</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/courses/${courseId}/section/${sectionId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-sm text-muted-foreground">Back to timeline</span>
      </div>

      <AssignmentDetail
        title={assignment.title}
        description={assignment.description}
        type={assignment.type}
        pointsPossible={assignment.pointsPossible}
        dueAt={assignment.dueAt}
        unlockAt={assignment.unlockAt}
        lockAt={assignment.lockAt}
      />

      {isGrader ? (
        <SubmissionGradingList
          assignmentId={assignmentId}
          pointsPossible={assignment.pointsPossible}
        />
      ) : (
        <>
          <SubmissionForm assignmentId={assignmentId} />

          {submissionsLoading ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : (
            <SubmissionHistory
              submissions={submissionsData?.mySubmissions ?? []}
              pointsPossible={assignment.pointsPossible}
            />
          )}
        </>
      )}
    </div>
  );
}
