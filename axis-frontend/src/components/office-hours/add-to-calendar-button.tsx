'use client';

import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { toast } from 'sonner';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BOOKING_CALENDAR_INVITE_QUERY } from '@/lib/graphql/queries/office-hours';
import { downloadIcs, icsFilename } from '@/lib/office-hours';

interface AddToCalendarButtonProps {
  bookingId: string;
  /** Booking date "YYYY-MM-DD" — used for the download filename. */
  date: string;
  /** Icon-only (compact list rows) or labelled (confirmation view). */
  compact?: boolean;
}

/**
 * FEAT-024: Fetch a booking's .ics from GraphQL and download it.
 * WHY fetch on click (not with the list): the invite is only needed when the
 * user asks for it, and `network-only` guarantees a cancelled booking exports
 * its current STATUS rather than a cached copy.
 */
export function AddToCalendarButton({
  bookingId,
  date,
  compact = false,
}: AddToCalendarButtonProps) {
  const client = useApolloClient();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data } = await client.query<{ bookingCalendarInvite: string }>({
        query: BOOKING_CALENDAR_INVITE_QUERY,
        variables: { bookingId },
        fetchPolicy: 'network-only',
      });
      if (!data?.bookingCalendarInvite) {
        throw new Error('Calendar invite unavailable');
      }
      downloadIcs(data.bookingCalendarInvite, icsFilename(date));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not create calendar invite';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void handleClick()}
        disabled={loading}
        aria-label="Add to calendar"
        title="Add to calendar"
      >
        <CalendarPlus className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => void handleClick()}
      disabled={loading}
    >
      <CalendarPlus className="mr-1 h-4 w-4" aria-hidden="true" />
      {loading ? 'Preparing…' : 'Add to calendar'}
    </Button>
  );
}
