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
import {
  ADMIN_SECTIONS_QUERY,
  ADMIN_USERS_LIST_QUERY,
} from '@/lib/graphql/queries/admin-academics';
import { BULK_ENROLL_MUTATION } from '@/lib/graphql/mutations/admin-academics';

interface BulkEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkEnrollDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkEnrollDialogProps) {
  const [sectionId, setSectionId] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [role, setRole] = useState('student');

  const { data: usersData } = useQuery<{
    adminUsers: {
      users: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      }[];
    };
  }>(ADMIN_USERS_LIST_QUERY, {
    variables: { filter: { pageSize: 200 } },
  });

  const { data: sectionsData } = useQuery<{
    adminSections: {
      id: string;
      course: { code: string; title: string };
      instructor: { firstName: string; lastName: string };
    }[];
  }>(ADMIN_SECTIONS_QUERY);

  const [bulkEnroll, { loading }] = useMutation<{
    bulkEnroll: { id: string }[];
  }>(BULK_ENROLL_MUTATION, {
    onCompleted: (data) => {
      const count = data.bulkEnroll.length;
      toast.success(`${count} user${count !== 1 ? 's' : ''} enrolled`);
      setSectionId('');
      setSelectedUserIds([]);
      setRole('student');
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionId || selectedUserIds.length === 0) {
      toast.error('Select a section and at least one user');
      return;
    }
    bulkEnroll({
      variables: {
        input: { sectionId, userIds: selectedUserIds, role },
      },
    });
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const users = usersData?.adminUsers.users ?? [];
  const sections = sectionsData?.adminSections ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Enroll</DialogTitle>
          <DialogDescription>
            Enroll multiple users in a section at once.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.course.code} — {s.course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="ta">TA</SelectItem>
                <SelectItem value="observer">Observer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Users ({selectedUserIds.length} selected)</Label>
            <div className="max-h-48 overflow-y-auto rounded-md border p-2">
              {users.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No users available
                </p>
              ) : (
                users.map((user) => (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => toggleUser(user.id)}
                      className="rounded border-input"
                    />
                    <span>
                      {user.firstName} {user.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </label>
                ))
              )}
            </div>
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
              type="submit"
              disabled={loading || !sectionId || selectedUserIds.length === 0}
            >
              {loading
                ? 'Enrolling...'
                : `Enroll ${selectedUserIds.length} User${selectedUserIds.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
