'use client';

import { useState } from 'react';
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
import { COURSES_QUERY } from '@/lib/graphql/queries/courses';
import {
  ACADEMIC_TERMS_QUERY,
  ADMIN_USERS_LIST_QUERY,
} from '@/lib/graphql/queries/admin-academics';
import { ADMIN_CREATE_SECTION_MUTATION } from '@/lib/graphql/mutations/admin-academics';
import {
  ScheduleFields,
  EMPTY_SCHEDULE,
  scheduleFieldsToInput,
  validateScheduleFields,
  type ScheduleFieldsValue,
} from '@/components/sections/schedule-fields';

const createSectionSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  termId: z.string().min(1, 'Term is required'),
  instructorId: z.string().min(1, 'Instructor is required'),
  location: z.string().optional(),
  capacity: z.number().min(1).optional(),
});

type CreateSectionFormValues = z.infer<typeof createSectionSchema>;

interface CreateSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSectionDialogProps) {
  const [schedule, setSchedule] = useState<ScheduleFieldsValue>(EMPTY_SCHEDULE);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateSectionFormValues>({
    resolver: zodResolver(createSectionSchema),
  });

  const { data: coursesData } = useQuery<{
    courses: { id: string; code: string; title: string }[];
  }>(COURSES_QUERY);

  const { data: termsData } = useQuery<{
    academicTerms: { id: string; name: string }[];
  }>(ACADEMIC_TERMS_QUERY);

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

  const [createSection, { loading }] = useMutation(
    ADMIN_CREATE_SECTION_MUTATION,
    {
      onCompleted: () => {
        toast.success('Section created');
        reset();
        setSchedule(EMPTY_SCHEDULE);
        setScheduleError(null);
        onOpenChange(false);
        onSuccess();
      },
      onError: (error) => toast.error(error.message),
    },
  );

  const onSubmit = (data: CreateSectionFormValues) => {
    const err = validateScheduleFields(schedule);
    if (err) {
      setScheduleError(err);
      return;
    }
    setScheduleError(null);
    createSection({
      variables: { input: { ...data, ...scheduleFieldsToInput(schedule) } },
    });
  };

  const courses = coursesData?.courses ?? [];
  const terms = termsData?.academicTerms ?? [];
  const instructors = usersData?.adminUsers.users ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Section</DialogTitle>
          <DialogDescription>Add a new course section.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Course</Label>
            <Select
              // eslint-disable-next-line react-hooks/incompatible-library
              value={watch('courseId') ?? ''}
              onValueChange={(val) =>
                setValue('courseId', val, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.courseId && (
              <p className="text-xs text-destructive">
                {errors.courseId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select
              value={watch('termId') ?? ''}
              onValueChange={(val) =>
                setValue('termId', val, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.termId && (
              <p className="text-xs text-destructive">
                {errors.termId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Instructor</Label>
            <Select
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="section-location">Building / Location</Label>
              <Input
                id="section-location"
                placeholder="e.g. Main Hall"
                {...register('location')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-capacity">Capacity</Label>
              <Input
                id="section-capacity"
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
              {loading ? 'Creating...' : 'Create Section'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
