'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  RECORD_FEED_ENGAGEMENT_MUTATION,
  RECORD_FEED_ENGAGEMENT_BATCH_MUTATION,
} from '@/lib/graphql/mutations/feed-engagement';

/**
 * FEAT-014: Feed engagement tracking hook.
 *
 * WHY: The personalization model needs engagement signals (clicks,
 * impressions, dismissals) to learn user preferences. This hook
 * provides the tracking functions and handles batching of impressions
 * to reduce network overhead.
 *
 * PATTERN: Impressions are batched and flushed every 5 seconds or
 * on unmount. Clicks are sent immediately (latency doesn't matter
 * since the user is navigating away).
 */

interface EngagementEvent {
  eventType: 'click' | 'impression' | 'dismiss';
  feedItemType: string;
  feedItemId: string;
  courseCode?: string;
  sectionId?: string;
  dwellTimeMs?: number;
}

const BATCH_FLUSH_INTERVAL_MS = 5000;

export function useFeedEngagement() {
  const impressionBatchRef = useRef<EngagementEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [recordSingle] = useMutation(RECORD_FEED_ENGAGEMENT_MUTATION);
  const [recordBatch] = useMutation(RECORD_FEED_ENGAGEMENT_BATCH_MUTATION);

  const flushImpressions = useCallback(() => {
    const batch = impressionBatchRef.current;
    if (batch.length === 0) return;

    impressionBatchRef.current = [];

    recordBatch({
      variables: {
        input: {
          events: batch.map((e) => ({
            eventType: e.eventType.toUpperCase(),
            feedItemType: e.feedItemType,
            feedItemId: e.feedItemId,
            courseCode: e.courseCode,
            sectionId: e.sectionId,
            dwellTimeMs: e.dwellTimeMs,
          })),
        },
      },
    }).catch(() => {
      // Fire-and-forget — engagement tracking should never block the UI
    });
  }, [recordBatch]);

  // Flush impressions periodically
  useEffect(() => {
    flushTimerRef.current = setInterval(
      flushImpressions,
      BATCH_FLUSH_INTERVAL_MS,
    );
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      // Flush remaining on unmount
      flushImpressions();
    };
  }, [flushImpressions]);

  /**
   * Track a feed item click. Sent immediately.
   */
  const trackClick = useCallback(
    (
      feedItemType: string,
      feedItemId: string,
      courseCode?: string,
      sectionId?: string,
    ) => {
      recordSingle({
        variables: {
          input: {
            eventType: 'CLICK',
            feedItemType,
            feedItemId,
            courseCode,
            sectionId,
          },
        },
      }).catch(() => {
        // Fire-and-forget
      });
    },
    [recordSingle],
  );

  /**
   * Track a feed item impression. Batched and sent periodically.
   */
  const trackImpression = useCallback(
    (
      feedItemType: string,
      feedItemId: string,
      courseCode?: string,
      sectionId?: string,
    ) => {
      // Deduplicate within the same batch
      const exists = impressionBatchRef.current.some(
        (e) => e.feedItemId === feedItemId && e.eventType === 'impression',
      );
      if (exists) return;

      impressionBatchRef.current.push({
        eventType: 'impression',
        feedItemType,
        feedItemId,
        courseCode,
        sectionId,
      });
    },
    [],
  );

  /**
   * Track a feed item dismiss. Sent immediately.
   */
  const trackDismiss = useCallback(
    (
      feedItemType: string,
      feedItemId: string,
      courseCode?: string,
      sectionId?: string,
    ) => {
      recordSingle({
        variables: {
          input: {
            eventType: 'DISMISS',
            feedItemType,
            feedItemId,
            courseCode,
            sectionId,
          },
        },
      }).catch(() => {
        // Fire-and-forget
      });
    },
    [recordSingle],
  );

  return { trackClick, trackImpression, trackDismiss };
}

/**
 * Hook to track when a feed card becomes visible using IntersectionObserver.
 * Returns a ref to attach to the feed card element.
 */
export function useFeedCardVisibility(
  onVisible: () => void,
  options?: { threshold?: number },
) {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasTrackedRef.current) {
            hasTrackedRef.current = true;
            onVisible();
          }
        }
      },
      { threshold: options?.threshold ?? 0.5 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [onVisible, options?.threshold]);

  return elementRef;
}
