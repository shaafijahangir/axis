import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  ReportCard,
  ReportCardStatus,
} from '../../database/entities/report-card.entity';
import {
  Enrollment,
  EnrollmentRole,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import {
  Attendance,
  AttendanceStatus,
} from '../../database/entities/attendance.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import {
  UpdateReportCardInput,
  ReportCardSummary,
} from './dto/report-card.types';

@Injectable()
export class ReportCardsService {
  constructor(
    @InjectRepository(ReportCard)
    private reportCardRepo: Repository<ReportCard>,
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(CourseSection)
    private sectionRepo: Repository<CourseSection>,
    @InjectRepository(Attendance)
    private attendanceRepo: Repository<Attendance>,
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
  ) {}

  private toSummary(card: ReportCard): ReportCardSummary {
    const section = card.section;
    const course = section?.course;
    const student = card.student;
    const term = card.term;

    return {
      id: card.id,
      studentId: card.studentId,
      studentFirstName: student?.firstName ?? '',
      studentLastName: student?.lastName ?? '',
      studentEmail: student?.email ?? '',
      sectionId: card.sectionId,
      courseCode: course?.code ?? '',
      courseTitle: course?.title ?? '',
      termId: card.termId,
      termName: term?.name ?? '',
      status: card.status,
      teacherComment: card.teacherComment ?? undefined,
      finalGrade: card.finalGrade ?? undefined,
      gradeSummary: card.gradeSummary
        ? JSON.stringify(card.gradeSummary)
        : undefined,
      attendanceSummary: card.attendanceSummary
        ? JSON.stringify(card.attendanceSummary)
        : undefined,
      publishedAt: card.publishedAt ?? undefined,
      createdAt: card.createdAt,
    };
  }

  async generateForSection(
    sectionId: string,
    tenantId: string,
  ): Promise<ReportCardSummary[]> {
    const section = await this.sectionRepo
      .createQueryBuilder('section')
      .innerJoinAndSelect('section.course', 'course')
      .innerJoinAndSelect('section.term', 'term')
      .innerJoinAndSelect('section.instructor', 'instructor')
      .where('section.id = :sectionId', { sectionId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .getOne();
    if (!section) throw new NotFoundException('Section not found');

    const enrollments = await this.enrollmentRepo
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.user', 'user')
      .where('enrollment.sectionId = :sectionId', { sectionId })
      .andWhere('enrollment.tenantId = :tenantId', { tenantId })
      .andWhere('enrollment.status = :status', {
        status: EnrollmentStatus.ACTIVE,
      })
      .andWhere('enrollment.role = :role', { role: EnrollmentRole.STUDENT })
      .getMany();

    // Grade snapshot
    const assignments = await this.assignmentRepo
      .createQueryBuilder('assignment')
      .innerJoin('assignment.section', 'section')
      .innerJoin('section.course', 'course')
      .where('assignment.sectionId = :sectionId', { sectionId })
      .andWhere('course.tenantId = :tenantId', { tenantId })
      .getMany();

    const assignmentIds = assignments.map((a) => a.id);
    const allSubmissions =
      assignmentIds.length > 0
        ? await this.submissionRepo.find({
            where: { assignmentId: In(assignmentIds), tenantId },
            order: { attempt: 'DESC' },
          })
        : [];

    // Build best submission map: assignmentId → userId → best score
    const bestMap = new Map<
      string,
      Map<string, { score: number; gradedAt: Date }>
    >();
    for (const sub of allSubmissions) {
      if (sub.score == null || sub.gradedAt == null) continue;
      if (!bestMap.has(sub.assignmentId))
        bestMap.set(sub.assignmentId, new Map());
      const aMap = bestMap.get(sub.assignmentId)!;
      const score = Number(sub.score);
      const existing = aMap.get(sub.userId);
      if (!existing || score > existing.score) {
        aMap.set(sub.userId, { score, gradedAt: sub.gradedAt });
      }
    }

    // Attendance snapshot
    const allAttendance = await this.attendanceRepo.find({
      where: { sectionId, tenantId },
    });
    const attendanceByStudent = new Map<string, Attendance[]>();
    for (const a of allAttendance) {
      if (!attendanceByStudent.has(a.userId))
        attendanceByStudent.set(a.userId, []);
      attendanceByStudent.get(a.userId)!.push(a);
    }

    const cards: ReportCardSummary[] = [];

    for (const enrollment of enrollments) {
      const userId = enrollment.userId;

      // Grade summary
      let totalEarned = 0,
        totalPossible = 0;
      const assignmentSnapshots: {
        id: string;
        title: string;
        pointsPossible: number;
        score: number;
      }[] = [];
      for (const a of assignments) {
        const best = bestMap.get(a.id)?.get(userId);
        const pts = Number(a.pointsPossible);
        totalPossible += pts;
        if (best) {
          totalEarned += best.score;
          assignmentSnapshots.push({
            id: a.id,
            title: a.title,
            pointsPossible: pts,
            score: best.score,
          });
        }
      }
      const gradeSummary = {
        totalEarned,
        totalPossible,
        percentage:
          totalPossible > 0
            ? Math.round((totalEarned / totalPossible) * 10000) / 100
            : 0,
        assignments: assignmentSnapshots,
      };

      // Attendance summary
      const attendRecords = attendanceByStudent.get(userId) ?? [];
      let present = 0,
        absent = 0,
        late = 0,
        excused = 0;
      for (const r of attendRecords) {
        if (r.status === AttendanceStatus.PRESENT) present++;
        else if (r.status === AttendanceStatus.ABSENT) absent++;
        else if (r.status === AttendanceStatus.LATE) late++;
        else if (r.status === AttendanceStatus.EXCUSED) excused++;
      }
      const attendanceSummary = {
        total: attendRecords.length,
        present,
        absent,
        late,
        excused,
        attendanceRate:
          attendRecords.length > 0
            ? Math.round(
                ((present + late + excused) / attendRecords.length) * 10000,
              ) / 100
            : 100,
      };

      // Upsert report card
      let card = await this.reportCardRepo.findOne({
        where: {
          studentId: userId,
          sectionId,
          termId: section.termId,
          tenantId,
        },
      });

      if (!card) {
        card = this.reportCardRepo.create({
          tenantId,
          studentId: userId,
          sectionId,
          termId: section.termId,
          status: ReportCardStatus.DRAFT,
          gradeSummary,
          attendanceSummary,
        });
      } else if (card.status === ReportCardStatus.DRAFT) {
        card.gradeSummary = gradeSummary;
        card.attendanceSummary = attendanceSummary;
      }

      const saved = await this.reportCardRepo.save(card);

      cards.push({
        id: saved.id,
        studentId: userId,
        studentFirstName: enrollment.user.firstName,
        studentLastName: enrollment.user.lastName,
        studentEmail: enrollment.user.email,
        sectionId,
        courseCode: section.course.code,
        courseTitle: section.course.title,
        termId: section.termId,
        termName: section.term.name,
        status: saved.status,
        teacherComment: saved.teacherComment ?? undefined,
        finalGrade: saved.finalGrade ?? undefined,
        gradeSummary: JSON.stringify(gradeSummary),
        attendanceSummary: JSON.stringify(attendanceSummary),
        publishedAt: saved.publishedAt ?? undefined,
        createdAt: saved.createdAt,
      });
    }

    return cards;
  }

  /**
   * ARCH-008: resolve a report card's owning section so the resolver can
   * assert staff access before mutating it. Tenant-scoped.
   */
  async getSectionId(id: string, tenantId: string): Promise<string> {
    const card = await this.reportCardRepo.findOne({
      where: { id, tenantId },
      select: ['id', 'sectionId'],
    });
    if (!card) throw new NotFoundException('Report card not found');
    return card.sectionId;
  }

  async updateComment(
    id: string,
    tenantId: string,
    input: UpdateReportCardInput,
  ): Promise<ReportCardSummary> {
    const card = await this.reportCardRepo.findOne({
      where: { id, tenantId },
      relations: ['student', 'section', 'section.course', 'term'],
    });
    if (!card) throw new NotFoundException('Report card not found');
    if (card.status === ReportCardStatus.PUBLISHED)
      throw new ForbiddenException('Cannot edit a published report card');

    if (input.teacherComment !== undefined)
      card.teacherComment = input.teacherComment;
    if (input.finalGrade !== undefined) card.finalGrade = input.finalGrade;

    const saved = await this.reportCardRepo.save(card);
    return this.toSummary(saved);
  }

  async publishSection(
    sectionId: string,
    tenantId: string,
  ): Promise<ReportCardSummary[]> {
    const cards = await this.reportCardRepo.find({
      where: { sectionId, tenantId, status: ReportCardStatus.DRAFT },
      relations: ['student', 'section', 'section.course', 'term'],
    });

    const now = new Date();
    for (const card of cards) {
      card.status = ReportCardStatus.PUBLISHED;
      card.publishedAt = now;
    }

    const saved = await this.reportCardRepo.save(cards);
    return saved.map((c) => this.toSummary(c));
  }

  async sectionReportCards(
    sectionId: string,
    tenantId: string,
  ): Promise<ReportCardSummary[]> {
    const cards = await this.reportCardRepo.find({
      where: { sectionId, tenantId },
      relations: ['student', 'section', 'section.course', 'term'],
      order: { createdAt: 'DESC' },
    });
    return cards.map((c) => this.toSummary(c));
  }

  async myReportCards(
    userId: string,
    tenantId: string,
  ): Promise<ReportCardSummary[]> {
    const cards = await this.reportCardRepo.find({
      where: {
        studentId: userId,
        tenantId,
        status: ReportCardStatus.PUBLISHED,
      },
      relations: ['student', 'section', 'section.course', 'term'],
      order: { publishedAt: 'DESC' },
    });
    return cards.map((c) => this.toSummary(c));
  }
}
