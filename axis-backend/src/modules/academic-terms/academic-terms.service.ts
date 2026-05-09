import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicTerm, CourseSection } from '../../database/entities';
import {
  CreateAcademicTermInput,
  UpdateAcademicTermInput,
} from './dto/academic-term.types';

@Injectable()
export class AcademicTermsService {
  constructor(
    @InjectRepository(AcademicTerm)
    private termsRepository: Repository<AcademicTerm>,
    @InjectRepository(CourseSection)
    private sectionsRepository: Repository<CourseSection>,
  ) {}

  async findAllForTenant(tenantId: string): Promise<AcademicTerm[]> {
    return this.termsRepository.find({
      where: { tenantId },
      order: { startDate: 'DESC' },
    });
  }

  async findById(id: string, tenantId: string): Promise<AcademicTerm> {
    const term = await this.termsRepository.findOne({
      where: { id, tenantId },
    });
    if (!term) {
      throw new NotFoundException('Academic term not found');
    }
    return term;
  }

  async findCurrent(tenantId: string): Promise<AcademicTerm | null> {
    return this.termsRepository.findOne({
      where: { tenantId, isCurrent: true },
    });
  }

  async create(
    tenantId: string,
    input: CreateAcademicTermInput,
  ): Promise<AcademicTerm> {
    // If this term is set as current, unset all other current terms first
    if (input.isCurrent) {
      await this.termsRepository.update(
        { tenantId, isCurrent: true },
        { isCurrent: false },
      );
    }

    const term = this.termsRepository.create({
      tenantId,
      name: input.name,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      isCurrent: input.isCurrent ?? false,
    });

    return this.termsRepository.save(term);
  }

  async update(
    id: string,
    tenantId: string,
    input: UpdateAcademicTermInput,
  ): Promise<AcademicTerm> {
    const term = await this.findById(id, tenantId);

    // If setting this term as current, unset all other current terms first
    if (input.isCurrent === true && !term.isCurrent) {
      await this.termsRepository.update(
        { tenantId, isCurrent: true },
        { isCurrent: false },
      );
    }

    const updateData: Partial<AcademicTerm> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.startDate !== undefined)
      updateData.startDate = new Date(input.startDate);
    if (input.endDate !== undefined)
      updateData.endDate = new Date(input.endDate);
    if (input.isCurrent !== undefined) updateData.isCurrent = input.isCurrent;

    await this.termsRepository.update(id, updateData);
    return this.termsRepository.findOneOrFail({ where: { id } });
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const term = await this.findById(id, tenantId);

    // Check if any sections reference this term
    const sectionCount = await this.sectionsRepository.count({
      where: { termId: term.id },
    });
    if (sectionCount > 0) {
      throw new ForbiddenException(
        `Cannot delete term: ${sectionCount} section(s) still reference it`,
      );
    }

    await this.termsRepository.remove(term);
    return true;
  }

  async count(tenantId: string): Promise<number> {
    return this.termsRepository.count({ where: { tenantId } });
  }
}
