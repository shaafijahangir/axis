import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
  setupQueryBuilder,
  MockRepository,
} from '../../test/mocks/repository.mock';
import {
  createUser,
  UserRole,
  UserStatus,
  resetIdCounter,
} from '../../test/factories';

describe('UsersService', () => {
  let service: UsersService;
  let repo: MockRepository<User>;

  const tenantId = 'tenant-001';

  beforeEach(async () => {
    resetIdCounter();
    repo = createMockRepository<User>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ============================================================================
  // findById
  // ============================================================================

  describe('findById', () => {
    it('returns user when found within tenant', async () => {
      const user = createUser({ tenantId });
      (repo.findOne as jest.Mock).mockResolvedValue(user);

      const result = await service.findById(user.id, tenantId);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: user.id, tenantId },
      });
      expect(result).toEqual(user);
    });

    it('returns null when user does not exist', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findById('non-existent', tenantId);

      expect(result).toBeNull();
    });

    it('scopes query to tenantId when provided', async () => {
      const user = createUser({ tenantId });
      (repo.findOne as jest.Mock).mockResolvedValue(user);

      await service.findById(user.id, tenantId);

      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });

    it('omits tenantId from where clause when not provided (auth use-case)', async () => {
      const user = createUser({ tenantId });
      (repo.findOne as jest.Mock).mockResolvedValue(user);

      await service.findById(user.id);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: user.id } });
    });
  });

  // ============================================================================
  // findByEmail
  // ============================================================================

  describe('findByEmail', () => {
    it('returns user when email matches in tenant', async () => {
      const user = createUser({ tenantId, email: 'alice@test.edu' });
      (repo.findOne as jest.Mock).mockResolvedValue(user);

      const result = await service.findByEmail('alice@test.edu', tenantId);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'alice@test.edu', tenantId },
      });
      expect(result).toEqual(user);
    });

    it('returns null when email is not found', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findByEmail('nobody@test.edu', tenantId);

      expect(result).toBeNull();
    });

    it('allows cross-tenant email lookup when tenantId omitted (legacy auth)', async () => {
      const user = createUser({ tenantId });
      (repo.findOne as jest.Mock).mockResolvedValue(user);

      await service.findByEmail(user.email);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: user.email },
      });
    });
  });

  // ============================================================================
  // create
  // ============================================================================

  describe('create', () => {
    it('hashes the password before saving', async () => {
      const user = createUser({ tenantId });
      (repo.create as jest.Mock).mockReturnValue(user);
      (repo.save as jest.Mock).mockResolvedValue(user);

      await service.create({
        email: user.email,
        passwordHash: 'plaintext-password',
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId,
      });

      const createCall = (repo.create as jest.Mock).mock.calls[0][0];
      expect(createCall.passwordHash).not.toBe('plaintext-password');
      expect(createCall.passwordHash).toMatch(/^\$2b\$/);
    });

    it('saves and returns the created user', async () => {
      const user = createUser({ tenantId });
      (repo.create as jest.Mock).mockReturnValue(user);
      (repo.save as jest.Mock).mockResolvedValue(user);

      const result = await service.create({
        email: user.email,
        passwordHash: 'pass',
        tenantId,
      });

      expect(repo.save).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });
  });

  // ============================================================================
  // adminCreate
  // ============================================================================

  describe('adminCreate', () => {
    it('creates user with hashed password under the given tenant', async () => {
      const user = createUser({ tenantId });
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      (repo.create as jest.Mock).mockReturnValue(user);
      (repo.save as jest.Mock).mockResolvedValue(user);

      const result = await service.adminCreate(tenantId, {
        email: 'new@test.edu',
        password: 'plaintext',
        firstName: 'New',
        lastName: 'User',
        roles: [UserRole.STUDENT],
      });

      expect(repo.save).toHaveBeenCalled();
      expect(result).toEqual(user);
    });

    it('throws ConflictException when email already exists in tenant', async () => {
      const existing = createUser({ tenantId });
      (repo.findOne as jest.Mock).mockResolvedValue(existing);

      await expect(
        service.adminCreate(tenantId, {
          email: existing.email,
          password: 'pass',
          firstName: 'Dup',
          lastName: 'User',
          roles: [UserRole.STUDENT],
        }),
      ).rejects.toThrow(ConflictException);

      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // adminUpdate
  // ============================================================================

  describe('adminUpdate', () => {
    it('updates allowed fields and returns updated user', async () => {
      const user = createUser({ tenantId });
      const updated = { ...user, firstName: 'Updated' };
      (repo.findOne as jest.Mock).mockResolvedValue(user);
      (repo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (repo.findOneOrFail as jest.Mock).mockResolvedValue(updated);

      const result = await service.adminUpdate(user.id, tenantId, {
        firstName: 'Updated',
      });

      expect(repo.update).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({ firstName: 'Updated' }),
      );
      expect(result.firstName).toBe('Updated');
    });

    it('throws NotFoundException when user not found in tenant', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.adminUpdate('bad-id', tenantId, { firstName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when new email already taken within tenant', async () => {
      const user = createUser({ tenantId, email: 'orig@test.edu' });
      const collision = createUser({ tenantId, email: 'taken@test.edu' });

      (repo.findOne as jest.Mock)
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce(collision);

      await expect(
        service.adminUpdate(user.id, tenantId, { email: 'taken@test.edu' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ============================================================================
  // deactivate / activate
  // ============================================================================

  describe('deactivate', () => {
    it('sets status to INACTIVE', async () => {
      const user = createUser({ tenantId, status: UserStatus.ACTIVE });
      const deactivated = { ...user, status: UserStatus.INACTIVE };
      (repo.findOne as jest.Mock).mockResolvedValue(user);
      (repo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (repo.findOneOrFail as jest.Mock).mockResolvedValue(deactivated);

      const result = await service.deactivate(user.id, tenantId);

      expect(repo.update).toHaveBeenCalledWith(user.id, {
        status: UserStatus.INACTIVE,
      });
      expect(result.status).toBe(UserStatus.INACTIVE);
    });

    it('throws NotFoundException when user not found in tenant', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.deactivate('bad-id', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user is already inactive', async () => {
      const user = createUser({ tenantId, status: UserStatus.INACTIVE });
      (repo.findOne as jest.Mock).mockResolvedValue(user);

      await expect(service.deactivate(user.id, tenantId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('activate', () => {
    it('sets status to ACTIVE', async () => {
      const user = createUser({ tenantId, status: UserStatus.INACTIVE });
      const activated = { ...user, status: UserStatus.ACTIVE };
      (repo.findOne as jest.Mock).mockResolvedValue(user);
      (repo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (repo.findOneOrFail as jest.Mock).mockResolvedValue(activated);

      const result = await service.activate(user.id, tenantId);

      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it('throws ForbiddenException when user is already active', async () => {
      const user = createUser({ tenantId, status: UserStatus.ACTIVE });
      (repo.findOne as jest.Mock).mockResolvedValue(user);

      await expect(service.activate(user.id, tenantId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ============================================================================
  // validatePassword
  // ============================================================================

  describe('validatePassword', () => {
    it('returns true for matching password', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bcrypt = require('bcrypt') as typeof import('bcrypt');
      const hash = await bcrypt.hash('correct', 10);

      const result = await service.validatePassword('correct', hash);

      expect(result).toBe(true);
    });

    it('returns false for wrong password', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const bcrypt = require('bcrypt') as typeof import('bcrypt');
      const hash = await bcrypt.hash('correct', 10);

      const result = await service.validatePassword('wrong', hash);

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // findAllForTenant
  // ============================================================================

  describe('findAllForTenant', () => {
    it('returns paginated users scoped to tenant', async () => {
      const users = [createUser({ tenantId }), createUser({ tenantId })];
      const qb = createMockQueryBuilder<User>();
      setupQueryBuilder(repo, qb);
      (qb.getManyAndCount as jest.Mock).mockResolvedValue([users, 2]);

      const result = await service.findAllForTenant(tenantId);

      expect(result.users).toEqual(users);
      expect(result.totalCount).toBe(2);
      expect(qb.where).toHaveBeenCalledWith('user.tenantId = :tenantId', {
        tenantId,
      });
    });

    it('applies search filter when provided', async () => {
      const users = [createUser({ tenantId })];
      const qb = createMockQueryBuilder<User>();
      setupQueryBuilder(repo, qb);
      (qb.getManyAndCount as jest.Mock).mockResolvedValue([users, 1]);

      await service.findAllForTenant(tenantId, {
        search: 'alice',
        page: 1,
        pageSize: 20,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ search: '%alice%' }),
      );
    });

    it('defaults to page 1 with pageSize 20', async () => {
      const qb = createMockQueryBuilder<User>();
      setupQueryBuilder(repo, qb);
      (qb.getManyAndCount as jest.Mock).mockResolvedValue([[], 0]);

      const result = await service.findAllForTenant(tenantId);

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  // ============================================================================
  // SPRINT-3: K-12 student fields validation
  // ============================================================================

  describe('adminCreate — K-12 field validation', () => {
    const baseInput = {
      email: 'k12@test.edu',
      password: 'password1!',
      firstName: 'K12',
      lastName: 'User',
    };

    it('persists gradeLevel + homeroomTeacherId on STUDENT', async () => {
      const teacher = createUser({
        tenantId,
        id: 'teacher-1',
        roles: [UserRole.INSTRUCTOR],
      });
      const student = createUser({ tenantId, roles: [UserRole.STUDENT] });
      // First findOne (email uniqueness) → null; second (teacher lookup) → teacher
      (repo.findOne as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(teacher);
      (repo.create as jest.Mock).mockReturnValue(student);
      (repo.save as jest.Mock).mockResolvedValue(student);

      await service.adminCreate(tenantId, {
        ...baseInput,
        roles: [UserRole.STUDENT],
        gradeLevel: 11,
        homeroomTeacherId: 'teacher-1',
      });

      const createCall = (repo.create as jest.Mock).mock.calls[0][0];
      expect(createCall.gradeLevel).toBe(11);
      expect(createCall.homeroomTeacherId).toBe('teacher-1');
    });

    it('rejects gradeLevel on a non-student account', async () => {
      (repo.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.adminCreate(tenantId, {
          ...baseInput,
          roles: [UserRole.INSTRUCTOR],
          gradeLevel: 11,
        }),
      ).rejects.toThrow(/can only be set on student/i);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects homeroomTeacherId on a non-student account', async () => {
      (repo.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        service.adminCreate(tenantId, {
          ...baseInput,
          roles: [UserRole.ADMIN],
          homeroomTeacherId: 'teacher-1',
        }),
      ).rejects.toThrow(/can only be set on student/i);
    });

    it('rejects homeroomTeacherId that does not exist in tenant', async () => {
      (repo.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // email uniqueness OK
        .mockResolvedValueOnce(null); // homeroom lookup fails

      await expect(
        service.adminCreate(tenantId, {
          ...baseInput,
          roles: [UserRole.STUDENT],
          homeroomTeacherId: 'ghost-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects homeroomTeacherId pointing to a non-instructor', async () => {
      const otherStudent = createUser({
        tenantId,
        id: 'student-2',
        roles: [UserRole.STUDENT],
      });
      (repo.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // email uniqueness OK
        .mockResolvedValueOnce(otherStudent); // homeroom = a student

      await expect(
        service.adminCreate(tenantId, {
          ...baseInput,
          roles: [UserRole.STUDENT],
          homeroomTeacherId: 'student-2',
        }),
      ).rejects.toThrow(/must have the INSTRUCTOR role/i);
    });
  });

  describe('adminUpdate — K-12 validation on merged role list', () => {
    it('rejects gradeLevel when role patch removes STUDENT', async () => {
      const existing = createUser({
        tenantId,
        roles: [UserRole.STUDENT],
      });
      (existing as unknown as Record<string, unknown>).gradeLevel = 10;
      (repo.findOne as jest.Mock).mockResolvedValue(existing);

      await expect(
        service.adminUpdate(existing.id, tenantId, {
          roles: [UserRole.INSTRUCTOR],
          // gradeLevel left in place — merged state would be gradeLevel on a non-student
        }),
      ).rejects.toThrow(/can only be set on student/i);
    });

    it('allows clearing gradeLevel + homeroom when role patch removes STUDENT', async () => {
      const existing = createUser({
        tenantId,
        roles: [UserRole.STUDENT],
      });
      (repo.findOne as jest.Mock).mockResolvedValue(existing);
      (repo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      (repo.findOneOrFail as jest.Mock).mockResolvedValue(existing);

      await expect(
        service.adminUpdate(existing.id, tenantId, {
          roles: [UserRole.INSTRUCTOR],
          gradeLevel: null,
          homeroomTeacherId: null,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('findAllForTenant — gradeLevel filter', () => {
    it('adds gradeLevel WHERE clause when filter set', async () => {
      const qb = createMockQueryBuilder<User>();
      setupQueryBuilder(repo, qb);
      (qb.getManyAndCount as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAllForTenant(tenantId, { gradeLevel: 11 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'user.gradeLevel = :gradeLevel',
        { gradeLevel: 11 },
      );
    });

    it('does not filter on gradeLevel when not provided', async () => {
      const qb = createMockQueryBuilder<User>();
      setupQueryBuilder(repo, qb);
      (qb.getManyAndCount as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAllForTenant(tenantId);

      const calls = (qb.andWhere as jest.Mock).mock.calls;
      const gradeCalls = calls.filter((c) =>
        String(c[0]).includes('gradeLevel'),
      );
      expect(gradeCalls).toHaveLength(0);
    });
  });
});
