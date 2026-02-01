import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Announcement } from '../../database/entities/announcement.entity';
import { CreateAnnouncementInput } from './dto/announcement.types';

@Injectable()
export class AnnouncementsService {
  constructor(
    @InjectRepository(Announcement)
    private announcementRepo: Repository<Announcement>,
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

  async create(
    authorId: string,
    input: CreateAnnouncementInput,
  ): Promise<Announcement> {
    const announcement = this.announcementRepo.create({
      ...input,
      authorId,
    });
    return this.announcementRepo.save(announcement);
  }
}
