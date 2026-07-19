'use client';

import { useQuery } from '@apollo/client/react';
import { Mail, MapPin, CalendarClock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { OFFICE_HOUR_BLOCKS_QUERY } from '@/lib/graphql/queries/office-hours';
import {
  DAY_LABELS,
  formatTime12h,
  type OfficeHourDay,
} from '@/lib/office-hours';

interface OfficeHourBlockItem {
  id: string;
  dayOfWeek: OfficeHourDay;
  startTime: string;
  endTime: string;
  locationType: 'IN_PERSON' | 'ZOOM';
  location: string | null;
  active: boolean;
}

interface ProfCardProps {
  instructorId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  /** e.g. "Associate Professor" — from the profile directory fields. */
  title?: string | null;
  /** Building + room, e.g. "ECS 618". */
  officeLocation?: string | null;
  /** Right-side action, e.g. the Book Office Hours dialog trigger. */
  action?: React.ReactNode;
}

/**
 * FEAT-021: the professor card — the UVic/SFU directory data model
 * (shaafilook.md §2: name, title, office, email — availability NEVER shown)
 * plus the one thing those directories are missing: live office hours and a
 * booking CTA.
 */
export function ProfCard({
  instructorId,
  firstName,
  lastName,
  email,
  title,
  officeLocation,
  action,
}: ProfCardProps) {
  const { data } = useQuery<{ officeHourBlocks: OfficeHourBlockItem[] }>(
    OFFICE_HOUR_BLOCKS_QUERY,
    { variables: { instructorId } },
  );
  const blocks = (data?.officeHourBlocks ?? []).filter((b) => b.active);

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <Card>
      <CardContent className="flex flex-wrap items-start gap-4 p-4">
        <div
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary"
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div>
            <p className="font-semibold leading-tight">
              {firstName} {lastName}
            </p>
            {title && <p className="text-sm text-muted-foreground">{title}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {officeLocation && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {officeLocation}
              </span>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-1 hover:text-foreground hover:underline"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {email}
              </a>
            )}
          </div>
          {blocks.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <CalendarClock
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>
                Office hours:{' '}
                {blocks
                  .map(
                    (b) =>
                      `${DAY_LABELS[b.dayOfWeek].slice(0, 3)} ${formatTime12h(b.startTime)}–${formatTime12h(b.endTime)} (${b.locationType === 'ZOOM' ? 'Zoom' : (b.location ?? 'in person')})`,
                  )
                  .join(' · ')}
              </span>
            </p>
          )}
        </div>
        {action && <div className="shrink-0 self-center">{action}</div>}
      </CardContent>
    </Card>
  );
}
