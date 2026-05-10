import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedService } from './feed.service';
import { FeedItemType, InstructorFeedItemType } from './dto/feed.types';
import { TimelineEntryType } from './dto/timeline.types';
import {
  Enrollment,
  EnrollmentStatus,
} from '../../database/entities/enrollment.entity';
import {
  Assignment,
  AssignmentType,
} from '../../database/entities/assignment.entity';
import { Submission } from '../../database/entities/submission.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { AnnouncementsService } from '../announcements/announcements.service';
import { ContentService } from '../content/content.service';
import { DiscussionsService } from '../discussions/discussions.service';
import {
  createMockRepository,
  createMockQueryBuilder,
  MockRepository,
} from '../../test/mocks/repository.mock';
import {
  createEnrollment,
  createCourse,
  createCourseSection,
  createAssignment,
  createSubmission,
  createInstructor,
} from '../../test/factories';

describe('FeedService', () => {
  let service: FeedService;
  let enrollmentRepo: MockRepository<Enrollment>;
  let assignmentRepo: MockRepository<Assignment>;
  let submissionRepo: MockRepository<Submission>;
  let sectionRepo: MockRepository<CourseSection>;
  let announcementsService: Partial<AnnouncementsService>;
  let contentService: Partial<ContentService>;

  // Test data
  const tenantId = 'test-tenant';
  const userId = 'student-user';
  const instructorId = 'instructor-user';

  beforeEach(async () => {
    enrollmentRepo = createMockRepository<Enrollment>();
    assignmentRepo = createMockRepository<Assignment>();
    submissionRepo = createMockRepository<Submission>();
    sectionRepo = createMockRepository<CourseSection>();

    announcementsService = {
      findRecentBySectionIds: jest.fn().mockResolvedValue([]),
      findBySectionId: jest.fn().mockResolvedValue([]),
    };

    contentService = {
      findBySectionId: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: getRepositoryToken(Enrollment), useValue: enrollmentRepo },
        { provide: getRepositoryToken(Assignment), useValue: assignmentRepo },
        { provide: getRepositoryToken(Submission), useValue: submissionRepo },
        { provide: getRepositoryToken(CourseSection), useValue: sectionRepo },
        { provide: AnnouncementsService, useValue: announcementsService },
        { provide: ContentService, useValue: contentService },
        {
          provide: DiscussionsService,
          useValue: { findBySectionId: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
  });

  describe('getStudentFeed', () => {
    it('should return empty array when student has no enrollments', async () => {
      enrollmentRepo.find!.mockResolvedValue([]);

      const result = await service.getStudentFeed(userId, tenantId);

      expect(result).toEqual([]);
      expect(assignmentRepo.find).not.toHaveBeenCalled();
    });

    it('should include upcoming deadlines in feed', async () => {
      // Setup: student enrolled in one course
      const course = createCourse({ code: 'CS101', name: 'Intro to CS' });
      const section = createCourseSection({ course });
      const enrollment = createEnrollment({
        userId,
        section,
        sectionId: section.id,
        status: EnrollmentStatus.ACTIVE,
      });
      enrollment.section = section;
      enrollment.section.course = course;

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const assignment = createAssignment({
        sectionId: section.id,
        title: 'Homework 1',
        dueAt: futureDate,
        maxPoints: 100,
      });

      enrollmentRepo.find!.mockResolvedValue([enrollment]);
      assignmentRepo.find!.mockResolvedValue([assignment]);

      // Mock submission query builder
      const queryBuilder = createMockQueryBuilder<Submission>();
      submissionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([]);

      const result = await service.getStudentFeed(userId, tenantId);

      expect(result.length).toBeGreaterThan(0);
      const deadlineItem = result.find((i) => i.type === FeedItemType.DEADLINE);
      expect(deadlineItem).toBeDefined();
      expect(deadlineItem?.title).toBe('Homework 1');
      expect(deadlineItem?.courseCode).toBe('CS101');
    });

    it('should include recent grades in feed', async () => {
      const course = createCourse({ code: 'CS101', name: 'Intro to CS' });
      const section = createCourseSection({ course });
      const enrollment = createEnrollment({
        userId,
        section,
        sectionId: section.id,
        status: EnrollmentStatus.ACTIVE,
      });
      enrollment.section = section;
      enrollment.section.course = course;

      const assignment = createAssignment({
        sectionId: section.id,
        title: 'Graded Quiz',
        maxPoints: 50,
      });

      const gradedSubmission = createSubmission({
        userId,
        assignment,
        assignmentId: assignment.id,
        score: 45,
        gradedAt: new Date(),
      });
      gradedSubmission.assignment = assignment;

      enrollmentRepo.find!.mockResolvedValue([enrollment]);
      assignmentRepo.find!.mockResolvedValue([]);

      // Mock submission query builder for grades
      const queryBuilder = createMockQueryBuilder<Submission>();
      submissionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([gradedSubmission]);

      const result = await service.getStudentFeed(userId, tenantId);

      const gradeItem = result.find(
        (i) => i.type === FeedItemType.GRADE_POSTED,
      );
      expect(gradeItem).toBeDefined();
      expect(gradeItem?.title).toBe('Graded Quiz');
      expect(gradeItem?.score).toBe(45);
      expect(gradeItem?.pointsPossible).toBe(50);
    });

    it('should return all deadline items without sorting (sorting moved to personalization)', async () => {
      const course = createCourse({ code: 'CS101' });
      const section = createCourseSection({ course });
      const enrollment = createEnrollment({
        userId,
        section,
        sectionId: section.id,
        status: EnrollmentStatus.ACTIVE,
      });
      enrollment.section = section;
      enrollment.section.course = course;

      const urgentDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const urgentAssignment = createAssignment({
        sectionId: section.id,
        title: 'Urgent Assignment',
        dueAt: urgentDate,
      });

      const laterDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const laterAssignment = createAssignment({
        sectionId: section.id,
        title: 'Later Assignment',
        dueAt: laterDate,
      });

      enrollmentRepo.find!.mockResolvedValue([enrollment]);
      assignmentRepo.find!.mockResolvedValue([
        laterAssignment,
        urgentAssignment,
      ]);

      const queryBuilder = createMockQueryBuilder<Submission>();
      submissionRepo.createQueryBuilder!.mockReturnValue(queryBuilder as any);
      queryBuilder.getMany!.mockResolvedValue([]);

      const result = await service.getStudentFeed(userId, tenantId);

      // Both deadlines should be present (sorting is now in FeedPersonalizationService)
      const deadlines = result.filter((i) => i.type === FeedItemType.DEADLINE);
      expect(deadlines).toHaveLength(2);
      expect(deadlines.map((d) => d.title)).toContain('Urgent Assignment');
      expect(deadlines.map((d) => d.title)).toContain('Later Assignment');
    });
  });

  describe('getInstructorFeed', () => {
    it('should return empty array when instructor has no sections', async () => {
      sectionRepo.find!.mockResolvedValue([]);

      const result = await service.getInstructorFeed(instructorId, tenantId);

      expect(result).toEqual([]);
    });

    it('should include ungraded submissions count', async () => {
      const course = createCourse({ code: 'CS101' });
      const section = createCourseSection({
        course,
        instructorId,
      });
      section.course = course;

      const assignment = createAssignment({
        sectionId: section.id,
        title: 'Essay',
      });

      sectionRepo.find!.mockResolvedValue([section]);

      // Mock ungraded count query
      const countQueryBuilder = createMockQueryBuilder<Submission>();
      submissionRepo.createQueryBuilder!.mockReturnValue(
        countQueryBuilder as any,
      );
      countQueryBuilder.getRawMany!.mockResolvedValue([
        { assignmentId: assignment.id, count: '5' },
      ]);

      assignmentRepo.find!.mockResolvedValue([assignment]);

      const result = await service.getInstructorFeed(instructorId, tenantId);

      const ungradedItem = result.find(
        (i) => i.type === InstructorFeedItemType.UNGRADED,
      );
      expect(ungradedItem).toBeDefined();
      expect(ungradedItem?.title).toBe('Essay');
      expect(ungradedItem?.ungradedCount).toBe(5);
      expect(ungradedItem?.subtitle).toContain('5 submissions');
    });

    it('should prioritize ungraded over deadlines', async () => {
      const course = createCourse({ code: 'CS101' });
      const section = createCourseSection({
        course,
        instructorId,
      });
      section.course = course;

      const ungradedAssignment = createAssignment({
        sectionId: section.id,
        title: 'Ungraded Essay',
      });

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const upcomingAssignment = createAssignment({
        sectionId: section.id,
        title: 'Upcoming Quiz',
        dueAt: futureDate,
      });

      sectionRepo.find!.mockResolvedValue([section]);

      const countQueryBuilder = createMockQueryBuilder<Submission>();
      submissionRepo.createQueryBuilder!.mockReturnValue(
        countQueryBuilder as any,
      );
      countQueryBuilder.getRawMany!.mockResolvedValue([
        { assignmentId: ungradedAssignment.id, count: '3' },
      ]);

      assignmentRepo.find!.mockImplementation(
        (options: Record<string, Record<string, unknown> | undefined>) => {
          // First call for ungraded assignments
          if (options?.where?.id) {
            return Promise.resolve([ungradedAssignment]);
          }
          // Second call for upcoming assignments
          return Promise.resolve([upcomingAssignment]);
        },
      );

      const result = await service.getInstructorFeed(instructorId, tenantId);

      // Ungraded should come before deadlines
      expect(result[0].type).toBe(InstructorFeedItemType.UNGRADED);
    });
  });

  describe('getSectionTimeline', () => {
    it('should combine assignments and announcements', async () => {
      const assignment = createAssignment({
        sectionId: 'section-1',
        title: 'Assignment 1',
        type: AssignmentType.ASSIGNMENT,
      });

      const announcement = {
        id: 'ann-1',
        title: 'Welcome!',
        body: 'Welcome to the course',
        sectionId: 'section-1',
        priority: 'NORMAL',
        pinned: false,
        createdAt: new Date(),
        author: { firstName: 'John', lastName: 'Doe' },
      };

      assignmentRepo.find!.mockResolvedValue([assignment]);
      submissionRepo.find!.mockResolvedValue([]);
      (announcementsService.findBySectionId as jest.Mock).mockResolvedValue([
        announcement,
      ]);

      const result = await service.getSectionTimeline(
        'section-1',
        tenantId,
        undefined,
        true,
      );

      const assignmentEntry = result.find(
        (e) => e.type === TimelineEntryType.ASSIGNMENT,
      );
      const announcementEntry = result.find(
        (e) => e.type === TimelineEntryType.ANNOUNCEMENT,
      );

      expect(assignmentEntry).toBeDefined();
      expect(announcementEntry).toBeDefined();
      expect(announcementEntry?.authorName).toBe('John Doe');
    });

    it('should include grades when userId is provided', async () => {
      const assignment = createAssignment({
        sectionId: 'section-1',
        title: 'Graded Assignment',
        maxPoints: 100,
      });

      const gradedSubmission = createSubmission({
        userId,
        assignmentId: assignment.id,
        score: 85,
        gradedAt: new Date(),
        feedback: 'Good work!',
      });

      assignmentRepo.find!.mockResolvedValue([assignment]);
      submissionRepo.find!.mockResolvedValue([gradedSubmission]);
      (announcementsService.findBySectionId as jest.Mock).mockResolvedValue([]);

      const result = await service.getSectionTimeline(
        'section-1',
        tenantId,
        userId,
        false,
      );

      const entry = result.find((e) => e.type === TimelineEntryType.ASSIGNMENT);
      expect(entry?.score).toBe(85);
      expect(entry?.feedback).toBe('Good work!');
    });

    it('should put pinned items first', async () => {
      const regularAssignment = createAssignment({
        sectionId: 'section-1',
        title: 'Regular',
      });

      const pinnedAnnouncement = {
        id: 'ann-pinned',
        title: 'Important!',
        body: 'Read this first',
        sectionId: 'section-1',
        priority: 'URGENT',
        pinned: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      };

      const recentAnnouncement = {
        id: 'ann-recent',
        title: 'Recent',
        body: 'Just posted',
        sectionId: 'section-1',
        priority: 'NORMAL',
        pinned: false,
        createdAt: new Date(),
      };

      assignmentRepo.find!.mockResolvedValue([regularAssignment]);
      submissionRepo.find!.mockResolvedValue([]);
      (announcementsService.findBySectionId as jest.Mock).mockResolvedValue([
        recentAnnouncement,
        pinnedAnnouncement,
      ]);

      const result = await service.getSectionTimeline(
        'section-1',
        tenantId,
        undefined,
        false,
      );

      // Pinned should come first regardless of date
      expect(result[0].pinned).toBe(true);
      expect(result[0].title).toBe('Important!');
    });

    it('should include content when isInstructor is true (drafts visible)', async () => {
      const content = {
        id: 'content-1',
        title: 'Lecture Notes',
        body: '<p>Notes</p>',
        publishedAt: null, // Draft
        createdAt: new Date(),
        author: { firstName: 'Prof', lastName: 'Smith' },
      };

      assignmentRepo.find!.mockResolvedValue([]);
      submissionRepo.find!.mockResolvedValue([]);
      (announcementsService.findBySectionId as jest.Mock).mockResolvedValue([]);
      (contentService.findBySectionId as jest.Mock).mockResolvedValue([
        content,
      ]);

      const result = await service.getSectionTimeline(
        'section-1',
        tenantId,
        undefined,
        true, // isInstructor
      );

      const contentEntry = result.find(
        (e) => e.type === TimelineEntryType.CONTENT,
      );
      expect(contentEntry).toBeDefined();
      expect(contentEntry?.title).toBe('Lecture Notes');
    });
  });

  describe('getStudentGrades', () => {
    it('should return empty array when student has no enrollments', async () => {
      enrollmentRepo.find!.mockResolvedValue([]);

      const result = await service.getStudentGrades(userId, tenantId);

      expect(result).toEqual([]);
    });

    it('should calculate overall percentage correctly', async () => {
      const instructor = createInstructor();
      const course = createCourse({ code: 'CS101', name: 'Intro to CS' });
      const section = createCourseSection({ course, instructor });
      section.course = course;
      section.instructor = instructor;

      const enrollment = createEnrollment({
        userId,
        section,
        sectionId: section.id,
        status: EnrollmentStatus.ACTIVE,
      });
      enrollment.section = section;

      const assignment1 = createAssignment({
        sectionId: section.id,
        title: 'Quiz 1',
        maxPoints: 100,
      });
      const assignment2 = createAssignment({
        sectionId: section.id,
        title: 'Quiz 2',
        maxPoints: 50,
      });

      const submission1 = createSubmission({
        userId,
        assignmentId: assignment1.id,
        score: 90,
        gradedAt: new Date(),
      });
      const submission2 = createSubmission({
        userId,
        assignmentId: assignment2.id,
        score: 40,
        gradedAt: new Date(),
      });

      enrollmentRepo.find!.mockResolvedValue([enrollment]);
      assignmentRepo.find!.mockResolvedValue([assignment1, assignment2]);
      submissionRepo.find!.mockResolvedValue([submission1, submission2]);

      const result = await service.getStudentGrades(userId, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].totalPointsEarned).toBe(130); // 90 + 40
      expect(result[0].totalPointsPossible).toBe(150); // 100 + 50
      expect(result[0].overallPercentage).toBeCloseTo(86.67, 1); // 130/150
    });

    it('should skip sections with no graded assignments', async () => {
      const course = createCourse({ code: 'CS101' });
      const section = createCourseSection({ course });
      section.course = course;

      const enrollment = createEnrollment({
        userId,
        section,
        sectionId: section.id,
        status: EnrollmentStatus.ACTIVE,
      });
      enrollment.section = section;

      const assignment = createAssignment({
        sectionId: section.id,
        title: 'Ungraded',
      });

      enrollmentRepo.find!.mockResolvedValue([enrollment]);
      assignmentRepo.find!.mockResolvedValue([assignment]);
      submissionRepo.find!.mockResolvedValue([]); // No graded submissions

      const result = await service.getStudentGrades(userId, tenantId);

      expect(result).toHaveLength(0);
    });
  });
});
