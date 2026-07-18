'use client';

import { useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { Clock, ClipboardList, Megaphone, CalendarClock } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { INSTRUCTOR_FEED_QUERY } from '@/lib/graphql/queries/feed';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyFeed } from './empty-feed';
import { WidgetSettings } from './widget-settings';
import { formatRelativeTime } from '@/lib/utils/relative-time';
import {
  useWidgetPreferences,
  feedTypeToInstructorWidget,
} from '@/hooks/use-widget-preferences';
import {
  useFeedEngagement,
  useFeedCardVisibility,
} from '@/hooks/use-feed-engagement';

interface InstructorFeedItemData {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  /** FEAT-020: nullable — appointment items are not course-scoped. */
  courseCode?: string | null;
  courseTitle?: string | null;
  sectionId?: string | null;
  assignmentId?: string;
  ungradedCount?: number;
  dueAt?: string;
  timestamp: string;
}

const typeConfig: Record<
  string,
  { icon: typeof Clock; borderColor: string; iconColor: string }
> = {
  ungraded: {
    icon: ClipboardList,
    borderColor: 'border-l-red-500',
    iconColor: 'text-red-500',
  },
  upcoming_deadline: {
    icon: Clock,
    borderColor: 'border-l-amber-500',
    iconColor: 'text-amber-500',
  },
  announcement: {
    icon: Megaphone,
    borderColor: 'border-l-blue-500',
    iconColor: 'text-blue-500',
  },
  appointment: {
    icon: CalendarClock,
    borderColor: 'border-l-emerald-500',
    iconColor: 'text-emerald-500',
  },
};

function InstructorFeedCard({
  item,
  onImpression,
  onClick,
}: {
  item: InstructorFeedItemData;
  onImpression: (
    type: string,
    id: string,
    courseCode: string,
    sectionId: string,
  ) => void;
  onClick: (
    type: string,
    id: string,
    courseCode: string,
    sectionId: string,
  ) => void;
}) {
  const config = typeConfig[item.type] ?? typeConfig.upcoming_deadline;
  const Icon = config.icon;

  const handleVisible = useCallback(() => {
    onImpression(
      item.type,
      item.id,
      item.courseCode ?? '',
      item.sectionId ?? '',
    );
  }, [item.type, item.id, item.courseCode, item.sectionId, onImpression]);

  const handleClick = useCallback(() => {
    onClick(item.type, item.id, item.courseCode ?? '', item.sectionId ?? '');
  }, [item.type, item.id, item.courseCode, item.sectionId, onClick]);

  const visibilityRef = useFeedCardVisibility(handleVisible);

  return (
    <div
      ref={visibilityRef}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
    >
      <Card
        className={`border-l-4 ${config.borderColor}`}
        role="article"
        aria-label={`${item.type === 'ungraded' ? 'Needs grading' : item.type === 'upcoming_deadline' ? 'Upcoming deadline' : item.type === 'appointment' ? 'Appointment' : 'Announcement'}: ${item.title}`}
      >
        <CardContent className="flex items-start gap-4 p-4">
          <div
            className={`mt-0.5 shrink-0 ${config.iconColor}`}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {item.courseCode ?? 'Office hours'}
              </Badge>
              {item.ungradedCount != null && (
                <Badge variant="destructive" className="text-xs">
                  {item.ungradedCount} to grade
                </Badge>
              )}
            </div>
            <p className="mt-1 font-medium">{item.title}</p>
            {item.subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {item.subtitle}
              </p>
            )}
            {item.dueAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Due {formatRelativeTime(item.dueAt)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function InstructorHomeFeed() {
  const { user } = useAuthStore();
  const { isWidgetEnabled } = useWidgetPreferences();
  const { trackClick, trackImpression } = useFeedEngagement();
  const { data, loading } = useQuery<{
    instructorFeed: InstructorFeedItemData[];
  }>(INSTRUCTOR_FEED_QUERY, { fetchPolicy: 'cache-and-network' });

  // Filter feed items based on widget preferences
  const filteredFeed = useMemo(() => {
    if (!data?.instructorFeed) return [];
    return data.instructorFeed.filter((item) => {
      const widgetType = feedTypeToInstructorWidget(item.type.toUpperCase());
      if (!widgetType) return true; // Show unknown types by default
      return isWidgetEnabled(widgetType);
    });
  }, [data, isWidgetEnabled]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-muted-foreground">
            {"Here's"} your teaching overview.
          </p>
        </div>
        <WidgetSettings userRole="instructor" />
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading feed">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
          <span className="sr-only">Loading your feed items...</span>
        </div>
      ) : filteredFeed.length > 0 ? (
        <section
          className="space-y-3"
          aria-label="Teaching activity feed"
          aria-busy={loading}
        >
          {filteredFeed.map((item) => (
            <InstructorFeedCard
              key={item.id}
              item={item}
              onImpression={trackImpression}
              onClick={trackClick}
            />
          ))}
        </section>
      ) : (
        <EmptyFeed />
      )}
    </div>
  );
}
