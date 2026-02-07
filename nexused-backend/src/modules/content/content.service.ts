import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { CourseContent } from './course-content.entity';
import { CreateContentInput, UpdateContentInput } from './dto/content.types';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(CourseContent)
    private contentRepo: Repository<CourseContent>,
  ) {}

  /**
   * For instructors: all content (drafts + published).
   * For students: only published content (publishedAt IS NOT NULL).
   */
  async findBySectionId(
    sectionId: string,
    publishedOnly = false,
  ): Promise<CourseContent[]> {
    const where: Record<string, unknown> = { sectionId };
    if (publishedOnly) {
      where.publishedAt = Not(IsNull());
    }

    return this.contentRepo.find({
      where,
      relations: ['author'],
      order: { position: 'ASC', createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<CourseContent> {
    const content = await this.contentRepo.findOne({
      where: { id },
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
      authorId,
      tenantId,
      publishedAt: null,
    });
    return this.contentRepo.save(content);
  }

  async update(input: UpdateContentInput): Promise<CourseContent> {
    const content = await this.contentRepo.findOne({
      where: { id: input.id, sectionId: input.sectionId },
    });
    if (!content) {
      throw new NotFoundException('Content not found in the specified section');
    }

    if (input.title !== undefined) content.title = input.title;
    if (input.body !== undefined) content.body = input.body;
    if (input.position !== undefined) content.position = input.position;

    return this.contentRepo.save(content);
  }

  async publish(id: string, sectionId: string): Promise<CourseContent> {
    const content = await this.contentRepo.findOne({
      where: { id, sectionId },
    });
    if (!content) {
      throw new NotFoundException('Content not found in the specified section');
    }

    content.publishedAt = new Date();
    return this.contentRepo.save(content);
  }

  async unpublish(id: string, sectionId: string): Promise<CourseContent> {
    const content = await this.contentRepo.findOne({
      where: { id, sectionId },
    });
    if (!content) {
      throw new NotFoundException('Content not found in the specified section');
    }

    content.publishedAt = null;
    return this.contentRepo.save(content);
  }

  async delete(id: string, sectionId: string): Promise<boolean> {
    const content = await this.contentRepo.findOne({
      where: { id, sectionId },
    });
    if (!content) {
      throw new NotFoundException('Content not found in the specified section');
    }

    await this.contentRepo.remove(content);
    return true;
  }
}
