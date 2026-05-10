'use client';

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
import { CREATE_ACADEMIC_TERM_MUTATION } from '@/lib/graphql/mutations/admin-academics';

const createTermSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    isCurrent: z.boolean(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

type CreateTermFormValues = z.infer<typeof createTermSchema>;

interface CreateTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTermDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateTermDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateTermFormValues>({
    resolver: zodResolver(createTermSchema),
    defaultValues: { isCurrent: false },
  });

  const [createTerm, { loading }] = useMutation(CREATE_ACADEMIC_TERM_MUTATION, {
    onCompleted: () => {
      toast.success('Term created');
      reset();
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  const onSubmit = (data: CreateTermFormValues) => {
    createTerm({ variables: { input: data } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Academic Term</DialogTitle>
          <DialogDescription>
            Add a new academic term to your institution.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="term-name">Name</Label>
            <Input
              id="term-name"
              placeholder="e.g. Fall 2026"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="term-start">Start Date</Label>
              <Input id="term-start" type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="text-xs text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="term-end">End Date</Label>
              <Input id="term-end" type="date" {...register('endDate')} />
              {errors.endDate && (
                <p className="text-xs text-destructive">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="term-current"
              type="checkbox"
              // eslint-disable-next-line react-hooks/incompatible-library
              checked={watch('isCurrent')}
              onChange={(e) => setValue('isCurrent', e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="term-current" className="text-sm font-normal">
              Set as current term
            </Label>
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
              {loading ? 'Creating...' : 'Create Term'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
