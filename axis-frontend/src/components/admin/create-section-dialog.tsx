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
import { COURSES_QUERY } from '@/lib/graphql/queries/courses';
import {
  ACADEMIC_TERMS_QUERY,
  ADMIN_USERS_LIST_QUERY,
} from '@/lib/graphql/queries/admin-academics';
import { ADMIN_CREATE_SECTION_MUTATION } from '@/lib/graphql/mutations/admin-academics';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;
type WeekDay = (typeof DAYS)[number];

const createSectionSchema = z.object({
  courseId: z.string().min(1, 'Course is required'),
  termId: z.string().min(1, 'Term is required'),
  instructorId: z.string().min(1, 'Instructor is required'),
  location: z.string().optional(),
  capacity: z.number().min(1).optional(),
  meetingDays: z.array(z.string()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
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
        onOpenChange(false);
        onSuccess();
      },
      onError: (error) => toast.error(error.message),
    },
  );

  const onSubmit = (data: CreateSectionFormValues) => {
    const { meetingDays, startTime, endTime, ...rest } = data;
    const schedule =
      meetingDays?.length && startTime && endTime
        ? JSON.stringify({ meetingDays, startTime, endTime })
        : undefined;
    createSection({ variables: { input: { ...rest, schedule } } });
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
              <Label htmlFor="section-location">Location</Label>
              <Input
                id="section-location"
                placeholder="e.g. Room 201"
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
          <div className="space-y-2">
            <Label>Meeting Days</Label>
            <div className="flex gap-3 flex-wrap">
              {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as const).map((day) => {
                const days = watch('meetingDays') ?? [];
                return (
                  <div key={day} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`day-${day}`}
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
                      htmlFor={`day-${day}`}
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
              <Label htmlFor="start-time">Start Time</Label>
              <Input id="start-time" type="time" {...register('startTime')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">End Time</Label>
              <Input id="end-time" type="time" {...register('endTime')} />
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
              {loading ? 'Creating...' : 'Create Section'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
