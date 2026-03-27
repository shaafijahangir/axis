import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedPersonalizationService } from './feed-personalization.service';
import {
  FeedEngagement,
  EngagementEventType,
} from './entities/feed-engagement.entity';
import { FeedItem, FeedItemType } from './dto/feed.types';
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../../test/mocks/repository.mock';

describe('FeedPersonalizationService', () => {
  let service: FeedPersonalizationService;
  let engagementRepo: MockRepository<FeedEngagement>;

  const tenantId = 'test-tenant';
  const userId = 'student-user';

  beforeEach(async () => {
    engagementRepo = createMockRepository<FeedEngagement>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedPersonalizationService,
        {
          provide: getRepositoryToken(FeedEngagement),
          useValue: engagementRepo,
        },
      ],
    }).compile();

    service = module.get<FeedPersonalizationService>(
      FeedPersonalizationService,
    );
  });

  function makeFeedItem(overrides: Partial<FeedItem> = {}): FeedItem {
    return {
      type: FeedItemType.DEADLINE,
      id: `item-${Math.random().toString(36).slice(2)}`,
      title: 'Test Item',
      courseCode: 'CS101',
      courseTitle: 'Intro to CS',
      sectionId: 'section-1',
      timestamp: new Date(),
      ...overrides,
    };
  }

  describe('recordEngagement', () => {
    it('should save an engagement event', async () => {
      engagementRepo.create!.mockReturnValue({
        userId,
        tenantId,
        eventType: EngagementEventType.CLICK,
        feedItemType: 'deadline',
        feedItemId: 'item-1',
      } as any);
      engagementRepo.save!.mockResolvedValue({} as any);

      await service.recordEngagement(
        userId,
        tenantId,
        EngagementEventType.CLICK,
        'deadline',
        'item-1',
        'CS101',
        'section-1',
      );

      expect(engagementRepo.create).toHaveBeenCalledWith({
        userId,
        tenantId,
        eventType: EngagementEventType.CLICK,
        feedItemType: 'deadline',
        feedItemId: 'item-1',
        courseCode: 'CS101',
        sectionId: 'section-1',
        dwellTimeMs: undefined,
      });
      expect(engagementRepo.save).toHaveBeenCalled();
    });
  });

  describe('recordEngagementBatch', () => {
    it('should save multiple engagement events', async () => {
      const events = [
        {
          eventType: EngagementEventType.IMPRESSION,
          feedItemType: 'deadline',
          feedItemId: 'item-1',
        },
        {
          eventType: EngagementEventType.IMPRESSION,
          feedItemType: 'grade_posted',
          feedItemId: 'item-2',
        },
      ];

      engagementRepo.create!.mockImplementation((data: unknown) => data);
      engagementRepo.save!.mockResolvedValue([] as any);

      await service.recordEngagementBatch(userId, tenantId, events);

      expect(engagementRepo.create).toHaveBeenCalledTimes(2);
      expect(engagementRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ feedItemId: 'item-1' }),
          expect.objectContaining({ feedItemId: 'item-2' }),
        ]),
      );
    });
  });

  describe('buildUserProfile', () => {
    it('should compute click-through rates per type', async () => {
      const events: Partial<FeedEngagement>[] = [
        {
          eventType: EngagementEventType.IMPRESSION,
          feedItemType: 'deadline',
          feedItemId: 'a',
        },
        {
          eventType: EngagementEventType.IMPRESSION,
          feedItemType: 'deadline',
          feedItemId: 'b',
        },
        {
          eventType: EngagementEventType.CLICK,
          feedItemType: 'deadline',
          feedItemId: 'a',
        },
        {
          eventType: EngagementEventType.IMPRESSION,
          feedItemType: 'grade_posted',
          feedItemId: 'c',
        },
      ];

      engagementRepo.find!.mockResolvedValue(events as any);

      const profile = await service.buildUserProfile(userId);

      // 1 click / 2 impressions = 0.5 CTR for deadlines
      expect(profile.typeClickRates.get('deadline')).toBe(0.5);
      // 0 clicks / 1 impression = 0 CTR for grades
      expect(profile.typeClickRates.get('grade_posted')).toBe(0);
      expect(profile.totalClicks).toBe(1);
    });

    it('should compute click-through rates per course', async () => {
      const events: Partial<FeedEngagement>[] = [
        {
          eventType: EngagementEventType.IMPRESSION,
          feedItemType: 'deadline',
          feedItemId: 'a',
          courseCode: 'CS101',
        },
        {
          eventType: EngagementEventType.CLICK,
          feedItemType: 'deadline',
          feedItemId: 'a',
          courseCode: 'CS101',
        },
        {
          eventType: EngagementEventType.IMPRESSION,
          feedItemType: 'announcement',
          feedItemId: 'b',
          courseCode: 'MATH201',
        },
      ];

      engagementRepo.find!.mockResolvedValue(events as any);

      const profile = await service.buildUserProfile(userId);

      expect(profile.courseClickRates.get('CS101')).toBe(1.0); // 1/1
      expect(profile.courseClickRates.get('MATH201')).toBe(0); // 0/1
    });

    it('should track impressed item IDs', async () => {
      const events: Partial<FeedEngagement>[] = [
        {
          eventType: EngagementEventType.IMPRESSION,
          feedItemType: 'deadline',
          feedItemId: 'seen-item',
        },
      ];

      engagementRepo.find!.mockResolvedValue(events as any);

      const profile = await service.buildUserProfile(userId);

      expect(profile.impressedItemIds.has('seen-item')).toBe(true);
      expect(profile.impressedItemIds.has('unseen-item')).toBe(false);
    });
  });

  describe('rankFeedItems', () => {
    it('should fall back to rule-based ranking when no engagement history', () => {
      const now = Date.now();
      const items = [
        makeFeedItem({
          type: FeedItemType.ANNOUNCEMENT,
          id: 'announcement-1',
          title: 'Announcement',
          timestamp: new Date(now - 60000),
        }),
        makeFeedItem({
          type: FeedItemType.DEADLINE,
          id: 'urgent-deadline',
          title: 'Urgent Deadline',
          dueAt: new Date(now + 12 * 60 * 60 * 1000), // 12h from now
          timestamp: new Date(now + 12 * 60 * 60 * 1000),
        }),
      ];

      const emptyProfile = {
        typeClickRates: new Map<string, number>(),
        courseClickRates: new Map<string, number>(),
        impressedItemIds: new Set<string>(),
        totalClicks: 0,
      };

      const ranked = service.rankFeedItems(items, emptyProfile);

      // Urgent deadline should rank first in rule-based fallback
      expect(ranked[0].id).toBe('urgent-deadline');
    });

    it('should boost items of types the user clicks more', () => {
      const now = Date.now();
      const items = [
        makeFeedItem({
          type: FeedItemType.ANNOUNCEMENT,
          id: 'announcement-1',
          title: 'Announcement',
          timestamp: new Date(now),
        }),
        makeFeedItem({
          type: FeedItemType.GRADE_POSTED,
          id: 'grade-1',
          title: 'Grade',
          timestamp: new Date(now),
        }),
      ];

      const gradeLoversProfile = {
        typeClickRates: new Map<string, number>([
          ['grade_posted', 0.9],
          ['announcement', 0.1],
        ]),
        courseClickRates: new Map<string, number>(),
        impressedItemIds: new Set<string>(),
        totalClicks: 10,
      };

      const ranked = service.rankFeedItems(items, gradeLoversProfile);

      // Grade item should rank higher due to high type affinity
      expect(ranked[0].id).toBe('grade-1');
    });

    it('should boost items from courses the user engages with', () => {
      const now = Date.now();
      const items = [
        makeFeedItem({
          type: FeedItemType.DEADLINE,
          id: 'cs101-deadline',
          courseCode: 'CS101',
          dueAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
          timestamp: new Date(now + 5 * 24 * 60 * 60 * 1000),
        }),
        makeFeedItem({
          type: FeedItemType.DEADLINE,
          id: 'math201-deadline',
          courseCode: 'MATH201',
          dueAt: new Date(now + 5 * 24 * 60 * 60 * 1000),
          timestamp: new Date(now + 5 * 24 * 60 * 60 * 1000),
        }),
      ];

      const csLoverProfile = {
        typeClickRates: new Map<string, number>(),
        courseClickRates: new Map<string, number>([
          ['CS101', 0.9],
          ['MATH201', 0.1],
        ]),
        impressedItemIds: new Set<string>(),
        totalClicks: 10,
      };

      const ranked = service.rankFeedItems(items, csLoverProfile);

      expect(ranked[0].id).toBe('cs101-deadline');
    });

    it('should boost novel items over previously seen items', () => {
      const now = Date.now();
      const items = [
        makeFeedItem({
          type: FeedItemType.ANNOUNCEMENT,
          id: 'seen-item',
          timestamp: new Date(now),
        }),
        makeFeedItem({
          type: FeedItemType.ANNOUNCEMENT,
          id: 'new-item',
          timestamp: new Date(now),
        }),
      ];

      const profile = {
        typeClickRates: new Map<string, number>(),
        courseClickRates: new Map<string, number>(),
        impressedItemIds: new Set<string>(['seen-item']),
        totalClicks: 5,
      };

      const ranked = service.rankFeedItems(items, profile);

      // New item should rank higher than seen item
      expect(ranked[0].id).toBe('new-item');
    });

    it('should still prioritize urgent deadlines even with engagement data', () => {
      const now = Date.now();
      const items = [
        makeFeedItem({
          type: FeedItemType.ANNOUNCEMENT,
          id: 'announcement-1',
          timestamp: new Date(now),
        }),
        makeFeedItem({
          type: FeedItemType.DEADLINE,
          id: 'urgent-deadline',
          dueAt: new Date(now + 6 * 60 * 60 * 1000), // 6h from now
          timestamp: new Date(now + 6 * 60 * 60 * 1000),
        }),
      ];

      // User prefers announcements over deadlines
      const announcementLoverProfile = {
        typeClickRates: new Map<string, number>([
          ['announcement', 0.9],
          ['deadline', 0.1],
        ]),
        courseClickRates: new Map<string, number>(),
        impressedItemIds: new Set<string>(),
        totalClicks: 20,
      };

      const ranked = service.rankFeedItems(items, announcementLoverProfile);

      // Urgency weight (0.35) at max (1.0) should override type affinity (0.20) even at 0.1
      // Urgent deadline: 0.35*1.0 + 0.20*0.1 + 0.15*0.5 + 0.20*1.0 + 0.10*1.0 = 0.745
      // Announcement:    0.35*0.3 + 0.20*0.9 + 0.15*0.5 + 0.20*1.0 + 0.10*1.0 = 0.660
      expect(ranked[0].id).toBe('urgent-deadline');
    });

    it('should return empty array for empty input', () => {
      const result = service.rankFeedItems([], {
        typeClickRates: new Map(),
        courseClickRates: new Map(),
        impressedItemIds: new Set(),
        totalClicks: 0,
      });

      expect(result).toEqual([]);
    });
  });

  describe('getEngagementStats', () => {
    it('should aggregate engagement stats for a tenant', async () => {
      const statsQueryBuilder = createMockQueryBuilder<FeedEngagement>();
      const topClickedQueryBuilder = createMockQueryBuilder<FeedEngagement>();

      let callCount = 0;
      engagementRepo.createQueryBuilder!.mockImplementation(() => {
        callCount++;
        return callCount === 1
          ? (statsQueryBuilder as unknown)
          : (topClickedQueryBuilder as unknown);
      });

      statsQueryBuilder.getRawMany!.mockResolvedValue([
        { eventType: EngagementEventType.CLICK, count: '50' },
        { eventType: EngagementEventType.IMPRESSION, count: '200' },
        { eventType: EngagementEventType.DISMISS, count: '10' },
      ]);

      topClickedQueryBuilder.getRawMany!.mockResolvedValue([
        { type: 'deadline', clicks: '30' },
        { type: 'grade_posted', clicks: '15' },
        { type: 'announcement', clicks: '5' },
      ]);

      const result = await service.getEngagementStats(tenantId);

      expect(result.totalEvents).toBe(260);
      expect(result.totalClicks).toBe(50);
      expect(result.totalImpressions).toBe(200);
      expect(result.totalDismissals).toBe(10);
      expect(result.avgClickRate).toBe(0.25); // 50/200
      expect(result.topClickedTypes).toHaveLength(3);
      expect(result.topClickedTypes[0]).toEqual({
        type: 'deadline',
        clicks: 30,
      });
    });

    it('should handle zero impressions without division error', async () => {
      const statsQB = createMockQueryBuilder<FeedEngagement>();
      const topQB = createMockQueryBuilder<FeedEngagement>();

      let callCount = 0;
      engagementRepo.createQueryBuilder!.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? (statsQB as unknown) : (topQB as unknown);
      });

      statsQB.getRawMany!.mockResolvedValue([]);
      topQB.getRawMany!.mockResolvedValue([]);

      const result = await service.getEngagementStats(tenantId);

      expect(result.totalEvents).toBe(0);
      expect(result.avgClickRate).toBe(0);
      expect(result.topClickedTypes).toHaveLength(0);
    });
  });
});
