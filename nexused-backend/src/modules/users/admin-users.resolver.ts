import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '../../database/entities';
import { UserRole } from '../../database/entities/user.entity';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles } from '../../decorators/roles.decorator';
import {
  PaginatedUsersResponse,
  AdminCreateUserInput,
  AdminUpdateUserInput,
  UsersFilterInput,
} from './dto/admin-user.types';

@Resolver(() => User)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => PaginatedUsersResponse)
  async adminUsers(
    @CurrentUser() user: User,
    @Args('filter', { nullable: true }) filter?: UsersFilterInput,
  ): Promise<PaginatedUsersResponse> {
    return this.usersService.findAllForTenant(user.tenantId, filter);
  }

  @Query(() => User)
  async adminUser(
    @CurrentUser() currentUser: User,
    @Args('id') id: string,
  ): Promise<User> {
    const user = await this.usersService.findById(id, currentUser.tenantId);
    if (!user) {
      throw new Error('User not found in this institution');
    }
    return user;
  }

  @Query(() => Int)
  async userCount(@CurrentUser() user: User): Promise<number> {
    return this.usersService.countForTenant(user.tenantId);
  }

  @Mutation(() => User)
  async adminCreateUser(
    @CurrentUser() user: User,
    @Args('input') input: AdminCreateUserInput,
  ): Promise<User> {
    return this.usersService.adminCreate(user.tenantId, input);
  }

  @Mutation(() => User)
  async adminUpdateUser(
    @CurrentUser() currentUser: User,
    @Args('id') id: string,
    @Args('input') input: AdminUpdateUserInput,
  ): Promise<User> {
    return this.usersService.adminUpdate(id, currentUser.tenantId, input);
  }

  @Mutation(() => User)
  async deactivateUser(
    @CurrentUser() currentUser: User,
    @Args('id') id: string,
  ): Promise<User> {
    return this.usersService.deactivate(id, currentUser.tenantId);
  }

  @Mutation(() => User)
  async activateUser(
    @CurrentUser() currentUser: User,
    @Args('id') id: string,
  ): Promise<User> {
    return this.usersService.activate(id, currentUser.tenantId);
  }
}
