'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { SECTION_ENROLLMENTS_QUERY } from '@/lib/graphql/queries/courses';
import { ADMIN_FORCE_ENROLLMENT_STATUS_MUTATION } from '@/lib/graphql/mutations/enrollment';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';

type EnrollmentStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'DROPPED'
  | 'WITHDRAWN'
  | 'WAITLISTED'
  | 'REJECTED';

interface EnrollmentData {
  id: string;
  role: string;
  status: string;
  enrolledAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface SectionRosterProps {
  sectionId: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  pending: 'Pending',
  completed: 'Completed',
  dropped: 'Dropped',
  withdrawn: 'Withdrawn',
  waitlisted: 'Waitlisted',
  rejected: 'Rejected',
};

/** Admin-only select to force an enrollment to any status. */
function EnrollmentStatusSelect({
  enrollmentId,
  currentStatus,
  onChanged,
}: {
  enrollmentId: string;
  currentStatus: string;
  onChanged: (newStatus: string) => void;
}) {
  const [forceStatus, { loading }] = useMutation(
    ADMIN_FORCE_ENROLLMENT_STATUS_MUTATION,
    {
      onCompleted: (data) => {
        onChanged(
          (
            data as {
              adminForceEnrollmentStatus: { status: string };
            }
          ).adminForceEnrollmentStatus.status,
        );
      },
    },
  );

  return (
    <Select
      value={currentStatus.toUpperCase() as EnrollmentStatus}
      onValueChange={(val) =>
        forceStatus({
          variables: {
            enrollmentId,
            status: val as EnrollmentStatus,
          },
        })
      }
      disabled={loading}
    >
      <SelectTrigger
        className="h-7 w-32 text-xs"
        aria-label="Change enrollment status"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(
          [
            'ACTIVE',
            'PENDING',
            'COMPLETED',
            'DROPPED',
            'WITHDRAWN',
            'WAITLISTED',
            'REJECTED',
          ] as const
        ).map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {STATUS_LABELS[s.toLowerCase()]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SectionRoster({ sectionId }: SectionRosterProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.roles.includes(UserRole.ADMIN);

  const { data, loading, refetch } = useQuery<{
    sectionEnrollments: EnrollmentData[];
  }>(SECTION_ENROLLMENTS_QUERY, { variables: { sectionId } });

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const enrollments = data?.sectionEnrollments ?? [];

  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <h3 className="text-lg font-medium">No students enrolled</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Students will appear here once they enroll in this section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {enrollments.map((enrollment) => {
        const { user: rUser } = enrollment;
        const initials =
          `${rUser.firstName[0]}${rUser.lastName[0]}`.toUpperCase();

        return (
          <div
            key={enrollment.id}
            className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-accent"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {rUser.firstName} {rUser.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {rUser.email}
              </p>
            </div>
            {enrollment.role !== 'student' && (
              <Badge variant="secondary" className="text-xs capitalize">
                {enrollment.role}
              </Badge>
            )}
            {/* Admin: force-status select; others: read-only badge for non-active */}
            {isAdmin ? (
              <EnrollmentStatusSelect
                enrollmentId={enrollment.id}
                currentStatus={enrollment.status}
                onChanged={() => refetch()}
              />
            ) : (
              enrollment.status !== 'active' && (
                <Badge variant="outline" className="text-xs capitalize">
                  {enrollment.status}
                </Badge>
              )
            )}
          </div>
        );
      })}
      <p className="px-3 pt-2 text-xs text-muted-foreground">
        {enrollments.length} enrolled
      </p>
    </div>
  );
}
