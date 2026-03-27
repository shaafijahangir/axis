import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import {
  FeedEngagement,
  EngagementEventType,
} from './entities/feed-engagement.entity';
import { FeedItem, FeedItemType } from './dto/feed.types';

/**
 * FEAT-014: ML-based feed personalization.
 *
 * WHY: Rule-based ranking (urgency + recency) treats every student the same.
 * Students who always click grade notifications first should see grades higher.
 * Students who ignore announcements should see them lower.
 *
 * PATTERN: Lightweight scoring model — not a neural net, but a weighted
 * feature combination that adapts to user behavior. Features:
 *   1. Urgency score (deadline proximity — preserved from existing logic)
 *   2. Type affinity (how often does this user click items of this type?)
 *   3. Course affinity (how often does this user engage with this course?)
 *   4. Recency score (how fresh is this item?)
 *   5. Freshness penalty (items the user has already seen rank lower)
 *
 * TRADEOFF: Server-computed scores on every feed load vs pre-computed.
 * For <100 feed items per student, scoring in-memory after DB fetch is fast
 * enough (~1ms). Pre-computation would add complexity without measurable gain
 * at current scale.
 */

interface UserEngagementProfile {
  typeClickRates: Map<string, number>;
  courseClickRates: Map<string, number>;
  impressedItemIds: Set<string>;
  totalClicks: number;
}

// Scoring weights — tuned for educational context
const WEIGHTS = {
  urgency: 0.35,
  typeAffinity: 0.2,
  courseAffinity: 0.15,
  recency: 0.2,
  novelty: 0.1,
};

@Injectable()
export class FeedPersonalizationService {
  constructor(
    @InjectRepository(FeedEngagement)
    private engagementRepo: Repository<FeedEngagement>,
  ) {}

  /**
   * Record a feed engagement event.
   * Fire-and-forget from the frontend — no response data needed.
   */
  async recordEngagement(
    userId: string,
    tenantId: string,
    eventType: EngagementEventType,
    feedItemType: string,
    feedItemId: string,
    courseCode?: string,
    sectionId?: string,
    dwellTimeMs?: number,
  ): Promise<void> {
    const engagement = this.engagementRepo.create({
      userId,
      tenantId,
      eventType,
      feedItemType,
      feedItemId,
      courseCode,
      sectionId,
      dwellTimeMs,
    });
    await this.engagementRepo.save(engagement);
  }

  /**
   * Batch record multiple engagement events at once.
   * WHY: Frontend batches impressions to reduce network calls.
   */
  async recordEngagementBatch(
    userId: string,
    tenantId: string,
    events: Array<{
      eventType: EngagementEventType;
      feedItemType: string;
      feedItemId: string;
      courseCode?: string;
      sectionId?: string;
      dwellTimeMs?: number;
    }>,
  ): Promise<void> {
    const engagements = events.map((event) =>
      this.engagementRepo.create({
        userId,
        tenantId,
        ...event,
      }),
    );
    await this.engagementRepo.save(engagements);
  }

  /**
   * Build user engagement profile from the last 30 days of events.
   * Returns click rates per feed item type and per course.
   */
  async buildUserProfile(userId: string): Promise<UserEngagementProfile> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = await this.engagementRepo.find({
      where: {
        userId,
        createdAt: MoreThan(thirtyDaysAgo),
      },
      order: { createdAt: 'DESC' },
    });

    const typeImpressions = new Map<string, number>();
    const typeClicks = new Map<string, number>();
    const courseImpressions = new Map<string, number>();
    const courseClicks = new Map<string, number>();
    const impressedItemIds = new Set<string>();
    let totalClicks = 0;

    for (const event of events) {
      if (event.eventType === EngagementEventType.IMPRESSION) {
        typeImpressions.set(
          event.feedItemType,
          (typeImpressions.get(event.feedItemType) ?? 0) + 1,
        );
        if (event.courseCode) {
          courseImpressions.set(
            event.courseCode,
            (courseImpressions.get(event.courseCode) ?? 0) + 1,
          );
        }
        impressedItemIds.add(event.feedItemId);
      } else if (event.eventType === EngagementEventType.CLICK) {
        typeClicks.set(
          event.feedItemType,
          (typeClicks.get(event.feedItemType) ?? 0) + 1,
        );
        if (event.courseCode) {
          courseClicks.set(
            event.courseCode,
            (courseClicks.get(event.courseCode) ?? 0) + 1,
          );
        }
        totalClicks++;
      }
    }

    // Compute click-through rates (clicks / impressions)
    const typeClickRates = new Map<string, number>();
    for (const [type, impressions] of typeImpressions) {
      const clicks = typeClicks.get(type) ?? 0;
      typeClickRates.set(type, impressions > 0 ? clicks / impressions : 0);
    }

    const courseClickRates = new Map<string, number>();
    for (const [course, impressions] of courseImpressions) {
      const clicks = courseClicks.get(course) ?? 0;
      courseClickRates.set(course, impressions > 0 ? clicks / impressions : 0);
    }

    return { typeClickRates, courseClickRates, impressedItemIds, totalClicks };
  }

  /**
   * Score and re-rank feed items using the personalization model.
   *
   * WHY: Called after the base feed query returns items. We don't change
   * which items appear — we change their order to match user preferences.
   *
   * The scoring model is deliberately simple and interpretable:
   * - urgency: deadline proximity (0-1, higher = more urgent)
   * - typeAffinity: user's historical click rate for this item type (0-1)
   * - courseAffinity: user's historical click rate for this course (0-1)
   * - recency: how fresh the item is (0-1, exponential decay)
   * - novelty: has the user seen this item before? (0 or 1)
   *
   * Final score = weighted sum of features, sorted descending.
   */
  rankFeedItems(items: FeedItem[], profile: UserEngagementProfile): FeedItem[] {
    if (items.length === 0) return items;

    // If user has no engagement history, fall back to rule-based ranking
    if (profile.totalClicks === 0) {
      return this.ruleBasedRanking(items);
    }

    const now = Date.now();
    const scoredItems = items.map((item) => ({
      item,
      score: this.scoreItem(item, profile, now),
    }));

    scoredItems.sort((a, b) => b.score - a.score);
    return scoredItems.map((s) => s.item);
  }

  private scoreItem(
    item: FeedItem,
    profile: UserEngagementProfile,
    now: number,
  ): number {
    const urgency = this.computeUrgency(item, now);
    const typeAffinity = profile.typeClickRates.get(item.type) ?? 0.5;
    const courseAffinity = profile.courseClickRates.get(item.courseCode) ?? 0.5;
    const recency = this.computeRecency(item, now);
    const novelty = profile.impressedItemIds.has(item.id) ? 0.3 : 1.0;

    return (
      WEIGHTS.urgency * urgency +
      WEIGHTS.typeAffinity * typeAffinity +
      WEIGHTS.courseAffinity * courseAffinity +
      WEIGHTS.recency * recency +
      WEIGHTS.novelty * novelty
    );
  }

  /**
   * Urgency score: deadlines within 24h = 1.0, 48h = 0.8, 7d = 0.5.
   * Non-deadline items get a base urgency of 0.3.
   */
  private computeUrgency(item: FeedItem, now: number): number {
    if (item.type !== FeedItemType.DEADLINE || !item.dueAt) {
      return 0.3;
    }

    const hoursUntilDue = (item.dueAt.getTime() - now) / (1000 * 60 * 60);

    if (hoursUntilDue <= 0) return 0.1; // Past due — low but present
    if (hoursUntilDue <= 24) return 1.0;
    if (hoursUntilDue <= 48) return 0.8;
    if (hoursUntilDue <= 168) return 0.5; // 7 days
    return 0.3;
  }

  /**
   * Recency score: exponential decay with 7-day half-life.
   * Items from now = 1.0, 7 days ago = 0.5, 14 days ago = 0.25.
   */
  private computeRecency(item: FeedItem, now: number): number {
    const ageMs = now - item.timestamp.getTime();
    const halfLifeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    return Math.pow(0.5, ageMs / halfLifeMs);
  }

  /**
   * Rule-based fallback ranking (identical to existing FeedService logic).
   * Used when user has no engagement history.
   */
  private ruleBasedRanking(items: FeedItem[]): FeedItem[] {
    const now = Date.now();
    const sorted = [...items];

    sorted.sort((a, b) => {
      const aUrgent =
        a.type === FeedItemType.DEADLINE &&
        a.dueAt &&
        a.dueAt.getTime() - now < 48 * 60 * 60 * 1000;
      const bUrgent =
        b.type === FeedItemType.DEADLINE &&
        b.dueAt &&
        b.dueAt.getTime() - now < 48 * 60 * 60 * 1000;

      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;

      if (
        a.type === FeedItemType.DEADLINE &&
        b.type === FeedItemType.DEADLINE
      ) {
        return a.timestamp.getTime() - b.timestamp.getTime();
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return sorted;
  }

  /**
   * Get engagement stats for admin analytics.
   * Returns aggregate metrics over the last 30 days for a tenant.
   */
  async getEngagementStats(tenantId: string): Promise<{
    totalEvents: number;
    totalClicks: number;
    totalImpressions: number;
    totalDismissals: number;
    avgClickRate: number;
    topClickedTypes: Array<{ type: string; clicks: number }>;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats = await this.engagementRepo
      .createQueryBuilder('e')
      .select('e.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.createdAt >= :since', { since: thirtyDaysAgo })
      .groupBy('e.eventType')
      .getRawMany<{ eventType: string; count: string }>();

    let totalClicks = 0;
    let totalImpressions = 0;
    let totalDismissals = 0;

    for (const stat of stats) {
      const count = Number(stat.count);
      const eventType = stat.eventType as EngagementEventType;
      if (eventType === EngagementEventType.CLICK) totalClicks = count;
      if (eventType === EngagementEventType.IMPRESSION)
        totalImpressions = count;
      if (eventType === EngagementEventType.DISMISS) totalDismissals = count;
    }

    const topClickedTypes = await this.engagementRepo
      .createQueryBuilder('e')
      .select('e.feedItemType', 'type')
      .addSelect('COUNT(*)', 'clicks')
      .where('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.createdAt >= :since', { since: thirtyDaysAgo })
      .andWhere('e.eventType = :eventType', {
        eventType: EngagementEventType.CLICK,
      })
      .groupBy('e.feedItemType')
      .orderBy('clicks', 'DESC')
      .limit(5)
      .getRawMany<{ type: string; clicks: string }>();

    return {
      totalEvents: totalClicks + totalImpressions + totalDismissals,
      totalClicks,
      totalImpressions,
      totalDismissals,
      avgClickRate: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      topClickedTypes: topClickedTypes.map((t) => ({
        type: t.type,
        clicks: Number(t.clicks),
      })),
    };
  }
}
