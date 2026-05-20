'use client';

import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ADMIN_USERS_LIST_QUERY } from '@/lib/graphql/queries/admin-academics';
import { UPDATE_SECTION_MUTATION } from '@/lib/graphql/mutations/admin-academics';
import {
  ScheduleFields,
  EMPTY_SCHEDULE,
  scheduleFieldsToInput,
  validateScheduleFields,
  type ScheduleFieldsValue,
} from '@/components/sections/schedule-fields';

const editSectionSchema = z.object({
  location: z.string().optional(),
  capacity: z.number().min(1).optional(),
  status: z.string(),
  instructorId: z.string().min(1, 'Instructor is required'),
});

type EditSectionFormValues = z.infer<typeof editSectionSchema>;

interface AdminSection {
  id: string;
  instructorId: string;
  location: string | null;
  capacity: number | null;
  status: string;
  schedule?: string | null;
  meetingDays?: string[] | null;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
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

/**
 * SPRINT-1: Migrate a section's schedule into ScheduleFieldsValue.
 * Prefer the new typed columns; fall back to the legacy `schedule` JSONB
 * blob so sections created before Sprint 1 still edit correctly.
 */
function sectionToSchedule(section: AdminSection): ScheduleFieldsValue {
  if (
    section.meetingDays?.length ||
    section.startTime ||
    section.endTime ||
    section.room
  ) {
    return {
      meetingDays: section.meetingDays ?? [],
      startTime: section.startTime ?? '',
      endTime: section.endTime ?? '',
      room: section.room ?? '',
    };
  }
  // Legacy fallback
  if (!section.schedule) return EMPTY_SCHEDULE;
  try {
    const parsed = JSON.parse(section.schedule) as {
      meetingDays?: string[];
      startTime?: string;
      endTime?: string;
    };
    return {
      meetingDays: parsed.meetingDays ?? [],
      startTime: parsed.startTime ?? '',
      endTime: parsed.endTime ?? '',
      room: '',
    };
  } catch {
    return EMPTY_SCHEDULE;
  }
}

export function EditSectionDialog({
  open,
  onOpenChange,
  section,
  onSuccess,
}: EditSectionDialogProps) {
  const [schedule, setSchedule] = useState<ScheduleFieldsValue>(EMPTY_SCHEDULE);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const {
    handleSubmit,
    reset,
    register,
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
      reset({
        location: section.location ?? '',
        capacity: section.capacity ?? undefined,
        status: section.status,
        instructorId: section.instructorId,
      });
      setSchedule(sectionToSchedule(section));
      setScheduleError(null);
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
    const err = validateScheduleFields(schedule);
    if (err) {
      setScheduleError(err);
      return;
    }
    setScheduleError(null);
    updateSection({
      variables: {
        id: section.id,
        input: { ...data, ...scheduleFieldsToInput(schedule) },
      },
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
              <Label htmlFor="edit-section-location">Building / Location</Label>
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

          <ScheduleFields
            value={schedule}
            onChange={setSchedule}
            error={scheduleError}
          />

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
