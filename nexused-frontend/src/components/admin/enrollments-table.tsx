'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Plus, Users } from 'lucide-react';
import { ADMIN_ENROLLMENTS_QUERY } from '@/lib/graphql/queries/admin-academics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { EnrollUserDialog } from './enroll-user-dialog';
import { BulkEnrollDialog } from './bulk-enroll-dialog';

interface AdminEnrollment {
  id: string;
  userId: string;
  sectionId: string;
  role: string;
  status: string;
  enrolledAt: string;
  finalGrade: string | null;
  user: { id: string; firstName: string; lastName: string; email: string };
  section: { id: string; course: { id: string; code: string; title: string } };
}

const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  completed: 'secondary',
  dropped: 'destructive',
  withdrawn: 'outline',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function EnrollmentsTable() {
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [bulkEnrollOpen, setBulkEnrollOpen] = useState(false);

  const { data, loading, refetch } = useQuery<{
    adminEnrollments: AdminEnrollment[];
  }>(ADMIN_ENROLLMENTS_QUERY, { fetchPolicy: 'cache-and-network' });

  const enrollments = data?.adminEnrollments ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkEnrollOpen(true)}>
            <Users className="mr-2 h-4 w-4" />
            Bulk Enroll
          </Button>
          <Button onClick={() => setEnrollOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Enroll User
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && enrollments.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : enrollments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No enrollments yet.
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {enrollment.user.firstName} {enrollment.user.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {enrollment.user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">
                      {enrollment.section.course.code}
                    </span>
                    <span className="ml-1 text-sm">
                      {enrollment.section.course.title}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {enrollment.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={STATUS_VARIANT[enrollment.status] ?? 'outline'}
                      className="capitalize"
                    >
                      {enrollment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(enrollment.enrolledAt)}
                  </TableCell>
                  <TableCell>{enrollment.finalGrade ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EnrollUserDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        onSuccess={() => refetch()}
      />
      <BulkEnrollDialog
        open={bulkEnrollOpen}
        onOpenChange={setBulkEnrollOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
