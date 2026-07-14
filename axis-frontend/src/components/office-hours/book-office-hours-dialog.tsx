'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { CalendarClock, CheckCircle2, MapPin, Video } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AVAILABLE_OFFICE_HOUR_SLOTS_QUERY } from '@/lib/graphql/queries/office-hours';
import { BOOK_OFFICE_HOUR_SLOT_MUTATION } from '@/lib/graphql/mutations/office-hours';
import {
  formatDateLong,
  formatDateShort,
  formatTime12h,
  type OfficeHourLocationType,
} from '@/lib/office-hours';

// ─── Types (GraphQL shapes) ───────────────────────────────────────────────────

interface AvailableSlot {
  blockId: string;
  instructorId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string;
  locationType: OfficeHourLocationType;
  location: string | null;
  meetingUrl: string | null;
}

interface BookedSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  block: {
    locationType: OfficeHourLocationType;
    location: string | null;
    meetingUrl: string | null;
  };
}

interface BookOfficeHoursDialogProps {
  instructorId: string;
  instructorName: string;
}

// ─── Location line (shared by confirm + success views) ───────────────────────

function LocationLine({
  locationType,
  location,
  meetingUrl,
}: {
  locationType: OfficeHourLocationType;
  location: string | null;
  meetingUrl: string | null;
}) {
  if (locationType === 'ZOOM') {
    return (
      <span className="flex items-center gap-1.5">
        <Video className="h-4 w-4 shrink-0" aria-hidden="true" />
        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate underline underline-offset-2"
          >
            Join on Zoom
          </a>
        ) : (
          'Zoom (link shared by instructor)'
        )}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
      {location ?? 'In person'}
    </span>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

/**
 * FEAT-018: Student booking flow — ≤3 interactions (shaafilook.md §4):
 * pick a day → pick a slot → confirm (with optional topic note).
 */
export function BookOfficeHoursDialog({
  instructorId,
  instructorName,
}: BookOfficeHoursDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState<BookedSlot | null>(null);

  const { data, loading, refetch } = useQuery<{
    availableOfficeHourSlots: AvailableSlot[];
  }>(AVAILABLE_OFFICE_HOUR_SLOTS_QUERY, {
    variables: { input: { instructorId } },
    skip: !open,
    fetchPolicy: 'network-only',
  });

  const slots = useMemo(
    () => data?.availableOfficeHourSlots ?? [],
    [data?.availableOfficeHourSlots],
  );
  const dates = useMemo(() => [...new Set(slots.map((s) => s.date))], [slots]);
  const activeDate = selectedDate ?? dates[0] ?? null;
  const daySlots = slots.filter((s) => s.date === activeDate);

  const [bookSlot, { loading: booking }] = useMutation<{
    bookOfficeHourSlot: BookedSlot;
  }>(BOOK_OFFICE_HOUR_SLOT_MUTATION, {
    onCompleted: (result) => {
      setConfirmed(result.bookOfficeHourSlot);
      toast.success('Office hours booked');
    },
    onError: (error) => {
      toast.error(error.message);
      // The slot may have just been taken — refresh availability.
      void refetch();
      setSelectedSlot(null);
    },
  });

  const reset = () => {
    setSelectedDate(null);
    setSelectedSlot(null);
    setNote('');
    setConfirmed(null);
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) reset();
  };

  const handleConfirm = () => {
    if (!selectedSlot) return;
    void bookSlot({
      variables: {
        input: {
          blockId: selectedSlot.blockId,
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          note: note.trim() || undefined,
        },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarClock className="mr-1 h-4 w-4" />
          Book Office Hours
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        {confirmed ? (
          // ── Success ────────────────────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2
                  className="h-5 w-5 text-green-500"
                  aria-hidden="true"
                />
                Booked
              </DialogTitle>
              <DialogDescription>
                You&apos;re meeting {instructorName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 rounded-md border p-4 text-sm">
              <p className="font-semibold">
                {formatDateLong(confirmed.date)},{' '}
                {formatTime12h(confirmed.startTime)}–
                {formatTime12h(confirmed.endTime)}
              </p>
              <LocationLine
                locationType={confirmed.block.locationType}
                location={confirmed.block.location}
                meetingUrl={confirmed.block.meetingUrl}
              />
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : selectedSlot ? (
          // ── Confirm ────────────────────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle>Confirm booking</DialogTitle>
              <DialogDescription>
                Office hours with {instructorName}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 rounded-md border p-4 text-sm">
              <p className="font-semibold">
                {formatDateLong(selectedSlot.date)},{' '}
                {formatTime12h(selectedSlot.startTime)}–
                {formatTime12h(selectedSlot.endTime)}
              </p>
              <LocationLine
                locationType={selectedSlot.locationType}
                location={selectedSlot.location}
                meetingUrl={selectedSlot.meetingUrl}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-note">
                What do you want to discuss?{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="booking-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Assignment 2, question 3"
                maxLength={500}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedSlot(null)}
                disabled={booking}
              >
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={booking}>
                {booking ? 'Booking…' : 'Confirm booking'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          // ── Pick day + slot ────────────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle>Book office hours</DialogTitle>
              <DialogDescription>
                Pick a day and time to meet {instructorName}.
              </DialogDescription>
            </DialogHeader>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : dates.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No office hours available in the next two weeks.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="booking-day">Day</Label>
                  <Select
                    value={activeDate ?? undefined}
                    onValueChange={setSelectedDate}
                  >
                    <SelectTrigger id="booking-day">
                      <SelectValue placeholder="Select a day…" />
                    </SelectTrigger>
                    <SelectContent>
                      {dates.map((date) => (
                        <SelectItem key={date} value={date}>
                          {formatDateShort(date)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Available times</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {daySlots.map((slot) => (
                      <Button
                        key={`${slot.blockId}-${slot.startTime}`}
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {formatTime12h(slot.startTime)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
