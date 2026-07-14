'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { CalendarClock, MapPin, Pencil, Plus, Video } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { MY_OFFICE_HOUR_BLOCKS_QUERY } from '@/lib/graphql/queries/office-hours';
import {
  CREATE_OFFICE_HOUR_BLOCK_MUTATION,
  UPDATE_OFFICE_HOUR_BLOCK_MUTATION,
} from '@/lib/graphql/mutations/office-hours';
import {
  DAY_LABELS,
  DAY_ORDER,
  formatTime12h,
  normalizeTime,
  type OfficeHourDay,
  type OfficeHourLocationType,
} from '@/lib/office-hours';

// ─── Types (GraphQL shapes) ───────────────────────────────────────────────────

interface OfficeHourBlock {
  id: string;
  instructorId: string;
  dayOfWeek: OfficeHourDay;
  startTime: string; // "HH:MM:SS" from Postgres
  endTime: string;
  slotMinutes: number;
  locationType: OfficeHourLocationType;
  location: string | null;
  meetingUrl: string | null;
  active: boolean;
}

const SLOT_LENGTHS = [10, 15, 20, 30, 45, 60] as const;

// ─── Block form (create + edit) ──────────────────────────────────────────────

interface BlockFormState {
  dayOfWeek: OfficeHourDay;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  locationType: OfficeHourLocationType;
  location: string;
  meetingUrl: string;
}

const EMPTY_FORM: BlockFormState = {
  dayOfWeek: 'MON',
  startTime: '',
  endTime: '',
  slotMinutes: 15,
  locationType: 'IN_PERSON',
  location: '',
  meetingUrl: '',
};

function blockToForm(block: OfficeHourBlock): BlockFormState {
  return {
    dayOfWeek: block.dayOfWeek,
    startTime: normalizeTime(block.startTime),
    endTime: normalizeTime(block.endTime),
    slotMinutes: block.slotMinutes,
    locationType: block.locationType,
    location: block.location ?? '',
    meetingUrl: block.meetingUrl ?? '',
  };
}

function validateForm(form: BlockFormState): string | null {
  if (!form.startTime || !form.endTime)
    return 'Start and end times are required';
  if (form.startTime >= form.endTime)
    return 'Start time must be before end time';
  if (form.locationType === 'IN_PERSON' && !form.location.trim())
    return 'In-person office hours need a location (e.g. "ECS 618")';
  if (form.locationType === 'ZOOM' && !form.meetingUrl.trim())
    return 'Zoom office hours need a meeting URL';
  return null;
}

function BlockFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Block being edited; null = create mode. */
  editing: OfficeHourBlock | null;
}) {
  // The parent remounts this dialog (via `key`) on every open, so the
  // initializer runs fresh each time — no state-syncing effect needed.
  const [form, setForm] = useState<BlockFormState>(() =>
    editing ? blockToForm(editing) : EMPTY_FORM,
  );
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof BlockFormState>(
    key: K,
    value: BlockFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const mutationOptions = {
    refetchQueries: [{ query: MY_OFFICE_HOUR_BLOCKS_QUERY }],
    onCompleted: () => {
      toast.success(editing ? 'Office hours updated' : 'Office hours added');
      onOpenChange(false);
    },
    onError: (err: Error) => setError(err.message),
  };
  const [createBlock, { loading: creating }] = useMutation(
    CREATE_OFFICE_HOUR_BLOCK_MUTATION,
    mutationOptions,
  );
  const [updateBlock, { loading: updating }] = useMutation(
    UPDATE_OFFICE_HOUR_BLOCK_MUTATION,
    mutationOptions,
  );
  const saving = creating || updating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const shared = {
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      slotMinutes: form.slotMinutes,
      locationType: form.locationType,
      location: form.locationType === 'IN_PERSON' ? form.location.trim() : null,
      meetingUrl: form.locationType === 'ZOOM' ? form.meetingUrl.trim() : null,
    };
    if (editing) {
      void updateBlock({ variables: { input: { id: editing.id, ...shared } } });
    } else {
      void createBlock({ variables: { input: shared } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit office hours' : 'Add office hours'}
          </DialogTitle>
          <DialogDescription>
            Define a weekly window; students book individual slots inside it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="oh-day">Day</Label>
            <Select
              value={form.dayOfWeek}
              onValueChange={(v) => set('dayOfWeek', v as OfficeHourDay)}
            >
              <SelectTrigger id="oh-day">
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
              <Label htmlFor="oh-start">Start time</Label>
              <Input
                id="oh-start"
                type="time"
                value={form.startTime}
                onChange={(e) => set('startTime', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="oh-end">End time</Label>
              <Input
                id="oh-end"
                type="time"
                value={form.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="oh-slot">Slot length</Label>
            <Select
              value={String(form.slotMinutes)}
              onValueChange={(v) => set('slotMinutes', Number(v))}
            >
              <SelectTrigger id="oh-slot">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SLOT_LENGTHS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="oh-location-type">Where</Label>
            <Select
              value={form.locationType}
              onValueChange={(v) =>
                set('locationType', v as OfficeHourLocationType)
              }
            >
              <SelectTrigger id="oh-location-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_PERSON">In person</SelectItem>
                <SelectItem value="ZOOM">Zoom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.locationType === 'IN_PERSON' ? (
            <div className="space-y-1.5">
              <Label htmlFor="oh-location">Location</Label>
              <Input
                id="oh-location"
                placeholder="e.g. ECS 618"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                maxLength={128}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="oh-url">Meeting URL</Label>
              <Input
                id="oh-url"
                type="url"
                placeholder="https://zoom.us/j/…"
                value={form.meetingUrl}
                onChange={(e) => set('meetingUrl', e.target.value)}
                maxLength={512}
              />
            </div>
          )}

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
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add block'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manager card ─────────────────────────────────────────────────────────────

/**
 * FEAT-018: Instructor office-hours management — define recurring weekly
 * blocks once (shaafilook.md §4 "Define Once, Reuse Always"). Lives in
 * Settings alongside the other personal preferences.
 */
export function OfficeHoursManager() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OfficeHourBlock | null>(null);
  // Bumped on every open so the form dialog remounts with fresh state.
  const [formKey, setFormKey] = useState(0);

  const { data, loading } = useQuery<{
    myOfficeHourBlocks: OfficeHourBlock[];
  }>(MY_OFFICE_HOUR_BLOCKS_QUERY);

  const [updateBlock] = useMutation(UPDATE_OFFICE_HOUR_BLOCK_MUTATION, {
    refetchQueries: [{ query: MY_OFFICE_HOUR_BLOCKS_QUERY }],
    onError: (err) => toast.error(err.message),
  });

  const blocks = data?.myOfficeHourBlocks ?? [];

  const handleToggleActive = (block: OfficeHourBlock, active: boolean) => {
    void updateBlock({
      variables: { input: { id: block.id, active } },
      onCompleted: () =>
        toast.success(active ? 'Office hours resumed' : 'Office hours paused'),
    });
  };

  const openCreate = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };
  const openEdit = (block: OfficeHourBlock) => {
    setEditing(block);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <CardTitle>Office Hours</CardTitle>
        </div>
        <CardDescription>
          Define your recurring weekly availability once. Students see it on
          your course pages and book slots in real time — no email needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : blocks.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No office hours yet. Add a weekly block to let students book time
            with you.
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
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{block.slotMinutes}-min slots</span>
                      <span aria-hidden="true">·</span>
                      {block.locationType === 'ZOOM' ? (
                        <span className="flex items-center gap-1">
                          <Video className="h-3 w-3" aria-hidden="true" />
                          Zoom
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {block.location}
                        </span>
                      )}
                      {!block.active && (
                        <Badge variant="outline" className="text-xs">
                          Paused
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={block.active}
                      onCheckedChange={(checked) =>
                        handleToggleActive(block, checked)
                      }
                      aria-label={`${DAY_LABELS[block.dayOfWeek]} office hours active`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(block)}
                      aria-label="Edit office hours block"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button variant="outline" size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add office hours
        </Button>
      </CardContent>

      <BlockFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />
    </Card>
  );
}
