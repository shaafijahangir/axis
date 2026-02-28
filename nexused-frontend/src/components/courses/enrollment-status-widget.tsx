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
  ListOrdered,
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
  CONFIRM_WAITLIST_PROMOTION_MUTATION,
  CANCEL_WAITLIST_ENTRY_MUTATION,
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
  /** ENROLL-010: waitlist position (1-based). null if not waitlisted. */
  waitlistPosition?: number | null;
  /** ENROLL-010: confirmation deadline ISO string. null if not in confirm window. */
  waitlistConfirmBy?: string | null;
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
        <Badge
          variant="secondary"
          className="text-blue-700 bg-blue-50 border-blue-200"
        >
          <ListOrdered className="mr-1 h-3 w-3" aria-hidden="true" />
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
  waitlistPosition,
  waitlistConfirmBy,
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

  const [confirmWaitlistMutation, { loading: confirming }] = useMutation(
    CONFIRM_WAITLIST_PROMOTION_MUTATION,
    {
      onCompleted: () => {
        setCurrentStatus('active');
        onStatusChange('active');
        setError('');
      },
      onError: (err) => setError(err.message),
    },
  );

  const [cancelWaitlistMutation, { loading: cancelling }] = useMutation(
    CANCEL_WAITLIST_ENTRY_MUTATION,
    {
      onCompleted: () => {
        setCurrentStatus('dropped');
        onStatusChange('dropped');
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

        {/* ENROLL-010: Waitlist actions */}
        {currentStatus === 'waitlisted' && (
          <div className="flex items-center gap-2">
            {waitlistConfirmBy && (
              <Button
                size="sm"
                onClick={() =>
                  confirmWaitlistMutation({ variables: { enrollmentId } })
                }
                disabled={confirming}
              >
                {confirming ? 'Confirming...' : 'Confirm Seat'}
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling...' : 'Leave Waitlist'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave the waitlist?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will lose your position on the waitlist. You can re-join
                    from the course catalog, but you&apos;ll be placed at the
                    end.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep My Spot</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() =>
                      cancelWaitlistMutation({ variables: { enrollmentId } })
                    }
                  >
                    Leave Waitlist
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
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

      {/* ENROLL-010: Waitlist position and confirmation info */}
      {currentStatus === 'waitlisted' && (
        <div className="mt-2 space-y-1">
          {waitlistPosition != null && (
            <p className="text-sm text-muted-foreground">
              You are{' '}
              <span className="font-semibold text-foreground">
                #{waitlistPosition}
              </span>{' '}
              on the waitlist. You&apos;ll be notified when a seat becomes
              available.
            </p>
          )}
          {waitlistConfirmBy && (
            <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />A seat is
              available! Confirm by{' '}
              {new Date(waitlistConfirmBy).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}

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
