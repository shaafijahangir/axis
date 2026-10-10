'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { Check, History, UserX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MY_OFFICE_HOUR_UTILIZATION_QUERY,
  RECENT_INSTRUCTOR_BOOKINGS_QUERY,
} from '@/lib/graphql/queries/office-hours';
import { MARK_BOOKING_OUTCOME_MUTATION } from '@/lib/graphql/mutations/office-hours';
import { formatDateShort, formatTime12h } from '@/lib/office-hours';

// ─── Types (GraphQL shapes) ───────────────────────────────────────────────────

type MeetingStatus = 'BOOKED' | 'COMPLETED' | 'NO_SHOW';
type MeetingOutcome = 'COMPLETED' | 'NO_SHOW';

interface RecentMeeting {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM:SS"
  endTime: string;
  status: MeetingStatus;
  note: string | null;
  student: { id: string; firstName: string; lastName: string } | null;
}

const STATUS_LABEL: Record<MeetingStatus, string> = {
  BOOKED: 'Needs outcome',
  COMPLETED: 'Completed',
  NO_SHOW: 'No-show',
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * FEAT-022: the instructor's ended meetings from the last two weeks, with
 * one-click "Completed" / "No-show". Unmarked meetings auto-complete after a
 * few days on the server, so this is for catching no-shows, not busywork.
 * Renders nothing when there are no recent meetings.
 */
export function RecentMeetings() {
  const { data } = useQuery<{ recentInstructorBookings: RecentMeeting[] }>(
    RECENT_INSTRUCTOR_BOOKINGS_QUERY,
  );
  const [markOutcome, { loading }] = useMutation(
    MARK_BOOKING_OUTCOME_MUTATION,
    {
      refetchQueries: [
        { query: RECENT_INSTRUCTOR_BOOKINGS_QUERY },
        { query: MY_OFFICE_HOUR_UTILIZATION_QUERY },
      ],
      onError: (error) => toast.error(error.message),
    },
  );

  const meetings = data?.recentInstructorBookings ?? [];
  if (meetings.length === 0) return null;

  const mark = (meeting: RecentMeeting, outcome: MeetingOutcome) =>
    void markOutcome({
      variables: { bookingId: meeting.id, outcome },
      onCompleted: () =>
        toast.success(
          outcome === 'NO_SHOW' ? 'Marked as no-show' : 'Marked as completed',
        ),
    });

  return (
    <section className="space-y-3" aria-label="Recent meetings">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <History className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        Recent Meetings
      </h2>
      <div className="space-y-2">
        {meetings.map((meeting) => {
          const name = meeting.student
            ? `${meeting.student.firstName} ${meeting.student.lastName}`
            : 'Unknown student';
          return (
            <Card key={meeting.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateShort(meeting.date)},{' '}
                    {formatTime12h(meeting.startTime)}–
                    {formatTime12h(meeting.endTime)}
                  </p>
                  {meeting.note && (
                    <p className="truncate text-xs text-muted-foreground">
                      Topic: {meeting.note}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={
                      meeting.status === 'BOOKED' ? 'outline' : 'secondary'
                    }
                    className="text-xs"
                  >
                    {STATUS_LABEL[meeting.status]}
                  </Badge>
                  <Button
                    variant={
                      meeting.status === 'COMPLETED' ? 'secondary' : 'ghost'
                    }
                    size="sm"
                    disabled={loading || meeting.status === 'COMPLETED'}
                    onClick={() => mark(meeting, 'COMPLETED')}
                    aria-label={`Mark meeting with ${name} as completed`}
                  >
                    <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                    Completed
                  </Button>
                  <Button
                    variant={
                      meeting.status === 'NO_SHOW' ? 'secondary' : 'ghost'
                    }
                    size="sm"
                    disabled={loading || meeting.status === 'NO_SHOW'}
                    onClick={() => mark(meeting, 'NO_SHOW')}
                    aria-label={`Mark meeting with ${name} as no-show`}
                  >
                    <UserX className="mr-1 h-4 w-4" aria-hidden="true" />
                    No-show
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
