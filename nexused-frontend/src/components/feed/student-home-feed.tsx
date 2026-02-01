'use client';

import { useQuery } from '@apollo/client/react';
import { useAuthStore } from '@/stores/auth.store';
import { STUDENT_FEED_QUERY } from '@/lib/graphql/queries/feed';
import { FeedCard } from './feed-card';
import { FeedCardSkeleton } from './feed-card-skeleton';
import { EmptyFeed } from './empty-feed';

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
  const { data, loading } = useQuery<{ studentFeed: FeedItemData[] }>(
    STUDENT_FEED_QUERY,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}</h1>
        <p className="text-muted-foreground">
          Here's what needs your attention.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
      ) : data?.studentFeed && data.studentFeed.length > 0 ? (
        <div className="space-y-3">
          {data.studentFeed.map((item) => (
            <FeedCard
              key={item.id}
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
            />
          ))}
        </div>
      ) : (
        <EmptyFeed />
      )}
    </div>
  );
}
