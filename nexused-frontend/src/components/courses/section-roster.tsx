'use client';

import { useQuery } from '@apollo/client/react';
import { SECTION_ENROLLMENTS_QUERY } from '@/lib/graphql/queries/courses';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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

export function SectionRoster({ sectionId }: SectionRosterProps) {
  const { data, loading } = useQuery<{
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
        const { user } = enrollment;
        const initials =
          `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

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
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            {enrollment.role !== 'student' && (
              <Badge variant="secondary" className="text-xs capitalize">
                {enrollment.role}
              </Badge>
            )}
            {enrollment.status !== 'active' && (
              <Badge variant="outline" className="text-xs capitalize">
                {enrollment.status}
              </Badge>
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
