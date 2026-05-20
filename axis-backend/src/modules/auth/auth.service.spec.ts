import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../notifications/email.service';
import { EmailTemplatesService } from '../notifications/email-templates.service';
import { User } from '../../database/entities/user.entity';
import { createMockRepository } from '../../test/mocks/repository.mock';
import {
  createUser,
  createAdmin,
  UserRole,
  resetIdCounter,
} from '../../test/factories';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const tenantId = 'tenant-001';

  beforeEach(async () => {
    resetIdCounter();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
            validatePassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn() },
        },
        {
          provide: EmailService,
          useValue: { sendEmail: jest.fn() },
        },
        {
          provide: EmailTemplatesService,
          useValue: {
            passwordReset: jest
              .fn()
              .mockReturnValue({ subject: 's', html: '<p></p>' }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository<User>(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  // ============================================================================
  // register
  // ============================================================================

  describe('register', () => {
    it('creates a new user and returns an access token', async () => {
      const user = createUser({ tenantId });
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(user as any);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register({
        email: user.email,
        password: 'plaintext',
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId,
        roles: [UserRole.STUDENT],
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: user.email,
          tenantId,
          roles: [UserRole.STUDENT],
        }),
      );
      expect(result.accessToken).toBe('jwt-token');
      expect(result.user.email).toBe(user.email);
    });

    it('defaults roles to STUDENT when none provided', async () => {
      const user = createUser({ tenantId });
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(user as any);
      jwtService.sign.mockReturnValue('jwt-token');

      await service.register({
        email: user.email,
        password: 'plaintext',
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId,
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ roles: [UserRole.STUDENT] }),
      );
    });

    it('throws ConflictException when email already exists', async () => {
      const existing = createUser({ tenantId });
      usersService.findByEmail.mockResolvedValue(existing as any);

      await expect(
        service.register({
          email: existing.email,
          password: 'plaintext',
          firstName: 'New',
          lastName: 'User',
          tenantId,
        }),
      ).rejects.toThrow(ConflictException);

      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('includes tenantId in the JWT payload', async () => {
      const user = createUser({ tenantId });
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue(user as any);
      jwtService.sign.mockReturnValue('jwt-token');

      await service.register({
        email: user.email,
        password: 'pass',
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId,
      });

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId }),
      );
    });
  });

  // ============================================================================
  // validateUser
  // ============================================================================

  describe('validateUser', () => {
    it('returns user data when credentials are valid', async () => {
      const user = createUser({ tenantId });
      usersService.findByEmail.mockResolvedValue(user as any);
      usersService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser(user.email, 'correct-password');

      expect(result).toMatchObject({
        id: user.id,
        email: user.email,
        tenantId,
      });
    });

    it('returns null when user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('ghost@test.com', 'any');

      expect(result).toBeNull();
      expect(usersService.validatePassword).not.toHaveBeenCalled();
    });

    it('returns null when password is wrong', async () => {
      const user = createUser({ tenantId });
      usersService.findByEmail.mockResolvedValue(user as any);
      usersService.validatePassword.mockResolvedValue(false);

      const result = await service.validateUser(user.email, 'wrong-password');

      expect(result).toBeNull();
    });

    it('does not leak which field was wrong (timing-safe: both return null)', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const noUser = await service.validateUser('none@test.com', 'pass');

      const user = createUser({ tenantId });
      usersService.findByEmail.mockResolvedValue(user as any);
      usersService.validatePassword.mockResolvedValue(false);
      const badPass = await service.validateUser(user.email, 'wrong');

      expect(noUser).toBeNull();
      expect(badPass).toBeNull();
    });

    it('includes all required fields for JWT generation', async () => {
      const admin = createAdmin({ tenantId });
      usersService.findByEmail.mockResolvedValue(admin as any);
      usersService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser(admin.email, 'pass');

      expect(result).toMatchObject({
        id: expect.any(String),
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        tenantId,
        roles: [UserRole.ADMIN],
      });
    });
  });

  // ============================================================================
  // login
  // ============================================================================

  describe('login', () => {
    it('generates a JWT and returns user data', () => {
      const user = createUser({ tenantId });
      jwtService.sign.mockReturnValue('login-token');

      const result = service.login(user as any);

      expect(result.accessToken).toBe('login-token');
      expect(result.user).toMatchObject({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    });

    it('puts sub, email, tenantId, and roles into JWT payload', () => {
      const user = createAdmin({ tenantId });
      jwtService.sign.mockReturnValue('admin-token');

      service.login(user as any);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        tenantId,
        roles: [UserRole.ADMIN],
      });
    });

    it('does not include passwordHash in the response', () => {
      const user = createUser({ tenantId, passwordHash: 'secret-hash' });
      jwtService.sign.mockReturnValue('token');

      const result = service.login(user as any);

      expect(JSON.stringify(result)).not.toContain('secret-hash');
      expect(JSON.stringify(result)).not.toContain('passwordHash');
    });
  });
});
