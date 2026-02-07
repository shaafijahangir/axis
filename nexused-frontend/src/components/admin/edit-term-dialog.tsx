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
import { UPDATE_ACADEMIC_TERM_MUTATION } from '@/lib/graphql/mutations/admin-academics';

const editTermSchema = z
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

type EditTermFormValues = z.infer<typeof editTermSchema>;

interface AcademicTerm {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface EditTermDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  term: AcademicTerm | null;
  onSuccess: () => void;
}

function toDateInput(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}

export function EditTermDialog({
  open,
  onOpenChange,
  term,
  onSuccess,
}: EditTermDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EditTermFormValues>({
    resolver: zodResolver(editTermSchema),
  });

  useEffect(() => {
    if (term) {
      reset({
        name: term.name,
        startDate: toDateInput(term.startDate),
        endDate: toDateInput(term.endDate),
        isCurrent: term.isCurrent,
      });
    }
  }, [term, reset]);

  const [updateTerm, { loading }] = useMutation(UPDATE_ACADEMIC_TERM_MUTATION, {
    onCompleted: () => {
      toast.success('Term updated');
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => toast.error(error.message),
  });

  const onSubmit = (data: EditTermFormValues) => {
    if (!term) return;
    updateTerm({ variables: { id: term.id, input: data } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Academic Term</DialogTitle>
          <DialogDescription>
            Update term details for {term?.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-term-name">Name</Label>
            <Input id="edit-term-name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-term-start">Start Date</Label>
              <Input
                id="edit-term-start"
                type="date"
                {...register('startDate')}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-term-end">End Date</Label>
              <Input id="edit-term-end" type="date" {...register('endDate')} />
              {errors.endDate && (
                <p className="text-xs text-destructive">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="edit-term-current"
              type="checkbox"
              checked={watch('isCurrent')}
              onChange={(e) => setValue('isCurrent', e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="edit-term-current" className="text-sm font-normal">
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
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
