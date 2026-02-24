'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useAuthStore } from '@/stores/auth.store';
import { STUDENT_FEED_QUERY } from '@/lib/graphql/queries/feed';
import { FeedCard } from './feed-card';
import { FeedCardSkeleton } from './feed-card-skeleton';
import { EmptyFeed } from './empty-feed';
import { WidgetSettings } from './widget-settings';
import {
  useWidgetPreferences,
  feedTypeToStudentWidget,
} from '@/hooks/use-widget-preferences';
import { useFeedEngagement } from '@/hooks/use-feed-engagement';

interface FeedItemData {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  body?: string;
  courseCode: string;
  courseTitle: string;
  sectionId: string;
  assignmentId?: string;
  dueAt?: string;
  score?: number;
  pointsPossible?: number;
  timestamp: string;
}

export function StudentHomeFeed() {
  const { user } = useAuthStore();
  const { isWidgetEnabled } = useWidgetPreferences();
  const { trackClick, trackImpression } = useFeedEngagement();
  const { data, loading } = useQuery<{ studentFeed: FeedItemData[] }>(
    STUDENT_FEED_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );

  // Filter feed items based on widget preferences
  const filteredFeed = useMemo(() => {
    if (!data?.studentFeed) return [];
    return data.studentFeed.filter((item) => {
      const widgetType = feedTypeToStudentWidget(item.type);
      if (!widgetType) return true; // Show unknown types by default
      return isWidgetEnabled(widgetType);
    });
  }, [data?.studentFeed, isWidgetEnabled]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.firstName}
          </h1>
          <p className="text-muted-foreground">
            Here's what needs your attention.
          </p>
        </div>
        <WidgetSettings userRole="student" />
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading feed">
          {[1, 2, 3, 4].map((i) => (
            <FeedCardSkeleton key={i} />
          ))}
          <span className="sr-only">Loading your feed items...</span>
        </div>
      ) : filteredFeed.length > 0 ? (
        <section
          className="space-y-3"
          aria-label="Your activity feed"
          aria-busy={loading}
        >
          {filteredFeed.map((item) => (
            <FeedCard
              key={item.id}
              id={item.id}
              type={item.type as any}
              title={item.title}
              subtitle={item.subtitle}
              body={item.body}
              courseCode={item.courseCode}
              courseTitle={item.courseTitle}
              sectionId={item.sectionId}
              assignmentId={item.assignmentId}
              dueAt={item.dueAt}
              score={item.score}
              pointsPossible={item.pointsPossible}
              timestamp={item.timestamp}
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
