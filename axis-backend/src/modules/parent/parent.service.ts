import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ParentStudent } from '../../database/entities/parent-student.entity';
import { User } from '../../database/entities/user.entity';
import {
  Enrollment,
  EnrollmentStatus,
  EnrollmentRole,
} from '../../database/entities/enrollment.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import {
  ReportCard,
  ReportCardStatus,
} from '../../database/entities/report-card.entity';
import {
  LinkStudentInput,
  LinkedStudent,
  ParentEnrollmentItem,
  ParentGradeItem,
  ParentReportCard,
} from './dto/parent.types';
import { AccessControlService } from '../access-control/access-control.service';

@Injectable()
export class ParentService {
  constructor(
    @InjectRepository(ParentStudent)
    private linkRepo: Repository<ParentStudent>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(ReportCard)
    private reportCardRepo: Repository<ReportCard>,
    private readonly accessControl: AccessControlService,
  ) {}

  async linkStudent(
    tenantId: string,
    input: LinkStudentInput,
  ): Promise<ParentStudent> {
    const existing = await this.linkRepo.findOne({
      where: { parentId: input.parentId, studentId: input.studentId, tenantId },
    });
    if (existing)
      throw new ConflictException('Student is already linked to this parent');

    const [parent, student] = await Promise.all([
      this.userRepo.findOne({ where: { id: input.parentId, tenantId } }),
      this.userRepo.findOne({ where: { id: input.studentId, tenantId } }),
    ]);
    if (!parent) throw new NotFoundException('Parent user not found');
    if (!student) throw new NotFoundException('Student user not found');

    const link = this.linkRepo.create({
      parentId: input.parentId,
      studentId: input.studentId,
      tenantId,
      relationship: input.relationship,
    });
    return this.linkRepo.save(link);
  }

  async unlinkStudent(
    parentId: string,
    studentId: string,
    tenantId: string,
  ): Promise<boolean> {
    const link = await this.linkRepo.findOne({
      where: { parentId, studentId, tenantId },
    });
    if (!link) throw new NotFoundException('Link not found');
    await this.linkRepo.remove(link);
    return true;
  }

  async getMyStudents(
    parentId: string,
    tenantId: string,
  ): Promise<LinkedStudent[]> {
    const links = await this.linkRepo.find({
      where: { parentId, tenantId },
      relations: ['student'],
    });
    return links.map((l) => ({
      id: l.student.id,
      firstName: l.student.firstName,
      lastName: l.student.lastName,
      email: l.student.email,
      linkId: l.id,
    }));
  }

  async getLinksForStudent(
    studentId: string,
    tenantId: string,
  ): Promise<ParentStudent[]> {
    return this.linkRepo.find({
      where: { studentId, tenantId },
      relations: ['parent'],
    });
  }

  /**
   * ARCH-008: delegates to the shared AccessControlService instead of the
   * former inline link lookup, so parent/student authorization has one
   * source of truth alongside the section-staff assertions.
   */
  private async verifyAccess(
    parentId: string,
    studentId: string,
    tenantId: string,
  ): Promise<void> {
    await this.accessControl.assertParentOfStudent(
      parentId,
      studentId,
      tenantId,
    );
  }

  async getStudentEnrollments(
    parentId: string,
    studentId: string,
    tenantId: string,
  ): Promise<ParentEnrollmentItem[]> {
    await this.verifyAccess(parentId, studentId, tenantId);

    const enrollments = await this.enrollmentRepo
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.section', 'section')
      .innerJoinAndSelect('section.course', 'course')
      .leftJoinAndSelect('section.instructor', 'instructor')
      .leftJoinAndSelect('section.term', 'term')
      .where('e.userId = :studentId', { studentId })
      .andWhere('e.tenantId = :tenantId', { tenantId })
      .andWhere('e.role = :role', { role: EnrollmentRole.STUDENT })
      .andWhere('e.status IN (:...statuses)', {
        statuses: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED],
      })
      .orderBy('e.enrolledAt', 'DESC')
      .getMany();

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      sectionId: e.sectionId,
      courseCode: e.section.course.code,
      courseTitle: e.section.course.title,
      location: e.section.location ?? undefined,
      instructorName: e.section.instructor
        ? `${e.section.instructor.firstName} ${e.section.instructor.lastName}`
        : undefined,
      status: e.status,
      termName: e.section.term?.name,
    }));
  }

  async getStudentGrades(
    parentId: string,
    studentId: string,
    tenantId: string,
  ): Promise<ParentGradeItem[]> {
    await this.verifyAccess(parentId, studentId, tenantId);

    // Get all active section IDs for the student
    const enrollments = await this.enrollmentRepo.find({
      where: {
        userId: studentId,
        tenantId,
        status: EnrollmentStatus.ACTIVE,
        role: EnrollmentRole.STUDENT,
      },
    });
    if (enrollments.length === 0) return [];

    const sectionIds = enrollments.map((e) => e.sectionId);

    // Get all assignments for these sections
    const assignments = await this.assignmentRepo
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.section', 'section')
      .innerJoinAndSelect('section.course', 'course')
      .where('a.sectionId IN (:...sectionIds)', { sectionIds })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .orderBy('a.dueAt', 'ASC')
      .getMany();

    if (assignments.length === 0) return [];

    const assignmentIds = assignments.map((a) => a.id);

    // Get best submission per assignment
    const submissions = await this.submissionRepo.find({
      where: { userId: studentId, assignmentId: In(assignmentIds), tenantId },
      order: { attempt: 'DESC' },
    });

    // Best graded submission per assignment
    const bestSub = new Map<string, Submission>();
    for (const sub of submissions) {
      if (sub.score == null) continue;
      const existing = bestSub.get(sub.assignmentId);
      if (!existing || Number(sub.score) > Number(existing.score)) {
        bestSub.set(sub.assignmentId, sub);
      }
    }

    return assignments.map((a) => {
      const sub = bestSub.get(a.id);
      return {
        assignmentId: a.id,
        assignmentTitle: a.title,
        courseCode: a.section.course.code,
        pointsPossible: Number(a.pointsPossible),
        score: sub ? Number(sub.score) : undefined,
        gradedAt: sub?.gradedAt ?? undefined,
        dueAt: a.dueAt ?? undefined,
      };
    });
  }

  async getStudentReportCards(
    parentId: string,
    studentId: string,
    tenantId: string,
  ): Promise<ParentReportCard[]> {
    await this.verifyAccess(parentId, studentId, tenantId);

    const cards = await this.reportCardRepo.find({
      where: { studentId, tenantId, status: ReportCardStatus.PUBLISHED },
      relations: ['section', 'section.course', 'term'],
      order: { publishedAt: 'DESC' },
    });

    return cards.map((c) => ({
      id: c.id,
      courseCode: c.section.course.code,
      courseTitle: c.section.course.title,
      termName: c.term.name,
      status: c.status,
      finalGrade: c.finalGrade ?? undefined,
      teacherComment: c.teacherComment ?? undefined,
      gradeSummary: c.gradeSummary ? JSON.stringify(c.gradeSummary) : undefined,
      attendanceSummary: c.attendanceSummary
        ? JSON.stringify(c.attendanceSummary)
        : undefined,
      publishedAt: c.publishedAt ?? undefined,
    }));
  }
}
