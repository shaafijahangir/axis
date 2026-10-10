'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ADMIN_UPDATE_USER_MUTATION } from '@/lib/graphql/mutations/admin-users';
import type {
  AdminUsersQuery,
  UserRole,
  UserStatus,
} from '@/lib/graphql/__generated__/graphql';
import {
  USER_ROLE_LABELS,
  USER_ROLE_OPTIONS,
  USER_STATUS_LABELS,
  USER_STATUS_OPTIONS,
} from './enum-labels';
import {
  K12StudentFields,
  EMPTY_K12_FIELDS,
  type K12FieldsValue,
} from './k12-student-fields';

const editUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  roles: z
    .array(
      z.custom<UserRole>((v) => typeof v === 'string' && v in USER_ROLE_LABELS),
    )
    .min(1, 'At least one role is required'),
  status: z.custom<UserStatus>(
    (v) => typeof v === 'string' && v in USER_STATUS_LABELS,
    'Select a status',
  ),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

type AdminUser = AdminUsersQuery['adminUsers']['users'][number];

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onSuccess: () => void;
}

export function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditUserDialogProps) {
  const [k12, setK12] = useState<K12FieldsValue>(EMPTY_K12_FIELDS);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedRoles = watch('roles');
  const isStudent = selectedRoles?.includes('STUDENT') ?? false;

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        roles: user.roles,
        status: user.status,
      });
      setK12({
        gradeLevel: user.gradeLevel ?? null,
        homeroomTeacherId: user.homeroomTeacherId ?? null,
        homeroomTeacherName: user.homeroomTeacher
          ? `${user.homeroomTeacher.firstName} ${user.homeroomTeacher.lastName}`
          : null,
      });
    }
  }, [user, reset]);

  const [updateUser, { loading }] = useMutation(ADMIN_UPDATE_USER_MUTATION, {
    onCompleted: () => {
      toast.success('User updated');
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: EditUserFormValues) => {
    if (!user) return;
    updateUser({
      variables: {
        id: user.id,
        input: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          roles: data.roles,
          status: data.status,
          // SPRINT-3: send null to clear when student role removed; otherwise
          // pass through whatever the picker has (null = unset, value = set)
          gradeLevel: isStudent ? k12.gradeLevel : null,
          homeroomTeacherId: isStudent ? k12.homeroomTeacherId : null,
        },
      },
    });
  };

  const toggleRole = (role: UserRole) => {
    const current = selectedRoles || [];
    const updated = current.includes(role)
      ? current.filter((r) => r !== role)
      : [...current, role];
    setValue('roles', updated, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details for {user?.firstName} {user?.lastName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name</Label>
              <Input id="edit-firstName" {...register('firstName')} />
              {errors.firstName && (
                <p className="text-xs text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name</Label>
              <Input id="edit-lastName" {...register('lastName')} />
              {errors.lastName && (
                <p className="text-xs text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input id="edit-email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(val) =>
                setValue('status', val as UserStatus, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {USER_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="flex flex-wrap gap-2">
              {USER_ROLE_OPTIONS.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => toggleRole(role.value)}
                  className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedRoles?.includes(role.value)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background hover:bg-accent'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
            {errors.roles && (
              <p className="text-xs text-destructive">{errors.roles.message}</p>
            )}
          </div>

          {/* SPRINT-3: K-12 fields only when STUDENT role is selected. */}
          {isStudent && <K12StudentFields value={k12} onChange={setK12} />}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
