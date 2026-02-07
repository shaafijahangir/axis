import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, NotFoundException } from '@nestjs/common';
import { User } from '../../database/entities';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { UpdateUserInput } from './dto/user.types';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User)
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User): Promise<User> {
    const found = await this.usersService.findById(user.id, user.tenantId);
    if (!found) throw new NotFoundException('User not found');
    return found;
  }

  @Mutation(() => User)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Args('input') input: UpdateUserInput,
  ): Promise<User> {
    const updateData: Partial<User> = {};

    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.profile !== undefined)
      updateData.profile = JSON.parse(input.profile);
    if (input.preferences !== undefined)
      updateData.preferences = JSON.parse(input.preferences);

    const updated = await this.usersService.update(
      user.id,
      user.tenantId,
      updateData,
    );
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }
}
