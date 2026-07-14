'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { CalendarClock, MapPin, Video, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  MY_BOOKINGS_QUERY,
  INSTRUCTOR_BOOKINGS_QUERY,
} from '@/lib/graphql/queries/office-hours';
import { CANCEL_BOOKING_MUTATION } from '@/lib/graphql/mutations/office-hours';
import {
  formatDateShort,
  formatTime12h,
  type OfficeHourLocationType,
} from '@/lib/office-hours';

// ─── Types (GraphQL shapes) ───────────────────────────────────────────────────

interface BookingPerson {
  id: string;
  firstName: string;
  lastName: string;
}

interface BookingItem {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM:SS"
  endTime: string;
  status: string;
  note: string | null;
  instructor?: BookingPerson;
  student?: BookingPerson;
  block: {
    id: string;
    locationType: OfficeHourLocationType;
    location: string | null;
    meetingUrl: string | null;
  };
}

interface UpcomingBookingsProps {
  /** Which side of the booking the viewer is on. (Named `viewer`, not `role`, to avoid the jsx-a11y aria-role lint rule.) */
  viewer: 'student' | 'instructor';
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * FEAT-018: Upcoming office-hours appointments on the /schedule page.
 * Students see who they're meeting; instructors see who's coming.
 * Renders nothing when there are no upcoming bookings.
 */
export function UpcomingBookings({ viewer }: UpcomingBookingsProps) {
  const isStudent = viewer === 'student';

  const { data: studentData } = useQuery<{ myBookings: BookingItem[] }>(
    MY_BOOKINGS_QUERY,
    { skip: !isStudent },
  );
  const { data: instructorData } = useQuery<{
    instructorBookings: BookingItem[];
  }>(INSTRUCTOR_BOOKINGS_QUERY, { skip: isStudent });

  const activeQuery = isStudent ? MY_BOOKINGS_QUERY : INSTRUCTOR_BOOKINGS_QUERY;
  const [cancelBooking] = useMutation(CANCEL_BOOKING_MUTATION, {
    refetchQueries: [{ query: activeQuery }],
    onCompleted: () => toast.success('Booking cancelled'),
    onError: (error) => toast.error(error.message),
  });

  const bookings = isStudent
    ? (studentData?.myBookings ?? [])
    : (instructorData?.instructorBookings ?? []);

  if (bookings.length === 0) return null;

  return (
    <section className="space-y-3" aria-label="Upcoming office hours">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CalendarClock
          className="h-5 w-5 text-muted-foreground"
          aria-hidden="true"
        />
        Office Hours
      </h2>
      <div className="space-y-2">
        {bookings.map((booking) => {
          const person = isStudent ? booking.instructor : booking.student;
          const personName = person
            ? `${person.firstName} ${person.lastName}`
            : 'Unknown';
          return (
            <Card key={booking.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold">
                    {isStudent ? personName : `${personName} (student)`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateShort(booking.date)},{' '}
                    {formatTime12h(booking.startTime)}–
                    {formatTime12h(booking.endTime)}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {booking.block.locationType === 'ZOOM' ? (
                      <>
                        <Video
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        {booking.block.meetingUrl ? (
                          <a
                            href={booking.block.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate underline underline-offset-2"
                          >
                            Join on Zoom
                          </a>
                        ) : (
                          'Zoom'
                        )}
                      </>
                    ) : (
                      <>
                        <MapPin
                          className="h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
                        {booking.block.location ?? 'In person'}
                      </>
                    )}
                  </p>
                  {booking.note && (
                    <p className="truncate text-xs text-muted-foreground">
                      Topic: {booking.note}
                    </p>
                  )}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Cancel booking"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {formatDateShort(booking.date)} at{' '}
                        {formatTime12h(booking.startTime)} with {personName}.
                        The slot opens up for others.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep booking</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          void cancelBooking({
                            variables: { bookingId: booking.id },
                          })
                        }
                      >
                        Cancel booking
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
