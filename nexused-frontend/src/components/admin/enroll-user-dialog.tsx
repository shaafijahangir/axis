'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { ADMIN_ENROLL_MUTATION } from '@/lib/graphql/mutations/admin-academics';

const enrollSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  sectionId: z.string().min(1, 'Section is required'),
  role: z.string().optional(),
});

type EnrollFormValues = z.infer<typeof enrollSchema>;

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'ta', label: 'TA' },
  { value: 'observer', label: 'Observer' },
];

interface EnrollUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EnrollUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: EnrollUserDialogProps) {
  const {
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EnrollFormValues>({
    resolver: zodResolver(enrollSchema),
    defaultValues: { role: 'student' },
  });

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

  const [enroll, { loading }] = useMutation(ADMIN_ENROLL_MUTATION, {
    onCompleted: () => {
      toast.success('User enrolled');
      reset();
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  const onSubmit = (data: EnrollFormValues) => {
    enroll({ variables: { input: data } });
  };

  const users = usersData?.adminUsers.users ?? [];
  const sections = sectionsData?.adminSections ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll User</DialogTitle>
          <DialogDescription>
            Enroll a user in a course section.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>User</Label>
            <Select
              value={watch('userId') ?? ''}
              onValueChange={(val) =>
                setValue('userId', val, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.userId && (
              <p className="text-xs text-destructive">
                {errors.userId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select
              value={watch('sectionId') ?? ''}
              onValueChange={(val) =>
                setValue('sectionId', val, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
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
            {errors.sectionId && (
              <p className="text-xs text-destructive">
                {errors.sectionId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={watch('role') ?? 'student'}
              onValueChange={(val) => setValue('role', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Enrolling...' : 'Enroll'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
