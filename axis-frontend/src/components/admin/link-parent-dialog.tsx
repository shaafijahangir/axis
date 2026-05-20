'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ADMIN_USERS_QUERY } from '@/lib/graphql/queries/admin-users';
import { LINK_STUDENT_TO_PARENT_MUTATION } from '@/lib/graphql/mutations/parent';

interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: { id: string; firstName: string; lastName: string } | null;
  onSuccess: () => void;
}

export function LinkParentDialog({
  open,
  onOpenChange,
  student,
  onSuccess,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');

  const { data, loading } = useQuery<{
    adminUsers: { users: AdminUser[] };
  }>(ADMIN_USERS_QUERY, {
    variables: {
      filter: {
        role: 'parent',
        search: search || undefined,
        pageSize: 20,
        page: 1,
      },
    },
    skip: !open,
  });

  const [linkStudent, { loading: linking }] = useMutation(
    LINK_STUDENT_TO_PARENT_MUTATION,
    {
      onCompleted: () => {
        toast.success('Student linked to parent');
        onOpenChange(false);
        setSelectedParentId('');
        setSearch('');
        onSuccess();
      },
      onError: (err) => toast.error(err.message),
    },
  );

  const parents = data?.adminUsers.users ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !selectedParentId) return;
    linkStudent({
      variables: {
        input: { parentId: selectedParentId, studentId: student.id },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Parent to Student</DialogTitle>
        </DialogHeader>
        {student && (
          <p className="text-sm text-muted-foreground">
            Linking a parent to{' '}
            <span className="font-medium text-foreground">
              {student.firstName} {student.lastName}
            </span>
            . The parent will be able to view this student's grades, classes,
            and report cards.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Select Parent</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parent users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto rounded-md border">
            {loading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : parents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No parent accounts found.
              </p>
            ) : (
              parents.map((parent) => (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() => setSelectedParentId(parent.id)}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${
                    selectedParentId === parent.id ? 'bg-accent' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium">
                      {parent.firstName} {parent.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {parent.email}
                    </p>
                  </div>
                  {selectedParentId === parent.id && (
                    <Badge variant="default" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </button>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={linking || !selectedParentId}>
              {linking ? 'Linking…' : 'Link Parent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
