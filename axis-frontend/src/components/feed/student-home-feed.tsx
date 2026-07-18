'use client';

import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { useAuthStore } from '@/stores/auth.store';
import { STUDENT_FEED_QUERY } from '@/lib/graphql/queries/feed';
import { SCHOOL_ANNOUNCEMENTS_QUERY } from '@/lib/graphql/queries/announcements';
import { Megaphone, AlertTriangle } from 'lucide-react';
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
  /** FEAT-020: nullable — appointment items are not course-scoped. */
  courseCode?: string | null;
  courseTitle?: string | null;
  courseId?: string | null;
  sectionId?: string | null;
  assignmentId?: string;
  dueAt?: string;
  score?: number;
  pointsPossible?: number;
  timestamp: string;
}

interface SchoolAnnouncement {
  id: string;
  title: string;
  body: string;
  scope: string;
  targetGrade: number | null;
  priority: string;
  pinned: boolean;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

export function StudentHomeFeed() {
  const { user } = useAuthStore();
  const { isWidgetEnabled } = useWidgetPreferences();
  const { trackClick, trackImpression } = useFeedEngagement();
  const { data, loading } = useQuery<{ studentFeed: FeedItemData[] }>(
    STUDENT_FEED_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );

  const gradeLevel = user?.profile?.gradeLevel as number | undefined;
  const { data: schoolAnnouncementsData } = useQuery<{
    schoolAnnouncements: SchoolAnnouncement[];
  }>(SCHOOL_ANNOUNCEMENTS_QUERY, {
    variables: { grade: gradeLevel },
    fetchPolicy: 'cache-and-network',
  });

  // Filter feed items based on widget preferences
  const filteredFeed = useMemo(() => {
    if (!data?.studentFeed) return [];
    return data.studentFeed.filter((item) => {
      const widgetType = feedTypeToStudentWidget(item.type);
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
            {"Here's"} what needs your attention.
          </p>
        </div>
        <WidgetSettings userRole="student" />
      </div>

      {schoolAnnouncementsData?.schoolAnnouncements?.length ? (
        <section aria-label="School announcements" className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            School Announcements
          </h2>
          {schoolAnnouncementsData.schoolAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-lg border p-4 ${ann.priority === 'urgent' ? 'border-destructive/40 bg-destructive/5' : 'bg-muted/40'}`}
            >
              <div className="flex items-start gap-3">
                {ann.priority === 'urgent' ? (
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                ) : (
                  <Megaphone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-sm">{ann.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-3">
                    {ann.body}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ann.author.firstName} {ann.author.lastName} ·{' '}
                    {new Date(ann.createdAt).toLocaleDateString()}
                    {ann.scope === 'grade' && ann.targetGrade
                      ? ` · Grade ${ann.targetGrade}`
                      : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : null}

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
              type={
                item.type as
                  | 'deadline'
                  | 'grade_posted'
                  | 'announcement'
                  | 'course_update'
                  | 'enrollment_update'
                  | 'appointment'
              }
              title={item.title}
              subtitle={item.subtitle}
              body={item.body}
              courseCode={item.courseCode}
              courseTitle={item.courseTitle}
              courseId={item.courseId}
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
