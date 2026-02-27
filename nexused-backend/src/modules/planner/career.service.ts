import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CareerProfile } from '../../database/entities/career-profile.entity';
import { StudentDegreeProfile } from '../../database/entities/student-degree-profile.entity';
import { Course } from '../../database/entities/course.entity';
import {
  CreateCareerInput,
  UpdateCareerInput,
  CareerSkillGap,
  SkillGapCourse,
} from './dto/career.types';

/**
 * Service for career profile CRUD and skill gap analysis.
 *
 * WHY: Students need a bridge between "I want to be a data scientist"
 * and "here's exactly which courses I've done and which I still need."
 * The skill gap analysis is the core computation — the AI tools and
 * frontend both consume it.
 *
 * PATTERN: Admin manages career profiles via CRUD mutations. Students
 * query careers (filtered by category) and run skill gap analysis
 * against their own degree profile.
 */
@Injectable()
export class CareerService {
  constructor(
    @InjectRepository(CareerProfile)
    private careerRepo: Repository<CareerProfile>,
    @InjectRepository(StudentDegreeProfile)
    private profileRepo: Repository<StudentDegreeProfile>,
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
  ) {}

  // ─── Queries ──────────────────────────────────────────────────────────

  async listCareers(
    tenantId: string,
    category?: string,
  ): Promise<CareerProfile[]> {
    const where: Record<string, unknown> = { tenantId, isActive: true };
    if (category) where.category = category;
    return this.careerRepo.find({ where, order: { title: 'ASC' } });
  }

  async findById(id: string, tenantId: string): Promise<CareerProfile> {
    const career = await this.careerRepo.findOne({ where: { id, tenantId } });
    if (!career) throw new NotFoundException(`Career not found: ${id}`);
    return career;
  }

  /** Returns distinct category names for this tenant's active careers */
  async listCategories(tenantId: string): Promise<string[]> {
    const raw = await this.careerRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.category', 'category')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.isActive = true')
      .orderBy('c.category', 'ASC')
      .getRawMany<{ category: string }>();
    return raw.map((r) => r.category);
  }

  // ─── Admin CRUD ───────────────────────────────────────────────────────

  async create(
    tenantId: string,
    input: CreateCareerInput,
  ): Promise<CareerProfile> {
    const career = this.careerRepo.create({
      tenantId,
      title: input.title,
      category: input.category,
      description: input.description ?? undefined,
      medianSalaryMin: input.medianSalaryMin ?? undefined,
      medianSalaryMax: input.medianSalaryMax ?? undefined,
      requiredSkills: input.requiredSkills ?? [],
      recommendedDegreeIds: input.recommendedDegreeIds ?? [],
      recommendedCourseIds: input.recommendedCourseIds ?? [],
      isActive: true,
    });
    return this.careerRepo.save(career);
  }

  async update(
    tenantId: string,
    input: UpdateCareerInput,
  ): Promise<CareerProfile> {
    const career = await this.findById(input.id, tenantId);

    if (input.title !== undefined) career.title = input.title;
    if (input.category !== undefined) career.category = input.category;
    if (input.description !== undefined) career.description = input.description;
    if (input.medianSalaryMin !== undefined)
      career.medianSalaryMin = input.medianSalaryMin;
    if (input.medianSalaryMax !== undefined)
      career.medianSalaryMax = input.medianSalaryMax;
    if (input.requiredSkills !== undefined)
      career.requiredSkills = input.requiredSkills;
    if (input.recommendedDegreeIds !== undefined)
      career.recommendedDegreeIds = input.recommendedDegreeIds;
    if (input.recommendedCourseIds !== undefined)
      career.recommendedCourseIds = input.recommendedCourseIds;
    if (input.isActive !== undefined) career.isActive = input.isActive;

    return this.careerRepo.save(career);
  }

  async remove(id: string, tenantId: string): Promise<boolean> {
    const career = await this.findById(id, tenantId);
    career.isActive = false;
    await this.careerRepo.save(career);
    return true;
  }

  // ─── Skill Gap Analysis ───────────────────────────────────────────────

  /**
   * Compare a student's completed/current courses against the career's
   * recommended course list.
   *
   * WHY: The student and AI both need a structured answer to "how ready
   * am I for this career?" A simple percentage isn't enough — the student
   * needs to know exactly which courses to prioritise.
   *
   * ALGORITHM:
   *   1. Load the career's recommendedCourseIds.
   *   2. Load the student's completedCourseIds and currentCourseIds.
   *   3. Classify each recommended course as completed / in_progress / missing.
   *   4. Compute readinessPercent = completed / total × 100.
   *
   * WHY the profile must belong to this user: Prevents cross-student data
   * leakage — the profile userId is checked against the calling userId.
   */
  async skillGapAnalysis(
    careerId: string,
    profileId: string,
    userId: string,
    tenantId: string,
  ): Promise<CareerSkillGap> {
    const [career, profile] = await Promise.all([
      this.findById(careerId, tenantId),
      this.profileRepo.findOne({ where: { id: profileId, tenantId, userId } }),
    ]);

    if (!profile) {
      throw new NotFoundException(
        `Degree profile not found or does not belong to this user: ${profileId}`,
      );
    }

    const recommendedIds = career.recommendedCourseIds;
    if (recommendedIds.length === 0) {
      return {
        careerId: career.id,
        careerTitle: career.title,
        courses: [],
        completedCount: 0,
        inProgressCount: 0,
        missingCount: 0,
        readinessPercent: 0,
      };
    }

    const completedSet = new Set(profile.completedCourseIds);
    const currentSet = new Set(profile.currentCourseIds);

    // Load course data for all recommended courses
    const courses = await this.courseRepo.find({
      where: { id: In(recommendedIds) },
    });
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const gapCourses: SkillGapCourse[] = recommendedIds.map((id) => {
      const course = courseMap.get(id);
      let status: 'completed' | 'in_progress' | 'missing';
      if (completedSet.has(id)) {
        status = 'completed';
      } else if (currentSet.has(id)) {
        status = 'in_progress';
      } else {
        status = 'missing';
      }
      return {
        courseId: id,
        code: course?.code ?? 'UNKNOWN',
        title: course?.title ?? `Course ${id}`,
        credits: Number(course?.credits) || 3,
        status,
      };
    });

    const completedCount = gapCourses.filter(
      (c) => c.status === 'completed',
    ).length;
    const inProgressCount = gapCourses.filter(
      (c) => c.status === 'in_progress',
    ).length;
    const missingCount = gapCourses.filter(
      (c) => c.status === 'missing',
    ).length;
    const total = recommendedIds.length;
    const readinessPercent =
      total > 0 ? Math.round((completedCount / total) * 1000) / 10 : 0;

    return {
      careerId: career.id,
      careerTitle: career.title,
      courses: gapCourses,
      completedCount,
      inProgressCount,
      missingCount,
      readinessPercent,
    };
  }

  /**
   * Find careers whose recommended degree programs or skills overlap with
   * the provided profile's degree program.
   *
   * Used by the AI's explore_careers tool to filter careers relevant to
   * the student's current program when a profile ID is provided.
   */
  async findCareersForProfile(
    profileId: string,
    userId: string,
    tenantId: string,
  ): Promise<CareerProfile[]> {
    const profile = await this.profileRepo.findOne({
      where: { id: profileId, tenantId, userId },
      relations: ['degreeProgram'],
    });
    if (!profile) return this.listCareers(tenantId);

    const all = await this.listCareers(tenantId);
    // Prioritise careers that mention this degree program ID
    return all.sort((a, b) => {
      const aMatch = a.recommendedDegreeIds.includes(profile.degreeProgramId)
        ? 1
        : 0;
      const bMatch = b.recommendedDegreeIds.includes(profile.degreeProgramId)
        ? 1
        : 0;
      return bMatch - aMatch;
    });
  }
}
