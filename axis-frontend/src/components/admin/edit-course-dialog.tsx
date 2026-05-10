'use client';

import { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { UPDATE_COURSE_MUTATION } from '@/lib/graphql/mutations/admin-academics';

const editCourseSchema = z.object({
  code: z.string().min(1, 'Course code is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  credits: z.number().min(0).max(20).optional(),
});

type EditCourseFormValues = z.infer<typeof editCourseSchema>;

interface Course {
  id: string;
  code: string;
  title: string;
  description: string | null;
  credits: number | null;
}

interface EditCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  onSuccess: () => void;
}

export function EditCourseDialog({
  open,
  onOpenChange,
  course,
  onSuccess,
}: EditCourseDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditCourseFormValues>({
    resolver: zodResolver(editCourseSchema),
  });

  useEffect(() => {
    if (course) {
      reset({
        code: course.code,
        title: course.title,
        description: course.description ?? '',
        credits: course.credits ?? undefined,
      });
    }
  }, [course, reset]);

  const [updateCourse, { loading }] = useMutation(UPDATE_COURSE_MUTATION, {
    onCompleted: () => {
      toast.success('Course updated');
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  const onSubmit = (data: EditCourseFormValues) => {
    if (!course) return;
    updateCourse({ variables: { id: course.id, input: data } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update course details for {course?.code}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-course-code">Code</Label>
              <Input id="edit-course-code" {...register('code')} />
              {errors.code && (
                <p className="text-xs text-destructive">
                  {errors.code.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-course-credits">Credits</Label>
              <Input
                id="edit-course-credits"
                type="number"
                step="0.5"
                {...register('credits', { valueAsNumber: true })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-course-title">Title</Label>
            <Input id="edit-course-title" {...register('title')} />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-course-desc">Description</Label>
            <Textarea id="edit-course-desc" {...register('description')} />
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
