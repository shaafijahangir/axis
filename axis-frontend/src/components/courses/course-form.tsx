'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const courseSchema = z.object({
  code: z.string().min(1, 'Course code is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  credits: z.number().min(0).max(20).optional(),
  departmentId: z.string().optional(),
});

export type CourseFormValues = z.infer<typeof courseSchema>;

interface CourseFormProps {
  onSubmit: (data: CourseFormValues) => void;
  isLoading?: boolean;
  defaultValues?: Partial<CourseFormValues>;
}

export function CourseForm({
  onSubmit,
  isLoading,
  defaultValues,
}: CourseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Course Code</Label>
          <Input
            id="code"
            placeholder="CS101"
            {...register('code')}
            disabled={isLoading}
          />
          {errors.code && (
            <p className="text-sm text-destructive">{errors.code.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="credits">Credits</Label>
          <Input
            id="credits"
            type="number"
            step="0.5"
            placeholder="3.0"
            {...register('credits')}
            disabled={isLoading}
          />
          {errors.credits && (
            <p className="text-sm text-destructive">{errors.credits.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="Introduction to Computer Science"
          {...register('title')}
          disabled={isLoading}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Course description..."
          rows={4}
          {...register('description')}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="departmentId">Department ID (optional)</Label>
        <Input
          id="departmentId"
          placeholder="dept-uuid"
          {...register('departmentId')}
          disabled={isLoading}
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Course'}
      </Button>
    </form>
  );
}
