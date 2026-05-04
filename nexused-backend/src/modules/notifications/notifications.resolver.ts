import {
  Resolver,
  Mutation,
  Query,
  Args,
  Int,
  Field,
  ObjectType,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { User } from '../../database/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { DevicePlatform } from './entities/device-token.entity';
import {
  UpdateNotificationPreferencesInput,
  NotificationPreferences,
} from './dto/notifications.types';
import { InAppNotificationService } from './in-app-notification.service';
import { WebPushService } from './web-push.service';

@ObjectType()
class VapidPublicKey {
  @Field(() => String, { nullable: true })
  publicKey: string | null;
}

@Resolver()
@UseGuards(JwtAuthGuard)
export class NotificationsResolver {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private inAppService: InAppNotificationService,
    private webPushService: WebPushService,
  ) {}

  // ─── Notification preferences ─────────────────────────────────────────

  @Query(() => NotificationPreferences)
  myNotificationPreferences(
    @CurrentUser() user: User,
  ): NotificationPreferences {
    const prefs =
      (user.preferences as { notifications?: NotificationPreferences })
        ?.notifications ?? {};
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

  // ─── In-app notifications ────────────────────────────────────────────

  @Query(() => [Notification])
  async myNotifications(
    @CurrentUser() user: User,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ): Promise<Notification[]> {
    return this.inAppService.findForUser(user.id, user.tenantId, limit, offset);
  }

  @Query(() => Int)
  async unreadNotificationCount(@CurrentUser() user: User): Promise<number> {
    return this.inAppService.unreadCount(user.id, user.tenantId);
  }

  @Mutation(() => Notification)
  async markNotificationRead(
    @CurrentUser() user: User,
    @Args('id') id: string,
  ): Promise<Notification> {
    return this.inAppService.markRead(id, user.id, user.tenantId);
  }

  @Mutation(() => Boolean)
  async markAllNotificationsRead(@CurrentUser() user: User): Promise<boolean> {
    return this.inAppService.markAllRead(user.id, user.tenantId);
  }

  // ─── Web push ────────────────────────────────────────────────────────

  @Query(() => VapidPublicKey)
  vapidPublicKey(): VapidPublicKey {
    return { publicKey: this.webPushService.getVapidPublicKey() };
  }

  @Mutation(() => Boolean)
  async registerDeviceToken(
    @CurrentUser() user: User,
    @Args('token') token: string,
    @Args('platform', { type: () => DevicePlatform }) platform: DevicePlatform,
  ): Promise<boolean> {
    await this.webPushService.registerToken(
      user.id,
      user.tenantId,
      token,
      platform,
    );
    return true;
  }
}
