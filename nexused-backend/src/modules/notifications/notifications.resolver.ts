import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import {
  UpdateNotificationPreferencesInput,
  NotificationPreferences,
} from './dto/notifications.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class NotificationsResolver {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  @Query(() => NotificationPreferences)
  async myNotificationPreferences(
    @CurrentUser() user: User,
  ): Promise<NotificationPreferences> {
    const prefs =
      (user.preferences as { notifications?: NotificationPreferences })
        ?.notifications ?? {};
    // Return defaults (true) for any unset preference
    return {
      emailOnGrade: prefs.emailOnGrade ?? true,
      emailOnAssignment: prefs.emailOnAssignment ?? true,
      emailOnEnrollment: prefs.emailOnEnrollment ?? true,
      emailOnDueReminder: prefs.emailOnDueReminder ?? true,
      emailOnMessage: prefs.emailOnMessage ?? true,
    };
  }

  @Mutation(() => NotificationPreferences)
  async updateNotificationPreferences(
    @CurrentUser() user: User,
    @Args('input') input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationPreferences> {
    const existing =
      (user.preferences as { notifications?: NotificationPreferences })
        ?.notifications ?? {};

    const updated = {
      emailOnGrade: input.emailOnGrade ?? existing.emailOnGrade ?? true,
      emailOnAssignment:
        input.emailOnAssignment ?? existing.emailOnAssignment ?? true,
      emailOnEnrollment:
        input.emailOnEnrollment ?? existing.emailOnEnrollment ?? true,
      emailOnDueReminder:
        input.emailOnDueReminder ?? existing.emailOnDueReminder ?? true,
      emailOnMessage: input.emailOnMessage ?? existing.emailOnMessage ?? true,
    };

    const newPreferences: Record<string, unknown> = {
      ...(user.preferences as Record<string, unknown>),
      notifications: updated,
    };
    await this.userRepo
      .createQueryBuilder()
      .update()
      .set({ preferences: () => ':prefs' })
      .where('id = :id', { id: user.id })
      .setParameters({ prefs: JSON.stringify(newPreferences) })
      .execute();

    return updated;
  }
}
