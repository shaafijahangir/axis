import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnnouncementsService } from './announcements.service';
import {
  Announcement,
  AnnouncementScope,
} from '../../database/entities/announcement.entity';
import { User } from '../../database/entities/user.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { TenantContext } from '../../tenant/tenant-context';
import {
  createMockRepository,
  createMockQueryBuilder,
  setupQueryBuilder,
  MockRepository,
} from '../../test/mocks/repository.mock';

/**
 * SPRINT-4 coverage: scope contract enforcement in create(), paginated
 * findAdminList(), recipientCount() per scope branch.
 */
describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let announcementRepo: MockRepository<Announcement>;
  let userRepo: MockRepository<User>;
  let enrollmentRepo: MockRepository<Enrollment>;

  const tenantId = 'tenant-001';
  const authorId = 'author-001';

  beforeEach(async () => {
    announcementRepo = createMockRepository<Announcement>();
    userRepo = createMockRepository<User>();
    enrollmentRepo = createMockRepository<Enrollment>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementsService,
        {
          provide: getRepositoryToken(Announcement),
          useValue: announcementRepo,
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Enrollment), useValue: enrollmentRepo },
        {
          provide: TenantContext,
          useValue: { getTenantId: () => tenantId },
        },
      ],
    }).compile();

    service = module.get(AnnouncementsService);
  });

  // ──────────────────────────────────────────────────────────────────────
  // create() — scope contract
  // ──────────────────────────────────────────────────────────────────────

  describe('create — scope contract', () => {
    const baseInput = { title: 'Test', body: 'Body content' };

    it('rejects SECTION scope without sectionId', async () => {
      await expect(
        service.create(authorId, {
          ...baseInput,
          scope: AnnouncementScope.SECTION,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(announcementRepo.save).not.toHaveBeenCalled();
    });

    it('rejects GRADE scope without targetGrade', async () => {
      await expect(
        service.create(authorId, {
          ...baseInput,
          scope: AnnouncementScope.GRADE,
        }),
      ).rejects.toThrow(/targetGrade is required/i);
    });

    it('clears sectionId on a SCHOOL_WIDE save', async () => {
      announcementRepo.create!.mockImplementation(
        (v: unknown) => v as Announcement,
      );
      announcementRepo.save!.mockResolvedValue({} as Announcement);

      await service.create(authorId, {
        ...baseInput,
        scope: AnnouncementScope.SCHOOL_WIDE,
        sectionId: 'leaked-section',
        targetGrade: 99,
      });

      const created = (announcementRepo.create as jest.Mock).mock
        .calls[0][0] as {
        sectionId?: string;
        targetGrade?: number;
      };
      expect(created.sectionId).toBeUndefined();
      expect(created.targetGrade).toBeUndefined();
    });

    it('clears targetGrade on a SECTION save', async () => {
      announcementRepo.create!.mockImplementation(
        (v: unknown) => v as Announcement,
      );
      announcementRepo.save!.mockResolvedValue({} as Announcement);

      await service.create(authorId, {
        ...baseInput,
        scope: AnnouncementScope.SECTION,
        sectionId: 'section-1',
        targetGrade: 11, // should be dropped
      });

      const created = (announcementRepo.create as jest.Mock).mock
        .calls[0][0] as {
        sectionId?: string;
        targetGrade?: number;
      };
      expect(created.sectionId).toBe('section-1');
      expect(created.targetGrade).toBeUndefined();
    });

    it('defaults to SECTION scope when not provided', async () => {
      announcementRepo.create!.mockImplementation(
        (v: unknown) => v as Announcement,
      );
      announcementRepo.save!.mockResolvedValue({} as Announcement);

      await expect(
        service.create(authorId, { ...baseInput, sectionId: 'section-1' }),
      ).resolves.toBeDefined();
      const created = (announcementRepo.create as jest.Mock).mock
        .calls[0][0] as {
        scope: string;
      };
      expect(created.scope).toBe(AnnouncementScope.SECTION);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // recipientCount()
  // ──────────────────────────────────────────────────────────────────────

  describe('recipientCount', () => {
    it('counts active students in tenant for SCHOOL_WIDE', async () => {
      const qb = createMockQueryBuilder<User>();
      setupQueryBuilder(userRepo, qb);
      (qb.getCount as jest.Mock).mockResolvedValue(230);

      const result = await service.recipientCount(
        tenantId,
        AnnouncementScope.SCHOOL_WIDE,
      );

      expect(result).toBe(230);
      expect(qb.where).toHaveBeenCalledWith('u.tenantId = :tenantId', {
        tenantId,
      });
    });

    it('counts students at a specific gradeLevel for GRADE scope', async () => {
      const qb = createMockQueryBuilder<User>();
      setupQueryBuilder(userRepo, qb);
      (qb.getCount as jest.Mock).mockResolvedValue(34);

      const result = await service.recipientCount(
        tenantId,
        AnnouncementScope.GRADE,
        11,
      );

      expect(result).toBe(34);
      expect(qb.andWhere).toHaveBeenCalledWith('u.gradeLevel = :grade', {
        grade: 11,
      });
    });

    it('returns 0 for GRADE scope without targetGrade', async () => {
      const result = await service.recipientCount(
        tenantId,
        AnnouncementScope.GRADE,
      );
      expect(result).toBe(0);
      expect(userRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('counts active enrollments for SECTION scope', async () => {
      const qb = createMockQueryBuilder<Enrollment>();
      setupQueryBuilder(enrollmentRepo, qb);
      (qb.getCount as jest.Mock).mockResolvedValue(28);

      const result = await service.recipientCount(
        tenantId,
        AnnouncementScope.SECTION,
        undefined,
        'section-1',
      );

      expect(result).toBe(28);
      expect(qb.where).toHaveBeenCalledWith('e.sectionId = :sectionId', {
        sectionId: 'section-1',
      });
    });

    it('returns 0 for SECTION scope without sectionId', async () => {
      const result = await service.recipientCount(
        tenantId,
        AnnouncementScope.SECTION,
      );
      expect(result).toBe(0);
      expect(enrollmentRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // findAdminList()
  // ──────────────────────────────────────────────────────────────────────

  describe('findAdminList', () => {
    it('returns paginated tenant announcements ordered pinned-first', async () => {
      const qb = createMockQueryBuilder<Announcement>();
      setupQueryBuilder(announcementRepo, qb);
      (qb.getManyAndCount as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAdminList(tenantId, undefined, 1, 20);

      expect(qb.where).toHaveBeenCalledWith(
        'announcement.tenantId = :tenantId',
        { tenantId },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('announcement.pinned', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('applies scope filter when provided', async () => {
      const qb = createMockQueryBuilder<Announcement>();
      setupQueryBuilder(announcementRepo, qb);
      (qb.getManyAndCount as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAdminList(tenantId, AnnouncementScope.GRADE);

      expect(qb.andWhere).toHaveBeenCalledWith('announcement.scope = :scope', {
        scope: AnnouncementScope.GRADE,
      });
    });
  });
});
