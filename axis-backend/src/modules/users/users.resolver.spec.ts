import { Test, TestingModule } from '@nestjs/testing';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { User } from '../../database/entities';

/**
 * FEAT-021: directory fields — resolve fields read from profile JSONB;
 * updateProfile merges dedicated inputs instead of replacing the blob.
 */
describe('UsersResolver', () => {
  let resolver: UsersResolver;
  let usersService: { findById: jest.Mock; update: jest.Mock };

  const me = {
    id: 'user-001',
    tenantId: 'tenant-001',
    profile: { bio: 'CS prof', title: 'Associate Professor' },
  } as unknown as User;

  beforeEach(async () => {
    usersService = {
      findById: jest.fn().mockResolvedValue(me),
      update: jest
        .fn()
        .mockImplementation((_id, _tenant, data) =>
          Promise.resolve({ ...me, ...data }),
        ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersResolver,
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    resolver = module.get(UsersResolver);
  });

  describe('directory resolve fields', () => {
    it('reads title and officeLocation from profile JSONB', () => {
      const user = {
        profile: { title: 'Professor', officeLocation: 'ECS 618' },
      } as unknown as User;
      expect(resolver.title(user)).toBe('Professor');
      expect(resolver.officeLocation(user)).toBe('ECS 618');
    });

    it('returns null when profile is missing or fields are not strings', () => {
      expect(resolver.title({ profile: null } as unknown as User)).toBeNull();
      expect(
        resolver.officeLocation({
          profile: { officeLocation: 42 },
        } as unknown as User),
      ).toBeNull();
    });
  });

  describe('updateProfile directory merge', () => {
    it('merges officeLocation into the existing profile without dropping other keys', async () => {
      await resolver.updateProfile(me, { officeLocation: 'ECS 620' });

      expect(usersService.update).toHaveBeenCalledWith(
        'user-001',
        'tenant-001',
        expect.objectContaining({
          profile: {
            bio: 'CS prof',
            title: 'Associate Professor',
            officeLocation: 'ECS 620',
          },
        }),
      );
    });

    it('does not touch profile when no directory fields are provided', async () => {
      await resolver.updateProfile(me, { firstName: 'Sarah' });

      const calls = usersService.update.mock.calls as [
        string,
        string,
        Partial<User>,
      ][];
      expect(calls[0][2].profile).toBeUndefined();
      expect(calls[0][2].firstName).toBe('Sarah');
    });
  });
});
