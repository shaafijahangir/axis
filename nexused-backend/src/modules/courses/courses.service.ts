import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Course, CourseSection, Enrollment } from '../../database/entities';
import { CreateCourseInput, CreateSectionInput } from './dto/course.types';
import { NexusEvents } from '../ai/events/ai-events';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    @InjectRepository(CourseSection)
    private sectionsRepository: Repository<CourseSection>,
    @InjectRepository(Enrollment)
    private enrollmentsRepository: Repository<Enrollment>,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAllForTenant(tenantId: string): Promise<Course[]> {
    return this.coursesRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Course> {
    const course = await this.coursesRepository.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(tenantId: string, input: CreateCourseInput): Promise<Course> {
    const course = this.coursesRepository.create({ ...input, tenantId });
    const saved = await this.coursesRepository.save(course);

    this.eventEmitter.emit(NexusEvents.COURSE_CREATED, {
      courseId: saved.id,
      tenantId,
      createdBy: tenantId, // Will be replaced with actual userId when resolver passes it
      title: saved.title,
      code: saved.code,
    });

    return saved;
  }

  async findSectionsForCourse(courseId: string): Promise<CourseSection[]> {
    return this.sectionsRepository.find({
      where: { courseId },
      relations: ['course', 'instructor'],
      order: { createdAt: 'DESC' },
    });
  }

  async findSectionsForInstructor(
    instructorId: string,
  ): Promise<CourseSection[]> {
    return this.sectionsRepository.find({
      where: { instructorId },
      relations: ['course', 'instructor'],
      order: { createdAt: 'DESC' },
    });
  }

  async findSectionById(id: string): Promise<CourseSection> {
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: ['course', 'instructor'],
    });
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }

  async createSection(
    instructorId: string,
    input: CreateSectionInput,
  ): Promise<CourseSection> {
    const section = this.sectionsRepository.create({
      ...input,
      instructorId,
      schedule: input.schedule ? JSON.parse(input.schedule) : null,
    });
    const saved = await this.sectionsRepository.save(section);

    // Look up course to get tenantId for the event
    const course = await this.coursesRepository.findOne({
      where: { id: input.courseId },
    });
    if (course) {
      this.eventEmitter.emit(NexusEvents.SECTION_CREATED, {
        sectionId: saved.id,
        courseId: input.courseId,
        tenantId: course.tenantId,
        instructorId,
      });
    }

    return saved;
  }

  async findEnrollmentsForUser(userId: string): Promise<Enrollment[]> {
    return this.enrollmentsRepository.find({
      where: { userId },
      relations: ['section', 'section.course', 'section.instructor'],
      order: { enrolledAt: 'DESC' },
    });
  }

  async enrollStudent(userId: string, sectionId: string): Promise<Enrollment> {
    const enrollment = this.enrollmentsRepository.create({
      userId,
      sectionId,
      enrolledAt: new Date(),
    });
    const saved = await this.enrollmentsRepository.save(enrollment);

    // Look up section → course to get tenantId for the event
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId },
      relations: ['course'],
    });
    if (section?.course) {
      this.eventEmitter.emit(NexusEvents.ENROLLMENT_CREATED, {
        enrollmentId: saved.id,
        userId,
        sectionId,
        tenantId: section.course.tenantId,
      });
    }

    return saved;
  }

  async findEnrollmentsForSection(sectionId: string): Promise<Enrollment[]> {
    return this.enrollmentsRepository.find({
      where: { sectionId },
      relations: ['user'],
      order: { enrolledAt: 'ASC' },
    });
  }

  async countCourses(tenantId: string): Promise<number> {
    return this.coursesRepository.count({ where: { tenantId } });
  }

  async countSections(tenantId: string): Promise<number> {
    const sections = await this.sectionsRepository
      .createQueryBuilder('section')
      .innerJoin('section.course', 'course')
      .where('course.tenantId = :tenantId', { tenantId })
      .getCount();
    return sections;
  }

  async countEnrollments(tenantId: string): Promise<number> {
    const enrollments = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.section', 'section')
      .innerJoin('section.course', 'course')
      .where('course.tenantId = :tenantId', { tenantId })
      .getCount();
    return enrollments;
  }
}
