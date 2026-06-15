import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  Announcement,
  AnnouncementScope,
} from '../../database/entities/announcement.entity';
import { User, UserRole, UserStatus } from '../../database/entities';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { CreateAnnouncementInput } from './dto/announcement.types';
import { TenantContext } from '../../tenant/tenant-context';
import { clampPage, clampPageSize } from '../../common/pagination';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepo: Repository<Announcement>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    private tenantContext: TenantContext,
  ) {}

  async findBySectionId(sectionId: string): Promise<Announcement[]> {
    return this.announcementRepo.find({
      where: { sectionId },
      relations: ['author'],
      order: { pinned: 'DESC', createdAt: 'DESC' },
    });
  }

  async findBySectionIds(sectionIds: string[]): Promise<Announcement[]> {
    if (sectionIds.length === 0) return [];
    return this.announcementRepo.find({
      where: { sectionId: In(sectionIds) },
      relations: ['author', 'section', 'section.course'],
      order: { createdAt: 'DESC' },
    });
  }

  async findRecentBySectionIds(
    sectionIds: string[],
    daysBack: number = 14,
  ): Promise<Announcement[]> {
    if (sectionIds.length === 0) return [];
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    return this.announcementRepo
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .leftJoinAndSelect('announcement.section', 'section')
      .leftJoinAndSelect('section.course', 'course')
      .where('announcement.sectionId IN (:...sectionIds)', { sectionIds })
      .andWhere('announcement.createdAt >= :since', { since })
      .orderBy('announcement.createdAt', 'DESC')
      .getMany();
  }

  /** Returns all school-wide + optionally grade-filtered announcements for the tenant. */
  async findSchoolWide(
    tenantId: string,
    grade?: number,
  ): Promise<Announcement[]> {
    const qb = this.announcementRepo
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .where('announcement.tenantId = :tenantId', { tenantId })
      .andWhere(
        '(announcement.scope = :schoolWide OR (announcement.scope = :gradeScope AND announcement.targetGrade = :grade))',
        {
          schoolWide: AnnouncementScope.SCHOOL_WIDE,
          gradeScope: AnnouncementScope.GRADE,
          grade: grade ?? -1,
        },
      )
      .orderBy('announcement.pinned', 'DESC')
      .addOrderBy('announcement.createdAt', 'DESC');

    if (grade !== undefined) {
      qb.orWhere(
        '(announcement.tenantId = :tenantId AND announcement.scope = :schoolWide)',
        {
          tenantId,
          schoolWide: AnnouncementScope.SCHOOL_WIDE,
        },
      );
    }

    return qb.getMany();
  }

  /** Returns ALL announcements for a tenant (school-wide + grade + section). Admin view. */
  async findAllForTenant(tenantId: string): Promise<Announcement[]> {
    return this.announcementRepo.find({
      where: { tenantId },
      relations: ['author', 'section', 'section.course'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(
    authorId: string,
    input: CreateAnnouncementInput,
  ): Promise<Announcement> {
    const tenantId = this.tenantContext.getTenantId();
    const scope = input.scope ?? AnnouncementScope.SECTION;

    // SPRINT-4: enforce the scope contract.
    //   SECTION → sectionId required, targetGrade ignored
    //   GRADE → targetGrade required, sectionId ignored
    //   SCHOOL_WIDE → both ignored
    if (scope === AnnouncementScope.SECTION && !input.sectionId) {
      throw new BadRequestException(
        'sectionId is required for section announcements',
      );
    }
    if (scope === AnnouncementScope.GRADE && input.targetGrade == null) {
      throw new BadRequestException(
        'targetGrade is required for grade-level announcements',
      );
    }

    const announcement = this.announcementRepo.create({
      ...input,
      scope,
      tenantId,
      authorId,
      // Clear irrelevant fields so they don't leak between scope changes
      sectionId:
        scope === AnnouncementScope.SECTION ? input.sectionId : undefined,
      targetGrade:
        scope === AnnouncementScope.GRADE ? input.targetGrade : undefined,
    });
    return this.announcementRepo.save(announcement);
  }

  /**
   * SPRINT-4: Paginated tenant-wide announcement list for the admin
   * /admin/announcements page. Scope filter is optional.
   */
  async findAdminList(
    tenantId: string,
    scope?: AnnouncementScope,
    page = 1,
    pageSize = 20,
  ): Promise<{ items: Announcement[]; totalCount: number }> {
    page = clampPage(page);
    pageSize = clampPageSize(pageSize);
    const qb = this.announcementRepo
      .createQueryBuilder('announcement')
      .leftJoinAndSelect('announcement.author', 'author')
      .leftJoinAndSelect('announcement.section', 'section')
      .leftJoinAndSelect('section.course', 'course')
      .where('announcement.tenantId = :tenantId', { tenantId });
    if (scope) {
      qb.andWhere('announcement.scope = :scope', { scope });
    }
    qb.orderBy('announcement.pinned', 'DESC')
      .addOrderBy('announcement.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [items, totalCount] = await qb.getManyAndCount();
    return { items, totalCount };
  }

  /**
   * SPRINT-4: Project the audience size for a yet-to-be-sent announcement.
   * Backs the live recipient count preview in the composer.
   */
  async recipientCount(
    tenantId: string,
    scope: AnnouncementScope,
    targetGrade?: number,
    sectionId?: string,
  ): Promise<number> {
    switch (scope) {
      case AnnouncementScope.SCHOOL_WIDE:
        // All active student accounts in the tenant. PostgreSQL array
        // containment via ANY — TypeORM's `where` doesn't express this
        // cleanly so we drop to a query builder.
        return this.userRepo
          .createQueryBuilder('u')
          .where('u.tenantId = :tenantId', { tenantId })
          .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
          .andWhere(':role = ANY(u.roles)', { role: UserRole.STUDENT })
          .getCount();
      case AnnouncementScope.GRADE: {
        if (targetGrade == null) return 0;
        return this.userRepo
          .createQueryBuilder('u')
          .where('u.tenantId = :tenantId', { tenantId })
          .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
          .andWhere(':role = ANY(u.roles)', { role: UserRole.STUDENT })
          .andWhere('u.gradeLevel = :grade', { grade: targetGrade })
          .getCount();
      }
      case AnnouncementScope.SECTION: {
        if (!sectionId) return 0;
        return this.enrollmentRepo
          .createQueryBuilder('e')
          .innerJoin('e.section', 'section')
          .innerJoin('section.course', 'course')
          .where('e.sectionId = :sectionId', { sectionId })
          .andWhere('course.tenantId = :tenantId', { tenantId })
          .andWhere('e.status = :status', { status: 'active' })
          .getCount();
      }
      default:
        return 0;
    }
  }
}
