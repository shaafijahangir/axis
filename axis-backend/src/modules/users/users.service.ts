import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../../database/entities';
import * as bcrypt from 'bcrypt';
import { clampPage, clampPageSize } from '../../common/pagination';
import {
  AdminCreateUserInput,
  AdminUpdateUserInput,
  UsersFilterInput,
  PaginatedUsersResponse,
} from './dto/admin-user.types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Find user by ID with tenant scoping.
   * @param id - User ID
   * @param tenantId - Optional tenant ID for security scoping. When provided,
   *                   ensures the user belongs to the specified tenant.
   *                   Should ALWAYS be provided except in auth token validation
   *                   where the tenantId comes from the JWT itself.
   */
  async findById(id: string, tenantId?: string): Promise<User | null> {
    const where: { id: string; tenantId?: string } = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    return this.usersRepository.findOne({ where });
  }

  /**
   * Find user by email within a tenant.
   * @param email - User email
   * @param tenantId - Optional tenant ID. When provided, scopes lookup to that tenant.
   *                   Without it, returns the first matching user (legacy behavior for auth).
   */
  async findByEmail(email: string, tenantId?: string): Promise<User | null> {
    const where: { email: string; tenantId?: string } = { email };
    if (tenantId) {
      where.tenantId = tenantId;
    }
    return this.usersRepository.findOne({ where });
  }

  async create(userData: Partial<User>): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.passwordHash!, 10);

    const user = this.usersRepository.create({
      ...userData,
      passwordHash: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async update(
    id: string,
    tenantId: string,
    userData: Partial<User>,
  ): Promise<User | null> {
    // First verify the user belongs to this tenant
    const user = await this.findById(id, tenantId);
    if (!user) {
      throw new NotFoundException('User not found in this institution');
    }
    await this.usersRepository.update(id, userData);
    return this.findById(id, tenantId);
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // --- Admin methods ---

  async findAllForTenant(
    tenantId: string,
    filter?: UsersFilterInput,
  ): Promise<PaginatedUsersResponse> {
    const page = clampPage(filter?.page);
    const pageSize = clampPageSize(filter?.pageSize);
    const offset = (page - 1) * pageSize;

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .where('user.tenantId = :tenantId', { tenantId });

    if (filter?.search) {
      qb.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filter.search}%` },
      );
    }

    if (filter?.role) {
      // PostgreSQL array contains operator
      qb.andWhere(':role = ANY(user.roles)', { role: filter.role });
    }

    if (filter?.status) {
      qb.andWhere('user.status = :status', { status: filter.status });
    }

    if (filter?.gradeLevel != null) {
      qb.andWhere('user.gradeLevel = :gradeLevel', {
        gradeLevel: filter.gradeLevel,
      });
    }

    qb.orderBy('user.createdAt', 'DESC').skip(offset).take(pageSize);

    const [users, totalCount] = await qb.getManyAndCount();

    return { users, totalCount, page, pageSize };
  }

  async countForTenant(tenantId: string): Promise<number> {
    return this.usersRepository.count({ where: { tenantId } });
  }

  /**
   * SPRINT-3: Validate the K-12 fields against the user's role list.
   *  - gradeLevel only allowed when roles includes STUDENT
   *  - homeroomTeacherId must point to an INSTRUCTOR in the same tenant
   *
   * Called from adminCreate and adminUpdate before persisting.
   */
  private async validateK12Fields(
    tenantId: string,
    roles: UserRole[],
    gradeLevel: number | null | undefined,
    homeroomTeacherId: string | null | undefined,
  ): Promise<void> {
    const isStudent = roles.includes(UserRole.STUDENT);

    if (gradeLevel != null && !isStudent) {
      throw new BadRequestException(
        'Grade level can only be set on student accounts',
      );
    }
    if (homeroomTeacherId != null && !isStudent) {
      throw new BadRequestException(
        'Homeroom teacher can only be set on student accounts',
      );
    }

    if (homeroomTeacherId != null) {
      const teacher = await this.usersRepository.findOne({
        where: { id: homeroomTeacherId, tenantId },
      });
      if (!teacher) {
        throw new NotFoundException(
          'Homeroom teacher not found in this institution',
        );
      }
      if (!teacher.roles.includes(UserRole.INSTRUCTOR)) {
        throw new BadRequestException(
          'Homeroom teacher must have the INSTRUCTOR role',
        );
      }
    }
  }

  async adminCreate(
    tenantId: string,
    input: AdminCreateUserInput,
  ): Promise<User> {
    // Check email uniqueness within tenant
    const existing = await this.usersRepository.findOne({
      where: { email: input.email, tenantId },
    });
    if (existing) {
      throw new ConflictException(
        'A user with this email already exists in this institution',
      );
    }

    await this.validateK12Fields(
      tenantId,
      input.roles,
      input.gradeLevel ?? null,
      input.homeroomTeacherId ?? null,
    );

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = this.usersRepository.create({
      tenantId,
      email: input.email,
      passwordHash: hashedPassword,
      firstName: input.firstName,
      lastName: input.lastName,
      roles: input.roles,
      status: UserStatus.ACTIVE,
      gradeLevel: input.gradeLevel ?? null,
      homeroomTeacherId: input.homeroomTeacherId ?? null,
    });

    return this.usersRepository.save(user);
  }

  async adminUpdate(
    id: string,
    tenantId: string,
    input: AdminUpdateUserInput,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, tenantId },
    });
    if (!user) {
      throw new NotFoundException('User not found in this institution');
    }

    // If email is being changed, check uniqueness within tenant
    if (input.email && input.email !== user.email) {
      const existing = await this.usersRepository.findOne({
        where: { email: input.email, tenantId },
      });
      if (existing) {
        throw new ConflictException(
          'A user with this email already exists in this institution',
        );
      }
    }

    // SPRINT-3: validate against the merged role list — incoming roles
    // patch wins, otherwise the user's current roles.
    const mergedRoles = input.roles ?? user.roles;
    const mergedGradeLevel =
      input.gradeLevel !== undefined ? input.gradeLevel : user.gradeLevel;
    const mergedHomeroom =
      input.homeroomTeacherId !== undefined
        ? input.homeroomTeacherId
        : user.homeroomTeacherId;
    await this.validateK12Fields(
      tenantId,
      mergedRoles,
      mergedGradeLevel,
      mergedHomeroom,
    );

    const updateData: Partial<User> = {};
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.roles !== undefined) updateData.roles = input.roles;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.gradeLevel !== undefined)
      updateData.gradeLevel = input.gradeLevel;
    if (input.homeroomTeacherId !== undefined)
      updateData.homeroomTeacherId = input.homeroomTeacherId;

    await this.usersRepository.update(id, updateData);
    return this.usersRepository.findOneOrFail({ where: { id } });
  }

  async deactivate(id: string, tenantId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, tenantId },
    });
    if (!user) {
      throw new NotFoundException('User not found in this institution');
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('User is already inactive');
    }

    await this.usersRepository.update(id, { status: UserStatus.INACTIVE });
    return this.usersRepository.findOneOrFail({ where: { id } });
  }

  async activate(id: string, tenantId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, tenantId },
    });
    if (!user) {
      throw new NotFoundException('User not found in this institution');
    }
    if (user.status === UserStatus.ACTIVE) {
      throw new ForbiddenException('User is already active');
    }

    await this.usersRepository.update(id, { status: UserStatus.ACTIVE });
    return this.usersRepository.findOneOrFail({ where: { id } });
  }
}
