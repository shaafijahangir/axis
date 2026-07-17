'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { CalendarX, Plus, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MY_BUSY_BLOCKS_QUERY } from '@/lib/graphql/queries/office-hours';
import {
  CREATE_BUSY_BLOCK_MUTATION,
  DELETE_BUSY_BLOCK_MUTATION,
} from '@/lib/graphql/mutations/office-hours';
import {
  DAY_LABELS,
  DAY_ORDER,
  formatTime12h,
  type OfficeHourDay,
} from '@/lib/office-hours';

// ─── Types (GraphQL shapes) ───────────────────────────────────────────────────

export interface BusyBlock {
  id: string;
  dayOfWeek: OfficeHourDay;
  startTime: string; // "HH:MM:SS" from Postgres
  endTime: string;
  label: string | null;
}

// ─── Add dialog ───────────────────────────────────────────────────────────────

interface BusyFormState {
  dayOfWeek: OfficeHourDay;
  startTime: string;
  endTime: string;
  label: string;
}

const EMPTY_FORM: BusyFormState = {
  dayOfWeek: 'MON',
  startTime: '',
  endTime: '',
  label: '',
};

function BusyFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState<BusyFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof BusyFormState>(
    key: K,
    value: BusyFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const [createBusyBlock, { loading: saving }] = useMutation(
    CREATE_BUSY_BLOCK_MUTATION,
    {
      refetchQueries: [{ query: MY_BUSY_BLOCKS_QUERY }],
      onCompleted: () => {
        toast.success('Busy time added');
        onOpenChange(false);
      },
      onError: (err: Error) => setError(err.message),
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startTime || !form.endTime) {
      setError('Start and end times are required');
      return;
    }
    if (form.startTime >= form.endTime) {
      setError('Start time must be before end time');
      return;
    }
    setError(null);
    void createBusyBlock({
      variables: {
        input: {
          dayOfWeek: form.dayOfWeek,
          startTime: form.startTime,
          endTime: form.endTime,
          label: form.label.trim() || null,
        },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add busy time</DialogTitle>
          <DialogDescription>
            A recurring weekly window when you are unavailable. Office-hour
            slots inside it are hidden from students — your blocks stay
            untouched.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="busy-day">Day</Label>
            <Select
              value={form.dayOfWeek}
              onValueChange={(v) => set('dayOfWeek', v as OfficeHourDay)}
            >
              <SelectTrigger id="busy-day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_ORDER.map((day) => (
                  <SelectItem key={day} value={day}>
                    {DAY_LABELS[day]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="busy-start">Start time</Label>
              <Input
                id="busy-start"
                type="time"
                value={form.startTime}
                onChange={(e) => set('startTime', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="busy-end">End time</Label>
              <Input
                id="busy-end"
                type="time"
                value={form.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="busy-label">Label (optional)</Label>
            <Input
              id="busy-label"
              placeholder="e.g. Research, Dept meeting"
              value={form.label}
              onChange={(e) => set('label', e.target.value)}
              maxLength={128}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add busy time'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manager card ─────────────────────────────────────────────────────────────

/**
 * FEAT-019: Instructor busy-time management. Recurring unavailability
 * (research time, meetings) that suppresses bookable office-hour slots
 * without editing or pausing the blocks themselves.
 */
export function BusyBlocksManager() {
  const [formOpen, setFormOpen] = useState(false);
  // Bumped on every open so the form dialog remounts with fresh state.
  const [formKey, setFormKey] = useState(0);

  const { data, loading } = useQuery<{ myBusyBlocks: BusyBlock[] }>(
    MY_BUSY_BLOCKS_QUERY,
  );

  const [deleteBusyBlock] = useMutation(DELETE_BUSY_BLOCK_MUTATION, {
    refetchQueries: [{ query: MY_BUSY_BLOCKS_QUERY }],
    onCompleted: () => toast.success('Busy time removed'),
    onError: (err: Error) => toast.error(err.message),
  });

  const blocks = data?.myBusyBlocks ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarX
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <CardTitle>Busy Times</CardTitle>
        </div>
        <CardDescription>
          Recurring weekly unavailability — research time, meetings, anything.
          Office-hour slots inside these windows are never offered to students.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : blocks.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No busy times yet. Add one to carve protected time out of your week.
          </p>
        ) : (
          <div className="space-y-1">
            {blocks.map((block, i) => (
              <div key={block.id}>
                {i > 0 && <Separator className="my-2" />}
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">
                      {DAY_LABELS[block.dayOfWeek]},{' '}
                      {formatTime12h(block.startTime)}–
                      {formatTime12h(block.endTime)}
                    </p>
                    {block.label && (
                      <p className="text-xs text-muted-foreground">
                        {block.label}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() =>
                      void deleteBusyBlock({ variables: { id: block.id } })
                    }
                    aria-label={`Remove ${DAY_LABELS[block.dayOfWeek]} busy time`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFormKey((k) => k + 1);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add busy time
        </Button>
      </CardContent>

      <BusyFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </Card>
  );
}
