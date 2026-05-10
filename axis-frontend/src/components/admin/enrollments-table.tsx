'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { Plus, Users, FileUp, ArrowRightLeft, Trash2 } from 'lucide-react';
import { ADMIN_ENROLLMENTS_QUERY } from '@/lib/graphql/queries/admin-academics';
import { BULK_DROP_ENROLLMENTS_MUTATION } from '@/lib/graphql/mutations/admin-academics';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { CsvBulkEnrollDialog } from './csv-bulk-enroll-dialog';
import { BulkMoveDialog } from './bulk-move-dialog';

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
  const [csvEnrollOpen, setCsvEnrollOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, loading, refetch } = useQuery<{
    adminEnrollments: AdminEnrollment[];
  }>(ADMIN_ENROLLMENTS_QUERY, { fetchPolicy: 'cache-and-network' });

  const [bulkDrop, { loading: dropping }] = useMutation<{
    bulkDropEnrollments: number;
  }>(BULK_DROP_ENROLLMENTS_MUTATION, {
    onCompleted: (data) => {
      const count = data.bulkDropEnrollments;
      toast.success(`${count} enrollment${count !== 1 ? 's' : ''} dropped`);
      setSelectedIds(new Set());
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const enrollments = useMemo(
    () => data?.adminEnrollments ?? [],
    [data?.adminEnrollments],
  );

  const allSelected =
    enrollments.length > 0 && selectedIds.size === enrollments.length;
  const someSelected = selectedIds.size > 0;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(enrollments.map((e) => e.id)));
    }
  }, [allSelected, enrollments]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDrop = () => {
    if (selectedIds.size === 0) return;
    bulkDrop({
      variables: { input: { enrollmentIds: [...selectedIds] } },
    });
  };

  const handleMoveSuccess = () => {
    setSelectedIds(new Set());
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCsvEnrollOpen(true)}
          >
            <FileUp className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkEnrollOpen(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Bulk Enroll
          </Button>
          <Button size="sm" onClick={() => setEnrollOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Enroll User
          </Button>
        </div>
      </div>

      {/* Bulk action bar — visible when rows are selected */}
      {someSelected && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2 text-sm">
          <span className="font-medium">{selectedIds.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMoveOpen(true)}
            >
              <ArrowRightLeft className="mr-1.5 h-4 w-4" />
              Move to Section
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDrop}
              disabled={dropping}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {dropping ? 'Dropping...' : 'Drop Selected'}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all enrollments"
                />
              </TableHead>
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
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : enrollments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No enrollments yet.
                </TableCell>
              </TableRow>
            ) : (
              enrollments.map((enrollment) => (
                <TableRow
                  key={enrollment.id}
                  data-state={
                    selectedIds.has(enrollment.id) ? 'selected' : undefined
                  }
                  className="cursor-pointer"
                  onClick={() => toggleRow(enrollment.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(enrollment.id)}
                      onCheckedChange={() => toggleRow(enrollment.id)}
                      aria-label={`Select ${enrollment.user.firstName} ${enrollment.user.lastName}`}
                    />
                  </TableCell>
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
      <CsvBulkEnrollDialog
        open={csvEnrollOpen}
        onOpenChange={setCsvEnrollOpen}
        onSuccess={() => refetch()}
      />
      <BulkMoveDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        enrollmentIds={[...selectedIds]}
        onSuccess={handleMoveSuccess}
      />
    </div>
  );
}
