'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CREATE_ASSIGNMENT_MUTATION } from '@/lib/graphql/mutations/assignments';
import { SECTION_TIMELINE_QUERY } from '@/lib/graphql/queries/timeline';

/**
 * WHY: Schema mirrors the backend CreateAssignmentInput DTO.
 * pointsPossible uses coerce because HTML number inputs give strings.
 * dueAt is optional — not all assignments have hard deadlines.
 */
const createAssignmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  type: z.enum(['assignment', 'quiz', 'exam', 'discussion', 'project']),
  pointsPossible: z.coerce
    .number({ error: 'Must be a number' })
    .min(0, 'Points cannot be negative'),
  dueAt: z.string().optional(),
  unlockAt: z.string().optional(),
  lockAt: z.string().optional(),
});

type CreateAssignmentValues = z.infer<typeof createAssignmentSchema>;

const ASSIGNMENT_TYPES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'project', label: 'Project' },
] as const;

interface CreateAssignmentFormProps {
  sectionId: string;
  courseId: string;
}

export function CreateAssignmentForm({
  sectionId,
  courseId,
}: CreateAssignmentFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateAssignmentValues>({
    // WHY: Zod v4 z.coerce infers `unknown` input type, which breaks Resolver generics.
    // Type assertion is the documented workaround until @hookform/resolvers ships Zod v4 types.
    resolver: zodResolver(
      createAssignmentSchema,
    ) as Resolver<CreateAssignmentValues>,
    defaultValues: {
      type: 'assignment',
      pointsPossible: 100,
    },
  });

  const [createAssignment, { loading, error }] = useMutation<{
    createAssignment: { id: string };
  }>(CREATE_ASSIGNMENT_MUTATION, {
    refetchQueries: [
      { query: SECTION_TIMELINE_QUERY, variables: { sectionId } },
    ],
  });

  const onSubmit = async (values: CreateAssignmentValues) => {
    const result = await createAssignment({
      variables: {
        input: {
          sectionId,
          title: values.title,
          description: values.description || undefined,
          type: values.type,
          pointsPossible: values.pointsPossible,
          dueAt: values.dueAt || undefined,
          unlockAt: values.unlockAt || undefined,
          lockAt: values.lockAt || undefined,
        },
      },
    });

    if (result.data?.createAssignment?.id) {
      router.push(
        `/courses/${courseId}/section/${sectionId}/assignment/${result.data.createAssignment.id}`,
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Assignment</CardTitle>
        <CardDescription>
          Add a new assignment, quiz, or project to this section.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Midterm Exam, Chapter 3 Quiz"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Instructions for the assignment..."
              className="min-h-[100px]"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Type + Points row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              {/*
               * PATTERN: Radix Select doesn't use native ref, so we use
               * Controller from react-hook-form to bridge value/onChange.
               */}
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNMENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pointsPossible">Points</Label>
              <Input
                id="pointsPossible"
                type="number"
                min={0}
                step="any"
                {...register('pointsPossible')}
              />
              {errors.pointsPossible && (
                <p className="text-sm text-red-500">
                  {errors.pointsPossible.message}
                </p>
              )}
            </div>
          </div>

          {/* Date fields */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="dueAt">Due date</Label>
              <Input id="dueAt" type="datetime-local" {...register('dueAt')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unlockAt">Available from</Label>
              <Input
                id="unlockAt"
                type="datetime-local"
                {...register('unlockAt')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lockAt">Available until</Label>
              <Input
                id="lockAt"
                type="datetime-local"
                {...register('lockAt')}
              />
            </div>
          </div>

          {/* Error + actions */}
          {error && (
            <p className="text-sm text-red-500">
              Failed to create assignment. Please try again.
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Assignment'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
