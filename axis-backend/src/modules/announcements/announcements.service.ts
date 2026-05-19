import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Or, Repository } from 'typeorm';
import {
  Announcement,
  AnnouncementScope,
} from '../../database/entities/announcement.entity';
import { CreateAnnouncementInput } from './dto/announcement.types';
import { TenantContext } from '../../tenant/tenant-context';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepo: Repository<Announcement>,
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
    const announcement = this.announcementRepo.create({
      ...input,
      scope,
      tenantId,
      authorId,
    });
    return this.announcementRepo.save(announcement);
  }
}
