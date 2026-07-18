import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards, NotFoundException } from '@nestjs/common';
import { User } from '../../database/entities';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { UpdateUserInput } from './dto/user.types';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  /**
   * FEAT-021: directory fields surfaced from profile JSONB as first-class
   * GraphQL fields. The raw `profile` String field has no serialization
   * transformer, so clients can't reliably read the blob — and the UVic/SFU
   * directory model (shaafilook.md §2: name, title, office, email) deserves
   * typed fields anyway.
   */
  @ResolveField(() => String, { nullable: true })
  title(@Parent() user: User): string | null {
    const value = (user.profile as { title?: unknown } | null)?.title;
    return typeof value === 'string' ? value : null;
  }

  /** Building + room, directory format (e.g. "ECS 618"). */
  @ResolveField(() => String, { nullable: true })
  officeLocation(@Parent() user: User): string | null {
    const value = (user.profile as { officeLocation?: unknown } | null)
      ?.officeLocation;
    return typeof value === 'string' ? value : null;
  }

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
      updateData.profile = JSON.parse(input.profile) as Record<string, unknown>;
    // FEAT-021: dedicated directory fields MERGE into profile JSONB —
    // callers change one field without read-modify-writing the whole blob.
    if (input.title !== undefined || input.officeLocation !== undefined) {
      const current = await this.usersService.findById(user.id, user.tenantId);
      updateData.profile = {
        ...(updateData.profile ?? current?.profile ?? {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.officeLocation !== undefined
          ? { officeLocation: input.officeLocation }
          : {}),
      };
    }
    if (input.preferences !== undefined)
      updateData.preferences = JSON.parse(input.preferences) as Record<
        string,
        unknown
      >;

    const updated = await this.usersService.update(
      user.id,
      user.tenantId,
      updateData,
    );
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }
}
