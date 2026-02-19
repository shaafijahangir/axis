'use client';

/**
 * ENROLL-002: Enrollment dialog for the student course catalog.
 *
 * Handles two modes:
 *  - OPEN: Shows section info and a confirm button. One click enrolls.
 *  - INVITE_ONLY: Shows an invite code input before confirming.
 *
 * ENROLL-006: If the course has unmet prerequisites, shows a prerequisite
 * warning panel before the confirm button. The student must explicitly
 * acknowledge the warning to proceed (opt-in override, not a hard block).
 *
 * After enrollment, shows the result: "Enrolled!" (active) or
 * "Pending approval" (pending — instructor hasn't set autoApprove).
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { CheckCircle2, Clock, Lock, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ENROLL_IN_SECTION_MUTATION } from '@/lib/graphql/mutations/enrollment';
import { COURSE_PREREQUISITES_QUERY } from '@/lib/graphql/queries/planner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnrollSection {
  id: string;
  termName: string;
  schedule: string | null;
  location: string | null;
  capacity: number | null;
  seatsAvailable: number | null;
  enrollmentMode: 'open' | 'invite_only';
  instructor: { firstName: string; lastName: string };
}

interface PrerequisiteStatus {
  courseId: string;
  courseCode: string;
  courseTitle: string;
  status: 'completed' | 'in_progress' | 'missing';
}

interface PrerequisiteCheckResult {
  courseId: string;
  courseCode: string;
  allMet: boolean;
  metCount: number;
  totalRequired: number;
  prerequisites: PrerequisiteStatus[];
}

interface EnrollDialogProps {
  courseName: string;
  courseCode: string;
  /** Course ID — used to fetch prerequisite status (ENROLL-006). */
  courseId?: string;
  section: EnrollSection | null;
  open: boolean;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSchedule(raw: string | null): string {
  if (!raw) return '';
  try {
    const s = JSON.parse(raw) as {
      days?: string[];
      startTime?: string;
      endTime?: string;
    };
    const days = s.days?.join('') ?? '';
    const time = s.startTime && s.endTime ? ` ${s.startTime}–${s.endTime}` : '';
    return days + time;
  } catch {
    return '';
  }
}

type EnrollState = 'idle' | 'loading' | 'success' | 'error';

// ─── Prerequisite Warning Panel ───────────────────────────────────────────────

function PrerequisiteWarning({
  result,
  acknowledged,
  onAcknowledge,
}: {
  result: PrerequisiteCheckResult;
  acknowledged: boolean;
  onAcknowledge: (v: boolean) => void;
}) {
  const missing = result.prerequisites.filter((p) => p.status === 'missing');
  const inProgress = result.prerequisites.filter(
    (p) => p.status === 'in_progress',
  );

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Prerequisite requirements not met
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {result.metCount} of {result.totalRequired} prerequisite
            {result.totalRequired !== 1 ? 's' : ''} satisfied.
          </p>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            Not yet taken:
          </p>
          <ul className="space-y-0.5">
            {missing.map((p) => (
              <li
                key={p.courseId}
                className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5"
              >
                <span className="font-mono">{p.courseCode}</span>
                <span className="text-amber-600/70 dark:text-amber-400/70">
                  —
                </span>
                {p.courseTitle}
              </li>
            ))}
          </ul>
        </div>
      )}

      {inProgress.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            Currently in progress:
          </p>
          <ul className="space-y-0.5">
            {inProgress.map((p) => (
              <li
                key={p.courseId}
                className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5"
              >
                <span className="font-mono">{p.courseCode}</span>
                <span className="text-amber-600/70 dark:text-amber-400/70">
                  —
                </span>
                {p.courseTitle}
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 rounded border-amber-400"
          checked={acknowledged}
          onChange={(e) => onAcknowledge(e.target.checked)}
          aria-label="Acknowledge and proceed with enrollment despite missing prerequisites"
        />
        <span className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
          I understand the prerequisites are not fully met and want to proceed
          with enrollment anyway.
        </span>
      </label>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function EnrollDialog({
  courseName,
  courseCode,
  courseId,
  section,
  open,
  onClose,
}: EnrollDialogProps) {
  const [inviteCode, setInviteCode] = useState('');
  const [state, setState] = useState<EnrollState>('idle');
  const [enrolledStatus, setEnrolledStatus] = useState<'active' | 'pending'>(
    'active',
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [prereqAcknowledged, setPrereqAcknowledged] = useState(false);

  const [enrollMutation] = useMutation(ENROLL_IN_SECTION_MUTATION);

  // ── ENROLL-006: Lazy prerequisite check ────────────────────────────────────
  // Skip until the dialog is open and we have a courseId to check.
  const { data: prereqData, loading: prereqLoading } = useQuery<{
    coursePrerequisites: PrerequisiteCheckResult;
  }>(COURSE_PREREQUISITES_QUERY, {
    variables: { courseId },
    skip: !open || !courseId,
    fetchPolicy: 'cache-first',
  });

  const prereqResult = prereqData?.coursePrerequisites;
  const prereqsNotMet = prereqResult != null && !prereqResult.allMet;

  function handleClose() {
    setInviteCode('');
    setState('idle');
    setErrorMsg('');
    setPrereqAcknowledged(false);
    onClose();
  }

  async function handleEnroll() {
    if (!section) return;
    setState('loading');
    setErrorMsg('');
    try {
      const { data } = await enrollMutation({
        variables: {
          sectionId: section.id,
          inviteCode:
            section.enrollmentMode === 'invite_only' ? inviteCode : undefined,
        },
      });
      const status = (data as { enrollInSection: { status: string } } | null)
        ?.enrollInSection?.status;
      setEnrolledStatus(status === 'pending' ? 'pending' : 'active');
      setState('success');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Enrollment failed. Try again.';
      setErrorMsg(msg);
      setState('error');
    }
  }

  if (!section) return null;

  const schedStr = formatSchedule(section.schedule);
  const isInviteOnly = section.enrollmentMode === 'invite_only';
  const canSubmit =
    state !== 'loading' &&
    !prereqLoading &&
    (isInviteOnly ? inviteCode.trim().length >= 4 : true) &&
    (!prereqsNotMet || prereqAcknowledged);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="font-mono text-sm text-muted-foreground mr-2">
              {courseCode}
            </span>
            {courseName}
          </DialogTitle>
        </DialogHeader>

        {state === 'success' ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            {enrolledStatus === 'active' ? (
              <>
                <CheckCircle2
                  className="h-12 w-12 text-green-500"
                  aria-hidden="true"
                />
                <p className="text-lg font-semibold">You&apos;re enrolled!</p>
                <p className="text-sm text-muted-foreground">
                  The course will appear in your courses list.
                </p>
              </>
            ) : (
              <>
                <Clock
                  className="h-12 w-12 text-amber-500"
                  aria-hidden="true"
                />
                <p className="text-lg font-semibold">Request submitted</p>
                <p className="text-sm text-muted-foreground">
                  Your enrollment is pending instructor approval. You&apos;ll be
                  notified when it&apos;s approved.
                </p>
              </>
            )}
            <Button className="mt-2 w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          /* ── Confirm / invite-code form ── */
          <div className="space-y-4 pt-1">
            {/* Section details */}
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {section.instructor.firstName} {section.instructor.lastName}
                </span>
                {isInviteOnly && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Lock className="h-3 w-3" aria-hidden="true" />
                    Invite Only
                  </Badge>
                )}
              </div>
              {schedStr && <p className="text-muted-foreground">{schedStr}</p>}
              {section.location && (
                <p className="text-muted-foreground">{section.location}</p>
              )}
              <p className="text-muted-foreground">{section.termName}</p>
              {section.capacity != null && (
                <p
                  className={
                    (section.seatsAvailable ?? 0) <= 0
                      ? 'text-destructive font-medium'
                      : 'text-muted-foreground'
                  }
                >
                  {section.seatsAvailable ?? 0} of {section.capacity} seats
                  available
                </p>
              )}
            </div>

            {/* ENROLL-006: Prerequisite warning */}
            {prereqsNotMet && (
              <PrerequisiteWarning
                result={prereqResult}
                acknowledged={prereqAcknowledged}
                onAcknowledge={setPrereqAcknowledged}
              />
            )}

            {/* Invite code input */}
            {isInviteOnly && (
              <div className="space-y-1.5">
                <Label htmlFor="invite-code-input">Invite Code</Label>
                <Input
                  id="invite-code-input"
                  placeholder="e.g. AB12CD"
                  value={inviteCode}
                  onChange={(e) =>
                    setInviteCode(e.target.value.toUpperCase().slice(0, 8))
                  }
                  className="font-mono tracking-widest"
                  autoComplete="off"
                  aria-describedby={errorMsg ? 'enroll-error' : undefined}
                />
              </div>
            )}

            {/* Error */}
            {state === 'error' && (
              <p
                id="enroll-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errorMsg}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={state === 'loading'}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleEnroll}
                disabled={!canSubmit}
              >
                {state === 'loading' ? 'Enrolling…' : 'Confirm Enrollment'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
