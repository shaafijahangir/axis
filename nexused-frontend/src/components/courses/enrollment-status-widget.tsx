'use client';

/**
 * ENROLL-003: Student-facing enrollment status widget.
 *
 * Shown on the section timeline page for non-instructor users.
 * Displays the student's current enrollment status and, for active
 * enrollments, offers Drop or Withdraw actions based on term deadlines.
 *
 * Status → available action:
 *   ACTIVE + before dropDeadline (or no deadline)  → Drop
 *   ACTIVE + after dropDeadline, before withdrawDeadline → Withdraw
 *   ACTIVE + after withdrawDeadline → locked in (no action)
 *   PENDING   → waiting badge
 *   DROPPED   → dropped badge (+ link to catalog)
 *   WITHDRAWN → withdrawn badge
 *   REJECTED  → rejected badge
 */

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DROP_ENROLLMENT_MUTATION,
  WITHDRAW_FROM_COURSE_MUTATION,
} from '@/lib/graphql/mutations/enrollment';

type EnrollmentStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'dropped'
  | 'withdrawn'
  | 'waitlisted'
  | 'rejected';

interface EnrollmentStatusWidgetProps {
  enrollmentId: string;
  status: EnrollmentStatus;
  dropDeadline?: string | null;
  withdrawDeadline?: string | null;
  courseId: string;
  /** Called after a successful drop/withdraw so the parent can refresh. */
  onStatusChange: (newStatus: EnrollmentStatus) => void;
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: EnrollmentStatus }) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
          <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />
          Enrolled
        </Badge>
      );
    case 'pending':
      return (
        <Badge
          variant="secondary"
          className="text-amber-700 bg-amber-50 border-amber-200"
        >
          <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
          Pending approval
        </Badge>
      );
    case 'dropped':
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <XCircle className="mr-1 h-3 w-3" aria-hidden="true" />
          Dropped
        </Badge>
      );
    case 'withdrawn':
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <XCircle className="mr-1 h-3 w-3" aria-hidden="true" />
          Withdrawn
        </Badge>
      );
    case 'rejected':
      return <Badge variant="destructive">Enrollment not approved</Badge>;
    case 'waitlisted':
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
          Waitlisted
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
          Completed
        </Badge>
      );
    default:
      return null;
  }
}

export function EnrollmentStatusWidget({
  enrollmentId,
  status: initialStatus,
  dropDeadline,
  withdrawDeadline,
  courseId,
  onStatusChange,
}: EnrollmentStatusWidgetProps) {
  const [currentStatus, setCurrentStatus] =
    useState<EnrollmentStatus>(initialStatus);
  const [error, setError] = useState('');

  const [dropMutation, { loading: dropping }] = useMutation(
    DROP_ENROLLMENT_MUTATION,
    {
      onCompleted: () => {
        setCurrentStatus('dropped');
        onStatusChange('dropped');
        setError('');
      },
      onError: (err) => setError(err.message),
    },
  );

  const [withdrawMutation, { loading: withdrawing }] = useMutation(
    WITHDRAW_FROM_COURSE_MUTATION,
    {
      onCompleted: () => {
        setCurrentStatus('withdrawn');
        onStatusChange('withdrawn');
        setError('');
      },
      onError: (err) => setError(err.message),
    },
  );

  const now = new Date();
  const dropDate = dropDeadline ? new Date(dropDeadline) : null;
  const withdrawDate = withdrawDeadline ? new Date(withdrawDeadline) : null;

  // Determine which action is available for an active enrollment
  const canDrop = currentStatus === 'active' && (!dropDate || now <= dropDate);
  const canWithdraw =
    currentStatus === 'active' &&
    !canDrop && // past drop window
    (!withdrawDate || now <= withdrawDate);
  const isLockedIn = currentStatus === 'active' && !canDrop && !canWithdraw;

  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Your enrollment:
          </span>
          <StatusBadge status={currentStatus} />
        </div>

        {/* Action buttons — only for active enrollments */}
        {canDrop && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={dropping}
              >
                {dropping ? 'Dropping…' : 'Drop Course'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Drop this course?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <p>
                      Dropping removes your enrollment with no transcript
                      record. You may re-enroll later if seats are available.
                    </p>
                    {dropDate && (
                      <p className="flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        Drop deadline: {formatDeadline(dropDeadline!)}
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => dropMutation({ variables: { enrollmentId } })}
                >
                  Confirm Drop
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {canWithdraw && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={withdrawing}
              >
                {withdrawing ? 'Withdrawing…' : 'Withdraw'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Withdraw from this course?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 text-sm">
                    <p>
                      Withdrawal records a &quot;W&quot; on your transcript and
                      cannot be undone. The drop deadline has passed.
                    </p>
                    {withdrawDate && (
                      <p className="flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        Withdraw deadline: {formatDeadline(withdrawDeadline!)}
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() =>
                    withdrawMutation({ variables: { enrollmentId } })
                  }
                >
                  Confirm Withdrawal
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {isLockedIn && (
          <p className="text-xs text-muted-foreground">
            Both deadlines have passed — contact your institution for changes.
          </p>
        )}

        {/* Re-enroll link for dropped/rejected */}
        {(currentStatus === 'dropped' || currentStatus === 'rejected') && (
          <Button asChild size="sm" variant="outline">
            <Link href="/courses/catalog">
              <BookOpen className="mr-1 h-4 w-4" aria-hidden="true" />
              Browse Catalog
            </Link>
          </Button>
        )}
      </div>

      {/* Deadline info for active enrollments */}
      {currentStatus === 'active' && (dropDate || withdrawDate) && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {dropDate && <span>Drop by: {formatDeadline(dropDeadline!)}</span>}
          {withdrawDate && (
            <span>Withdraw by: {formatDeadline(withdrawDeadline!)}</span>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
