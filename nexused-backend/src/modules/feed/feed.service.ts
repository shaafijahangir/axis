import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, In, Repository } from 'typeorm';
import {
  Enrollment,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import { Assignment } from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import {
  CourseSection,
  SectionStatus,
} from '../../database/entities/course-section.entity';
import { AnnouncementsService } from '../announcements/announcements.service';
import { ContentService } from '../content/content.service';
import {
  FeedItem,
  FeedItemType,
  InstructorFeedItem,
  InstructorFeedItemType,
  CourseSectionGrades,
  GradedAssignment,
} from './dto/feed.types';
import { TimelineEntry, TimelineEntryType } from './dto/timeline.types';

/**
 * WHY: Server-side feed aggregation. A single query returns a ranked list
 * of feed items from multiple sources (assignments, grades, announcements).
 * This avoids N+1 client-side queries and keeps ranking logic in one place.
 *
 * TRADEOFF: Feed is computed on every read (no caching/persistence).
 * Acceptable for Phase 1 volumes. Can be optimised with Redis caching later.
 */
@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Enrollment)
    private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Assignment)
    private assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(CourseSection)
    private sectionRepo: Repository<CourseSection>,
    private announcementsService: AnnouncementsService,
    private contentService: ContentService,
  ) {}

  // ─── Student Feed ─────────────────────────────────────────────────────

  async getStudentFeed(userId: string, tenantId: string): Promise<FeedItem[]> {
    // 1. Get active enrollments → sectionIds
    const enrollments = await this.enrollmentRepo.find({
      where: { userId, status: EnrollmentStatus.ACTIVE },
      relations: ['section', 'section.course'],
    });

    const sectionIds = enrollments.map((e) => e.sectionId);
    const sectionMap = new Map(
      enrollments.map((e) => [
        e.sectionId,
        { code: e.section.course.code, title: e.section.course.title },
      ]),
    );

    const items: FeedItem[] = [];

    if (sectionIds.length > 0) {
      // 2. Upcoming assignments (dueAt > now)
      const now = new Date();
      const upcomingAssignments = await this.assignmentRepo.find({
        where: { sectionId: In(sectionIds), dueAt: MoreThan(now) },
        order: { dueAt: 'ASC' },
        take: 20,
      });

      for (const a of upcomingAssignments) {
        const course = sectionMap.get(a.sectionId);
        if (!course) continue;
        items.push({
          type: FeedItemType.DEADLINE,
          id: `deadline-${a.id}`,
          title: a.title,
          subtitle: `Due ${a.dueAt.toLocaleDateString()}`,
          courseCode: course.code,
          courseTitle: course.title,
          sectionId: a.sectionId,
          assignmentId: a.id,
          dueAt: a.dueAt,
          pointsPossible: a.pointsPossible,
          timestamp: a.dueAt,
        });
      }

      // 3. Recent grades (gradedAt in last 14 days)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const recentGrades = await this.submissionRepo
        .createQueryBuilder('sub')
        .leftJoinAndSelect('sub.assignment', 'assignment')
        .where('sub.userId = :userId', { userId })
        .andWhere('sub.gradedAt IS NOT NULL')
        .andWhere('sub.gradedAt >= :since', { since: fourteenDaysAgo })
        .andWhere('assignment.sectionId IN (:...sectionIds)', { sectionIds })
        .orderBy('sub.gradedAt', 'DESC')
        .take(10)
        .getMany();

      for (const sub of recentGrades) {
        const course = sectionMap.get(sub.assignment.sectionId);
        if (!course) continue;
        items.push({
          type: FeedItemType.GRADE_POSTED,
          id: `grade-${sub.id}`,
          title: sub.assignment.title,
          subtitle: `${sub.score}/${sub.assignment.pointsPossible} points`,
          courseCode: course.code,
          courseTitle: course.title,
          sectionId: sub.assignment.sectionId,
          assignmentId: sub.assignmentId,
          score: sub.score,
          pointsPossible: sub.assignment.pointsPossible,
          timestamp: sub.gradedAt,
        });
      }

      // 4. Recent announcements (last 14 days)
      const announcements =
        await this.announcementsService.findRecentBySectionIds(sectionIds, 14);

      for (const ann of announcements) {
        const course = sectionMap.get(ann.sectionId);
        if (!course) continue;
        items.push({
          type: FeedItemType.ANNOUNCEMENT,
          id: `announcement-${ann.id}`,
          title: ann.title,
          body: ann.body,
          subtitle: ann.author
            ? `${ann.author.firstName} ${ann.author.lastName}`
            : undefined,
          courseCode: course.code,
          courseTitle: course.title,
          sectionId: ann.sectionId,
          timestamp: ann.createdAt,
        });
      }
    }

    // 5. ENROLL-004: Recent enrollment status changes (last 14 days).
    // Pull-based — reads updatedAt so no persistent notification entity is needed.
    // Covers: newly active enrollments, drops, withdrawals, rejections.
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const recentEnrollmentChanges = await this.enrollmentRepo.find({
      where: {
        userId,
        status: In([
          EnrollmentStatus.ACTIVE,
          EnrollmentStatus.DROPPED,
          EnrollmentStatus.WITHDRAWN,
          EnrollmentStatus.REJECTED,
        ]),
        updatedAt: MoreThan(fourteenDaysAgo),
      },
      relations: ['section', 'section.course'],
      order: { updatedAt: 'DESC' },
      take: 10,
    });

    for (const enrollment of recentEnrollmentChanges) {
      const course = enrollment.section?.course;
      if (!course) continue;

      let title: string;
      let subtitle: string;

      switch (enrollment.status) {
        case EnrollmentStatus.ACTIVE:
          title = `Enrolled in ${course.code}: ${course.title}`;
          subtitle = "You're all set! Check out your course timeline.";
          break;
        case EnrollmentStatus.DROPPED:
          title = `Dropped: ${course.code}`;
          subtitle = `You've dropped ${course.title}.`;
          break;
        case EnrollmentStatus.WITHDRAWN:
          title = `Withdrawn from ${course.code}`;
          subtitle = `A "W" has been recorded for ${course.title}.`;
          break;
        case EnrollmentStatus.REJECTED:
          title = `Enrollment not approved: ${course.code}`;
          subtitle = `Your enrollment request for ${course.title} was declined.`;
          break;
        default:
          continue;
      }

      items.push({
        type: FeedItemType.ENROLLMENT_UPDATE,
        id: `enrollment-update-${enrollment.id}`,
        title,
        subtitle,
        courseCode: course.code,
        courseTitle: course.title,
        sectionId: enrollment.sectionId,
        timestamp: enrollment.updatedAt,
      });
    }

    // FEAT-014: Sorting moved to FeedPersonalizationService.rankFeedItems()
    // which applies ML-based scoring when engagement data exists,
    // or falls back to rule-based urgency ranking for new users.
    return items;
  }

  // ─── Instructor Feed ──────────────────────────────────────────────────

  async getInstructorFeed(
    userId: string,
    tenantId: string,
  ): Promise<InstructorFeedItem[]> {
    // 1. Get teaching sections
    const sections = await this.sectionRepo.find({
      where: { instructorId: userId, status: SectionStatus.ACTIVE },
      relations: ['course'],
    });

    if (sections.length === 0) return [];

    const sectionIds = sections.map((s) => s.id);
    const sectionMap = new Map(
      sections.map((s) => [
        s.id,
        { code: s.course.code, title: s.course.title },
      ]),
    );

    const items: InstructorFeedItem[] = [];

    // 2. Ungraded submissions per assignment
    const ungradedCounts = await this.submissionRepo
      .createQueryBuilder('sub')
      .select('sub.assignmentId', 'assignmentId')
      .addSelect('COUNT(*)', 'count')
      .leftJoin('sub.assignment', 'assignment')
      .where('assignment.sectionId IN (:...sectionIds)', { sectionIds })
      .andWhere('sub.gradedAt IS NULL')
      .andWhere('sub.submittedAt IS NOT NULL')
      .groupBy('sub.assignmentId')
      .getRawMany<{ assignmentId: string; count: string }>();

    if (ungradedCounts.length > 0) {
      const assignmentIds = ungradedCounts.map((u) => u.assignmentId);
      const assignments = await this.assignmentRepo.find({
        where: { id: In(assignmentIds) },
      });
      const assignmentMap = new Map(assignments.map((a) => [a.id, a]));

      for (const ug of ungradedCounts) {
        const assignment = assignmentMap.get(ug.assignmentId);
        if (!assignment) continue;
        const course = sectionMap.get(assignment.sectionId);
        if (!course) continue;
        items.push({
          type: InstructorFeedItemType.UNGRADED,
          id: `ungraded-${assignment.id}`,
          title: assignment.title,
          subtitle: `${ug.count} submission${Number(ug.count) !== 1 ? 's' : ''} to grade`,
          courseCode: course.code,
          courseTitle: course.title,
          sectionId: assignment.sectionId,
          assignmentId: assignment.id,
          ungradedCount: Number(ug.count),
          timestamp: new Date(),
        });
      }
    }

    // 3. Upcoming deadlines for instructor's sections
    const now = new Date();
    const upcomingAssignments = await this.assignmentRepo.find({
      where: { sectionId: In(sectionIds), dueAt: MoreThan(now) },
      order: { dueAt: 'ASC' },
      take: 10,
    });

    for (const a of upcomingAssignments) {
      const course = sectionMap.get(a.sectionId);
      if (!course) continue;
      items.push({
        type: InstructorFeedItemType.UPCOMING_DEADLINE,
        id: `deadline-${a.id}`,
        title: a.title,
        subtitle: `Due ${a.dueAt.toLocaleDateString()}`,
        courseCode: course.code,
        courseTitle: course.title,
        sectionId: a.sectionId,
        assignmentId: a.id,
        dueAt: a.dueAt,
        timestamp: a.dueAt,
      });
    }

    // 4. Sort: ungraded first, then by timestamp
    items.sort((a, b) => {
      if (
        a.type === InstructorFeedItemType.UNGRADED &&
        b.type !== InstructorFeedItemType.UNGRADED
      )
        return -1;
      if (
        a.type !== InstructorFeedItemType.UNGRADED &&
        b.type === InstructorFeedItemType.UNGRADED
      )
        return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return items;
  }

  // ─── Section Timeline ─────────────────────────────────────────────────

  /**
   * WHY: userId is optional so instructors/admins still see the timeline
   * without grade overlays. When provided, we batch-fetch the student's
   * graded submissions for this section in one query (no N+1).
   *
   * isInstructor controls whether drafts are included. Students only see
   * published content; instructors see everything with draft badges.
   *
   * tenantId is required for content service tenant scoping.
   */
  async getSectionTimeline(
    sectionId: string,
    tenantId: string,
    userId?: string,
    isInstructor = false,
  ): Promise<TimelineEntry[]> {
    const entries: TimelineEntry[] = [];

    // Assignments
    const assignments = await this.assignmentRepo.find({
      where: { sectionId },
      order: { createdAt: 'DESC' },
    });

    // Batch-fetch grades when userId is provided
    const gradeMap = new Map<
      string,
      { score: number; gradedAt: Date; feedback: string }
    >();

    if (userId && assignments.length > 0) {
      const assignmentIds = assignments.map((a) => a.id);
      const gradedSubmissions = await this.submissionRepo.find({
        where: {
          userId,
          assignmentId: In(assignmentIds),
        },
      });

      // Keep the latest graded submission per assignment
      for (const sub of gradedSubmissions) {
        if (!sub.gradedAt) continue;
        const existing = gradeMap.get(sub.assignmentId);
        if (!existing || sub.gradedAt > existing.gradedAt) {
          gradeMap.set(sub.assignmentId, {
            score: sub.score,
            gradedAt: sub.gradedAt,
            feedback: sub.feedback,
          });
        }
      }
    }

    for (const a of assignments) {
      const grade = gradeMap.get(a.id);
      entries.push({
        type: TimelineEntryType.ASSIGNMENT,
        id: a.id,
        title: a.title,
        body: a.description,
        assignmentType: a.type,
        pointsPossible: a.pointsPossible,
        dueAt: a.dueAt,
        pinned: false,
        timestamp: a.createdAt,
        score: grade?.score,
        gradedAt: grade?.gradedAt,
        feedback: grade?.feedback,
      });
    }

    // Announcements
    const announcements =
      await this.announcementsService.findBySectionId(sectionId);

    for (const ann of announcements) {
      entries.push({
        type: TimelineEntryType.ANNOUNCEMENT,
        id: ann.id,
        title: ann.title,
        body: ann.body,
        authorName: ann.author
          ? `${ann.author.firstName} ${ann.author.lastName}`
          : undefined,
        priority: ann.priority,
        pinned: ann.pinned,
        timestamp: ann.createdAt,
      });
    }

    // Course content (publishedOnly = !isInstructor)
    const contents = await this.contentService.findBySectionId(
      sectionId,
      tenantId,
      !isInstructor,
    );

    for (const c of contents) {
      entries.push({
        type: TimelineEntryType.CONTENT,
        id: c.id,
        title: c.title,
        body: c.body,
        authorName: c.author
          ? `${c.author.firstName} ${c.author.lastName}`
          : undefined,
        pinned: false,
        timestamp: c.publishedAt ?? c.createdAt,
        publishedAt: c.publishedAt ?? undefined,
      });
    }

    // Pinned items first, then chronological (newest first)
    entries.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return entries;
  }

  // ─── Student Grades Summary ────────────────────────────────────────────

  /**
   * WHY: 3 bulk queries instead of per-section queries.
   * 1) enrollments (with section.course + section.instructor)
   * 2) all assignments for enrolled sections
   * 3) all graded submissions for those assignments
   *
   * PATTERN: Build lookup maps, then group in memory.
   * TRADEOFF: Fetches all assignments even ungraded ones (need pointsPossible
   * for total calculation). Acceptable — students rarely have 1000+ assignments.
   */
  async getStudentGrades(
    userId: string,
    tenantId: string,
  ): Promise<CourseSectionGrades[]> {
    // 1. Active enrollments with section → course + instructor
    const enrollments = await this.enrollmentRepo.find({
      where: { userId, status: EnrollmentStatus.ACTIVE },
      relations: ['section', 'section.course', 'section.instructor'],
    });

    if (enrollments.length === 0) return [];

    const sectionIds = enrollments.map((e) => e.sectionId);

    // 2. All assignments across enrolled sections
    const assignments = await this.assignmentRepo.find({
      where: { sectionId: In(sectionIds) },
      order: { dueAt: 'ASC' },
    });

    if (assignments.length === 0) return [];

    const assignmentIds = assignments.map((a) => a.id);

    // 3. All graded submissions for this student
    const gradedSubmissions = await this.submissionRepo.find({
      where: {
        userId,
        assignmentId: In(assignmentIds),
      },
    });

    // Dedup: keep latest graded submission per assignment
    const subMap = new Map<
      string,
      { score: number; gradedAt: Date; feedback: string }
    >();
    for (const sub of gradedSubmissions) {
      if (!sub.gradedAt) continue;
      const existing = subMap.get(sub.assignmentId);
      if (!existing || sub.gradedAt > existing.gradedAt) {
        subMap.set(sub.assignmentId, {
          score: sub.score,
          gradedAt: sub.gradedAt,
          feedback: sub.feedback,
        });
      }
    }

    // Group assignments by sectionId
    const assignmentsBySection = new Map<string, typeof assignments>();
    for (const a of assignments) {
      const list = assignmentsBySection.get(a.sectionId) ?? [];
      list.push(a);
      assignmentsBySection.set(a.sectionId, list);
    }

    // Build result grouped by section
    const results: CourseSectionGrades[] = [];

    for (const enrollment of enrollments) {
      const sectionAssignments =
        assignmentsBySection.get(enrollment.sectionId) ?? [];

      const gradedAssignments: GradedAssignment[] = [];
      let totalEarned = 0;
      let totalPossible = 0;

      for (const a of sectionAssignments) {
        const grade = subMap.get(a.id);
        if (!grade) continue;

        const percentage =
          a.pointsPossible > 0
            ? Math.round((grade.score / a.pointsPossible) * 10000) / 100
            : 0;

        gradedAssignments.push({
          assignmentId: a.id,
          assignmentTitle: a.title,
          assignmentType: a.type,
          pointsPossible: a.pointsPossible,
          score: grade.score,
          percentage,
          gradedAt: grade.gradedAt,
          feedback: grade.feedback,
        });

        totalEarned += Number(grade.score);
        totalPossible += Number(a.pointsPossible);
      }

      // Skip sections with no graded assignments
      if (gradedAssignments.length === 0) continue;

      const overallPercentage =
        totalPossible > 0
          ? Math.round((totalEarned / totalPossible) * 10000) / 100
          : 0;

      const instructor = enrollment.section.instructor;
      results.push({
        sectionId: enrollment.sectionId,
        courseId: enrollment.section.courseId,
        courseCode: enrollment.section.course.code,
        courseTitle: enrollment.section.course.title,
        sectionInstructor: instructor
          ? `${instructor.firstName} ${instructor.lastName}`
          : undefined,
        totalPointsEarned: totalEarned,
        totalPointsPossible: totalPossible,
        overallPercentage,
        assignments: gradedAssignments,
      });
    }

    return results;
  }
}
