import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseContent } from './course-content.entity';
import { CreateContentInput, UpdateContentInput } from './dto/content.types';
import { sanitizeRichText } from '../../common/sanitize';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(CourseContent)
    private contentRepo: Repository<CourseContent>,
  ) {}

  /**
   * For instructors: all content (drafts + published).
   * For students: only published content (publishedAt IS NOT NULL).
   * Tenant-scoped via the tenantId column on CourseContent.
   */
  async findBySectionId(
    sectionId: string,
    tenantId: string,
    publishedOnly = false,
  ): Promise<CourseContent[]> {
    const qb = this.contentRepo
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.author', 'author')
      .where('content.sectionId = :sectionId', { sectionId })
      .andWhere('content.tenantId = :tenantId', { tenantId });

    if (publishedOnly) {
      qb.andWhere('content.publishedAt IS NOT NULL');
    }

    return qb
      .orderBy('content.position', 'ASC')
      .addOrderBy('content.createdAt', 'DESC')
      .getMany();
  }

  async findById(id: string, tenantId: string): Promise<CourseContent> {
    const content = await this.contentRepo.findOne({
      where: { id, tenantId },
      relations: ['author'],
    });
    if (!content) throw new NotFoundException('Content not found');
    return content;
  }

  async create(
    authorId: string,
    tenantId: string,
    input: CreateContentInput,
  ): Promise<CourseContent> {
    const content = this.contentRepo.create({
      ...input,
      body: sanitizeRichText(input.body),
      authorId,
      tenantId,
      publishedAt: null,
    });
    return this.contentRepo.save(content);
  }

  async update(
    tenantId: string,
    input: UpdateContentInput,
  ): Promise<CourseContent> {
    const content = await this.contentRepo.findOne({
      where: { id: input.id, sectionId: input.sectionId, tenantId },
    });
    if (!content) {
      throw new NotFoundException('Content not found in the specified section');
    }

    if (input.title !== undefined) content.title = input.title;
    if (input.body !== undefined) content.body = sanitizeRichText(input.body);
    if (input.position !== undefined) content.position = input.position;

    return this.contentRepo.save(content);
  }

  async publish(
    id: string,
    sectionId: string,
    tenantId: string,
  ): Promise<CourseContent> {
    const content = await this.contentRepo.findOne({
      where: { id, sectionId, tenantId },
    });
    if (!content) {
      throw new NotFoundException('Content not found in the specified section');
    }

    content.publishedAt = new Date();
    return this.contentRepo.save(content);
  }

  async unpublish(
    id: string,
    sectionId: string,
    tenantId: string,
  ): Promise<CourseContent> {
    const content = await this.contentRepo.findOne({
      where: { id, sectionId, tenantId },
    });
    if (!content) {
      throw new NotFoundException('Content not found in the specified section');
    }

    content.publishedAt = null;
    return this.contentRepo.save(content);
  }

  async delete(
    id: string,
    sectionId: string,
    tenantId: string,
  ): Promise<boolean> {
    const content = await this.contentRepo.findOne({
      where: { id, sectionId, tenantId },
    });
    if (!content) {
      throw new NotFoundException('Content not found in the specified section');
    }

    await this.contentRepo.remove(content);
    return true;
  }
}
