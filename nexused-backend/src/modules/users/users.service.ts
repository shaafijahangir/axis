import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../database/entities';
import * as bcrypt from 'bcrypt';
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

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.passwordHash!, 10);

    const user = this.usersRepository.create({
      ...userData,
      passwordHash: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    await this.usersRepository.update(id, userData);
    return this.findById(id);
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
    const page = filter?.page ?? 1;
    const pageSize = filter?.pageSize ?? 20;
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

    qb.orderBy('user.createdAt', 'DESC').skip(offset).take(pageSize);

    const [users, totalCount] = await qb.getManyAndCount();

    return { users, totalCount, page, pageSize };
  }

  async countForTenant(tenantId: string): Promise<number> {
    return this.usersRepository.count({ where: { tenantId } });
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

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = this.usersRepository.create({
      tenantId,
      email: input.email,
      passwordHash: hashedPassword,
      firstName: input.firstName,
      lastName: input.lastName,
      roles: input.roles,
      status: UserStatus.ACTIVE,
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

    const updateData: Partial<User> = {};
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.roles !== undefined) updateData.roles = input.roles;
    if (input.status !== undefined) updateData.status = input.status;

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
