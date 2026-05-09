'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ADMIN_SECTIONS_QUERY } from '@/lib/graphql/queries/admin-academics';
import { BULK_MOVE_ENROLLMENTS_MUTATION } from '@/lib/graphql/mutations/admin-academics';

interface BulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentIds: string[];
  onSuccess: () => void;
}

export function BulkMoveDialog({
  open,
  onOpenChange,
  enrollmentIds,
  onSuccess,
}: BulkMoveDialogProps) {
  const [targetSectionId, setTargetSectionId] = useState('');

  const { data: sectionsData } = useQuery<{
    adminSections: {
      id: string;
      course: { code: string; title: string };
      instructor: { firstName: string; lastName: string };
    }[];
  }>(ADMIN_SECTIONS_QUERY, { skip: !open });

  const [bulkMove, { loading }] = useMutation<{ bulkMoveEnrollments: number }>(
    BULK_MOVE_ENROLLMENTS_MUTATION,
    {
      onCompleted: (data) => {
        const count = data.bulkMoveEnrollments;
        toast.success(
          `${count} enrollment${count !== 1 ? 's' : ''} moved successfully`,
        );
        setTargetSectionId('');
        onOpenChange(false);
        onSuccess();
      },
      onError: (err) => toast.error(err.message),
    },
  );

  const sections = sectionsData?.adminSections ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Section</DialogTitle>
          <DialogDescription>
            Drop {enrollmentIds.length} selected enrollment
            {enrollmentIds.length !== 1 ? 's' : ''} and re-enroll in a new
            section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Target Section</Label>
            <Select value={targetSectionId} onValueChange={setTargetSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.course.code} — {s.course.title} ({s.instructor.firstName}{' '}
                    {s.instructor.lastName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                bulkMove({
                  variables: {
                    input: { enrollmentIds, targetSectionId },
                  },
                })
              }
              disabled={loading || !targetSectionId}
            >
              {loading
                ? 'Moving...'
                : `Move ${enrollmentIds.length} Enrollment${enrollmentIds.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
