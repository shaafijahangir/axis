import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CsvImportService } from './csv-import.service';
import { Course } from '../../database/entities/course.entity';
import { DegreeProgram } from '../../database/entities/degree-program.entity';
import { User } from '../../database/entities/user.entity';
import { CourseSection } from '../../database/entities/course-section.entity';
import { Enrollment } from '../../database/entities/enrollment.entity';
import { AcademicTerm } from '../../database/entities/academic-term.entity';
import {
  createMockRepository,
  MockRepository,
} from '../../test/mocks/repository.mock';
import { resetIdCounter, UserRole } from '../../test/factories';

/**
 * SPRINT-5: focused tests for importUsers — gradeLevel persists to the
 * typed column for STUDENT rows, idempotency (re-import = same DB state),
 * and the all-or-nothing transaction semantic.
 */
describe('CsvImportService — importUsers', () => {
  let service: CsvImportService;
  let userRepo: MockRepository<User>;
  let savedUsers: Array<Partial<User>>;
  let existingUsers: Array<Partial<User>>;

  const tenantId = 'tenant-001';

  beforeEach(async () => {
    resetIdCounter();
    savedUsers = [];
    existingUsers = [];

    userRepo = createMockRepository<User>();

    // Stub the transactional manager so .findOne / .create / .save proxy
    // to in-memory arrays — fast, but exercises the real service logic.
    const txManager = {
      findOne: jest.fn((_entity: unknown, opts: { where: { email: string } }) =>
        Promise.resolve(
          existingUsers.find((u) => u.email === opts.where.email) ?? null,
        ),
      ),
      create: jest.fn(
        (_entity: unknown, data: Partial<User>) => ({ ...data }) as User,
      ),
      save: jest.fn((_entity: unknown, data: Partial<User>) => {
        savedUsers.push(data);
        // also mutate existingUsers so a re-run inside the same transaction
        // sees the new record (matches real DB behaviour).
        const idx = existingUsers.findIndex((u) => u.email === data.email);
        if (idx >= 0) existingUsers[idx] = { ...existingUsers[idx], ...data };
        else existingUsers.push(data);
        return Promise.resolve(data);
      }),
    };

    const dataSource = {
      transaction: jest.fn((cb: (m: typeof txManager) => unknown) =>
        Promise.resolve(cb(txManager)),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvImportService,
        {
          provide: getRepositoryToken(Course),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(DegreeProgram),
          useValue: createMockRepository(),
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(CourseSection),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Enrollment),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(AcademicTerm),
          useValue: createMockRepository(),
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(CsvImportService);
  });

  it('writes gradeLevel to the typed column only for STUDENT rows', async () => {
    const csv = [
      'email,first_name,last_name,role,password,grade_level',
      'alice@test.edu,Alice,Smith,student,pw,11',
      'bob@test.edu,Bob,Jones,instructor,pw,9', // gradeLevel must be dropped
    ].join('\n');

    const result = await service.importUsers(tenantId, csv);

    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);

    const alice = savedUsers.find((u) => u.email === 'alice@test.edu');
    const bob = savedUsers.find((u) => u.email === 'bob@test.edu');
    expect(alice?.gradeLevel).toBe(11);
    expect(bob?.gradeLevel).toBeNull(); // STUDENT-only gate
    expect(bob?.roles).toEqual([UserRole.INSTRUCTOR]);
  });

  it('is idempotent — re-importing the same CSV yields the same DB state', async () => {
    const csv = [
      'email,first_name,last_name,role,password,grade_level',
      'alice@test.edu,Alice,Smith,student,pw,11',
    ].join('\n');

    await service.importUsers(tenantId, csv);
    const afterFirst = savedUsers.length;
    expect(afterFirst).toBe(1);

    // Second import: still 1 user in the existing array (existing row found,
    // updated rather than inserted).
    savedUsers = [];
    await service.importUsers(tenantId, csv);
    expect(existingUsers).toHaveLength(1);
    expect(existingUsers[0].email).toBe('alice@test.edu');
  });

  it('returns row-level errors and writes nothing when any row is invalid', async () => {
    const csv = [
      'email,first_name,last_name,role,password,grade_level',
      'valid@test.edu,V,Alid,student,pw,10',
      ',missing-email,Last,student,pw,11', // row-level invalid
    ].join('\n');

    const result = await service.importUsers(tenantId, csv);

    expect(result.success).toBe(false);
    expect(result.imported).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].field).toBe('email');
    // Critical: even the valid row was not saved
    expect(savedUsers).toHaveLength(0);
  });

  it('rejects a CSV with no data rows', async () => {
    const csv = 'email,first_name,last_name,role';
    const result = await service.importUsers(tenantId, csv);
    expect(result.success).toBe(false);
    expect(result.errors[0].field).toBe('file');
  });

  it('updates an existing user (upsert by email) on re-import', async () => {
    existingUsers.push({
      email: 'alice@test.edu',
      firstName: 'OldFirst',
      lastName: 'Smith',
      roles: [UserRole.STUDENT],
      gradeLevel: 9,
    });

    const csv = [
      'email,first_name,last_name,role,password,grade_level',
      'alice@test.edu,NewFirst,Smith,student,pw,12',
    ].join('\n');

    const result = await service.importUsers(tenantId, csv);

    expect(result.success).toBe(true);
    const alice = existingUsers.find((u) => u.email === 'alice@test.edu');
    expect(alice?.firstName).toBe('NewFirst');
    expect(alice?.gradeLevel).toBe(12);
  });
});
