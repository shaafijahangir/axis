import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlannerService, parseCatalogYear } from './planner.service';
import { meetsMinGrade } from './grade-scale';
import {
  DegreeProgram,
  RequirementGroup,
} from '../../database/entities/degree-program.entity';
import { StudentDegreeProfile } from '../../database/entities/student-degree-profile.entity';
import { Course } from '../../database/entities/course.entity';
import {
  createMockRepository,
  MockRepository,
} from '../../test/mocks/repository.mock';

describe('PlannerService.calculateProgress', () => {
  let service: PlannerService;
  let programRepo: MockRepository<DegreeProgram>;
  let profileRepo: MockRepository<StudentDegreeProfile>;
  let courseRepo: MockRepository<Course>;

  const tenantId = 'tenant-1';
  const course = (id: string, credits = 1.5) =>
    ({ id, code: id, title: id, credits }) as unknown as Course;

  const setup = (
    requirements: RequirementGroup[],
    completed: { courseId: string; grade: string | null }[],
    totalCreditsRequired: number,
    courses: Course[],
  ) => {
    profileRepo.findOne!.mockResolvedValue({
      id: 'p1',
      tenantId,
      completedCourseIds: completed.map((c) => c.courseId),
      completedCourses: completed,
      currentCourseIds: [],
      degreeProgram: { requirements, totalCreditsRequired },
    });
    courseRepo.find!.mockResolvedValue(courses);
  };

  beforeEach(async () => {
    programRepo = createMockRepository<DegreeProgram>();
    profileRepo = createMockRepository<StudentDegreeProfile>();
    courseRepo = createMockRepository<Course>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannerService,
        { provide: getRepositoryToken(DegreeProgram), useValue: programRepo },
        {
          provide: getRepositoryToken(StudentDegreeProfile),
          useValue: profileRepo,
        },
        { provide: getRepositoryToken(Course), useValue: courseRepo },
      ],
    }).compile();
    service = module.get(PlannerService);
  });

  it('sums 1.5-unit courses as decimals', async () => {
    setup(
      [
        {
          name: 'Core',
          type: 'core',
          creditsRequired: 4.5,
          courseIds: ['a', 'b', 'c'],
          minCoursesRequired: 3,
        },
      ],
      [
        { courseId: 'a', grade: 'A' },
        { courseId: 'b', grade: 'B' },
      ],
      4.5,
      [course('a'), course('b')],
    );
    const p = await service.calculateProgress('p1', tenantId);
    expect(p.requirementProgress[0].creditsCompleted).toBe(3);
    expect(p.totalCreditsCompleted).toBe(3);
    expect(p.creditsRemaining).toBe(1.5);
    expect(p.overallPercentage).toBe(66.7);
  });

  it('keeps the percentage below 100 while a group is unmet, capping surplus', async () => {
    setup(
      [
        {
          name: 'Core',
          type: 'core',
          creditsRequired: 3,
          courseIds: ['core1', 'core2'],
          minCoursesRequired: 2,
        },
        {
          name: 'Electives',
          type: 'elective',
          creditsRequired: 3,
          courseIds: ['e1', 'e2', 'e3', 'e4'],
          minCoursesRequired: 0,
        },
      ],
      ['e1', 'e2', 'e3', 'e4'].map((courseId) => ({ courseId, grade: 'A' })),
      6,
      ['e1', 'e2', 'e3', 'e4'].map((id) => course(id)),
    );
    const p = await service.calculateProgress('p1', tenantId);
    // Raw credits are 6 of 6, but only 3 of the 6 group units are met
    expect(p.totalCreditsCompleted).toBe(6);
    expect(p.countedCredits).toBe(3);
    expect(p.extraCredits).toBe(3);
    expect(p.overallPercentage).toBe(50);
    expect(p.creditsRemaining).toBe(3);
    // minCoursesRequired 0 uses credits, not "all 4 courses"
    expect(p.requirementProgress[1].coursesRequired).toBe(0);
    expect(p.requirementProgress[1].fulfilled).toBe(true);
    expect(p.requirementProgress[0].fulfilled).toBe(false);
  });

  it('treats 0 courses and 0 credits as "all listed courses"', async () => {
    setup(
      [
        {
          name: 'Legacy',
          type: 'core',
          creditsRequired: 0,
          courseIds: ['a', 'b'],
          minCoursesRequired: 0,
        },
      ],
      [{ courseId: 'a', grade: 'A' }],
      3,
      ['a', 'b'].map((id) => course(id)),
    );
    const p = await service.calculateProgress('p1', tenantId);
    expect(p.requirementProgress[0].coursesRequired).toBe(2);
    expect(p.requirementProgress[0].fulfilled).toBe(false);
  });

  it('excludes a D from a group with minGrade C and counts COM', async () => {
    setup(
      [
        {
          name: 'Y3',
          type: 'concentration',
          creditsRequired: 4.5,
          courseIds: ['x', 'y', 'z'],
          minCoursesRequired: 3,
          minGrade: 'C',
        },
      ],
      [
        { courseId: 'x', grade: 'D' },
        { courseId: 'y', grade: 'COM' },
        { courseId: 'z', grade: 'C' },
      ],
      4.5,
      [course('x'), course('y'), course('z')],
    );
    const p = await service.calculateProgress('p1', tenantId);
    const g = p.requirementProgress[0];
    expect(g.completedCourseIds).toEqual(['y', 'z']);
    expect(g.remainingCourseIds).toEqual(['x']);
    expect(g.coursesCompleted).toBe(2);
    expect(g.creditsCompleted).toBe(3);
    expect(g.fulfilled).toBe(false);
  });

  it('counts legacy profiles with no grades recorded', async () => {
    profileRepo.findOne!.mockResolvedValue({
      id: 'p1',
      tenantId,
      completedCourseIds: ['x'],
      currentCourseIds: [],
      degreeProgram: {
        totalCreditsRequired: 1.5,
        requirements: [
          {
            name: 'G',
            type: 'core',
            creditsRequired: 1.5,
            courseIds: ['x'],
            minCoursesRequired: 1,
            minGrade: 'C',
          },
        ],
      },
    });
    courseRepo.find!.mockResolvedValue([course('x')]);
    const p = await service.calculateProgress('p1', tenantId);
    expect(p.requirementProgress[0].fulfilled).toBe(true);
    expect(p.overallPercentage).toBe(100);
  });
});

describe('PlannerService catalog year versioning', () => {
  let service: PlannerService;
  let programRepo: MockRepository<DegreeProgram>;
  let profileRepo: MockRepository<StudentDegreeProfile>;
  let courseRepo: MockRepository<Course>;
  const tenantId = 'tenant-1';
  const prog = (id: string, catalogYear: string | null) =>
    ({
      id,
      code: 'CSC',
      catalogYear,
      requirements: [],
      totalCreditsRequired: 60,
    }) as unknown as DegreeProgram;

  beforeEach(async () => {
    programRepo = createMockRepository<DegreeProgram>();
    profileRepo = createMockRepository<StudentDegreeProfile>();
    courseRepo = createMockRepository<Course>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannerService,
        { provide: getRepositoryToken(DegreeProgram), useValue: programRepo },
        {
          provide: getRepositoryToken(StudentDegreeProfile),
          useValue: profileRepo,
        },
        { provide: getRepositoryToken(Course), useValue: courseRepo },
      ],
    }).compile();
    service = module.get(PlannerService);
    programRepo.find!.mockResolvedValue([
      prog('v2018', '2018-2019'),
      prog('v2022', '2022'),
      prog('v2026', '2026-2027'),
    ]);
  });

  it('parses the leading year', () => {
    expect(parseCatalogYear('2026-2027')).toBe(2026);
    expect(parseCatalogYear('2020')).toBe(2020);
    expect(parseCatalogYear(null)).toBeNull();
    expect(parseCatalogYear('fall')).toBeNull();
  });

  it('picks the exact catalog year', async () => {
    const v = await service.resolveProgramVersion(
      tenantId,
      prog('v2026', '2026'),
      2022,
    );
    expect(v.id).toBe('v2022');
  });

  it('falls back to the latest version at or before the year', async () => {
    const v = await service.resolveProgramVersion(
      tenantId,
      prog('v2026', '2026'),
      2020,
    );
    expect(v.id).toBe('v2018');
  });

  it('falls back to the latest version when none is at or before', async () => {
    const v = await service.resolveProgramVersion(
      tenantId,
      prog('v2026', '2026'),
      2015,
    );
    expect(v.id).toBe('v2026');
  });

  it('prefers an ACTIVE version over a closer non-active one', async () => {
    programRepo.find!.mockResolvedValue([
      { ...prog('v2018', '2018'), status: 'active' },
      { ...prog('v2022', '2022'), status: 'draft' },
    ]);
    const v = await service.resolveProgramVersion(
      tenantId,
      prog('v2022', '2022'),
      2022,
    );
    expect(v.id).toBe('v2018');
  });

  it('uses non-active versions when none is active', async () => {
    programRepo.find!.mockResolvedValue([
      { ...prog('v2018', '2018'), status: 'draft' },
      { ...prog('v2022', '2022'), status: 'archived' },
    ]);
    const v = await service.resolveProgramVersion(
      tenantId,
      prog('v2022', '2022'),
      2022,
    );
    expect(v.id).toBe('v2022');
  });

  it('creates a profile on the version for the entry year', async () => {
    programRepo.findOne!.mockResolvedValue(prog('v2026', '2026-2027'));
    profileRepo.create!.mockImplementation((x: unknown) => x as never);
    profileRepo.save!.mockImplementation((x: unknown) =>
      Promise.resolve(x as never),
    );
    const saved = await service.createStudentProfile(tenantId, {
      userId: 'u1',
      degreeProgramId: 'v2026',
      enrollmentYear: 2023,
    });
    expect(saved.degreeProgramId).toBe('v2022');
  });

  it('flags progress when the rule year differs from the entry year', async () => {
    profileRepo.findOne!.mockResolvedValue({
      id: 'p1',
      enrollmentYear: 2020,
      catalogYear: null,
      completedCourseIds: [],
      currentCourseIds: [],
      degreeProgram: prog('v2026', '2026-2027'),
    });
    const p = await service.calculateProgress('p1', tenantId);
    expect(p.ruleYear).toBe(2026);
    expect(p.entryYear).toBe(2020);
    expect(p.catalogFallback).toBe(true);
    expect(p.catalogNotice).toContain('2020');
  });

  it('does not flag when the exact year is applied', async () => {
    profileRepo.findOne!.mockResolvedValue({
      id: 'p1',
      enrollmentYear: 2026,
      catalogYear: null,
      completedCourseIds: [],
      currentCourseIds: [],
      degreeProgram: prog('v2026', '2026-2027'),
    });
    const p = await service.calculateProgress('p1', tenantId);
    expect(p.catalogFallback).toBe(false);
    expect(p.catalogNotice).toBeNull();
  });
});

describe('meetsMinGrade', () => {
  it('orders the UVic letter scale', () => {
    expect(meetsMinGrade('C', 'C')).toBe(true);
    expect(meetsMinGrade('C+', 'C')).toBe(true);
    expect(meetsMinGrade('D', 'C')).toBe(false);
    expect(meetsMinGrade('F', 'D')).toBe(false);
    expect(meetsMinGrade('A+', 'A')).toBe(true);
  });

  it('treats COM and CR as a pass', () => {
    expect(meetsMinGrade('COM', 'A+')).toBe(true);
    expect(meetsMinGrade('CR', 'C')).toBe(true);
  });

  it('allows anything when no minimum is set', () => {
    expect(meetsMinGrade('D', null)).toBe(true);
  });
});
