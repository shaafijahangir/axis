'use client';

import { useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ADMIN_USERS_LIST_QUERY } from '@/lib/graphql/queries/admin-academics';
import { UPDATE_SECTION_MUTATION } from '@/lib/graphql/mutations/admin-academics';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;

const editSectionSchema = z.object({
  location: z.string().optional(),
  capacity: z.number().min(1).optional(),
  status: z.string(),
  instructorId: z.string().min(1, 'Instructor is required'),
  meetingDays: z.array(z.string()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

type EditSectionFormValues = z.infer<typeof editSectionSchema>;

interface AdminSection {
  id: string;
  instructorId: string;
  location: string | null;
  capacity: number | null;
  status: string;
  schedule?: string | null;
  course: { code: string; title: string };
}

interface EditSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: AdminSection | null;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function parseSchedule(raw: string | null | undefined) {
  if (!raw) return { meetingDays: [], startTime: '', endTime: '' };
  try {
    const parsed = JSON.parse(raw) as {
      meetingDays?: string[];
      startTime?: string;
      endTime?: string;
    };
    return {
      meetingDays: parsed.meetingDays ?? [],
      startTime: parsed.startTime ?? '',
      endTime: parsed.endTime ?? '',
    };
  } catch {
    return { meetingDays: [], startTime: '', endTime: '' };
  }
}

export function EditSectionDialog({
  open,
  onOpenChange,
  section,
  onSuccess,
}: EditSectionDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EditSectionFormValues>({
    resolver: zodResolver(editSectionSchema),
  });

  const { data: usersData } = useQuery<{
    adminUsers: {
      users: {
        id: string;
        firstName: string;
        lastName: string;
        roles: string[];
      }[];
    };
  }>(ADMIN_USERS_LIST_QUERY, {
    variables: { filter: { role: 'instructor', pageSize: 100 } },
  });

  useEffect(() => {
    if (section) {
      const { meetingDays, startTime, endTime } = parseSchedule(
        section.schedule,
      );
      reset({
        location: section.location ?? '',
        capacity: section.capacity ?? undefined,
        status: section.status,
        instructorId: section.instructorId,
        meetingDays,
        startTime,
        endTime,
      });
    }
  }, [section, reset]);

  const [updateSection, { loading }] = useMutation(UPDATE_SECTION_MUTATION, {
    onCompleted: () => {
      toast.success('Section updated');
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  const onSubmit = (data: EditSectionFormValues) => {
    if (!section) return;
    const { meetingDays, startTime, endTime, ...rest } = data;
    const schedule =
      meetingDays?.length && startTime && endTime
        ? JSON.stringify({ meetingDays, startTime, endTime })
        : undefined;
    updateSection({
      variables: { id: section.id, input: { ...rest, schedule } },
    });
  };

  const instructors = usersData?.adminUsers.users ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
          <DialogDescription>
            Update section for {section?.course.code} — {section?.course.title}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Instructor</Label>
            <Select
              // eslint-disable-next-line react-hooks/incompatible-library
              value={watch('instructorId') ?? ''}
              onValueChange={(val) =>
                setValue('instructorId', val, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select instructor" />
              </SelectTrigger>
              <SelectContent>
                {instructors.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.instructorId && (
              <p className="text-xs text-destructive">
                {errors.instructorId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(val) =>
                setValue('status', val, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-section-location">Location</Label>
              <Input id="edit-section-location" {...register('location')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-section-capacity">Capacity</Label>
              <Input
                id="edit-section-capacity"
                type="number"
                {...register('capacity', { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Meeting Days</Label>
            <div className="flex gap-3 flex-wrap">
              {DAYS.map((day) => {
                const days = watch('meetingDays') ?? [];
                return (
                  <div key={day} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`edit-day-${day}`}
                      checked={days.includes(day)}
                      onCheckedChange={(checked) => {
                        const current = watch('meetingDays') ?? [];
                        setValue(
                          'meetingDays',
                          checked
                            ? [...current, day]
                            : current.filter((d) => d !== day),
                        );
                      }}
                    />
                    <Label
                      htmlFor={`edit-day-${day}`}
                      className="text-xs font-normal cursor-pointer"
                    >
                      {day}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-start-time">Start Time</Label>
              <Input
                id="edit-start-time"
                type="time"
                {...register('startTime')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end-time">End Time</Label>
              <Input id="edit-end-time" type="time" {...register('endTime')} />
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
