import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import webpush, { PushSubscription } from 'web-push';
import { DeviceToken, DevicePlatform } from './entities/device-token.entity';

export interface PushPayload {
  title: string;
  body: string;
  /** Frontend route to navigate to when notification is clicked */
  url?: string;
  /** Notification type for analytics */
  type?: string;
}

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private enabled = false;

  constructor(
    private configService: ConfigService,
    @InjectRepository(DeviceToken)
    private deviceTokenRepo: Repository<DeviceToken>,
  ) {}

  onModuleInit() {
    const publicKey = this.configService.get<string>(
      'notifications.vapidPublicKey',
    );
    const privateKey = this.configService.get<string>(
      'notifications.vapidPrivateKey',
    );
    const email = this.configService.get<string>('notifications.vapidEmail');

    if (!publicKey || !privateKey || !email) {
      this.logger.warn(
        'VAPID keys not configured — web push disabled. ' +
          'Generate keys with: npx web-push generate-vapid-keys',
      );
      return;
    }

    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    this.enabled = true;
    this.logger.log('Web push enabled');
  }

  /** Get the VAPID public key for the frontend subscription call. */
  getVapidPublicKey(): string | null {
    return (
      this.configService.get<string>('notifications.vapidPublicKey') ?? null
    );
  }

  /** Register or update a device push subscription. */
  async registerToken(
    userId: string,
    tenantId: string,
    token: string,
    platform: DevicePlatform,
  ): Promise<DeviceToken> {
    // Upsert: update if same token exists, insert otherwise
    const existing = await this.deviceTokenRepo.findOne({
      where: { userId, token, tenantId },
    });

    if (existing) {
      existing.lastUsedAt = new Date();
      return this.deviceTokenRepo.save(existing);
    }

    const record = this.deviceTokenRepo.create({
      userId,
      tenantId,
      platform,
      token,
      lastUsedAt: new Date(),
    });
    return this.deviceTokenRepo.save(record);
  }

  /** Send a push notification to all registered web devices for a user. */
  async sendToUser(
    userId: string,
    tenantId: string,
    payload: PushPayload,
  ): Promise<void> {
    if (!this.enabled) return;

    const tokens = await this.deviceTokenRepo.find({
      where: { userId, tenantId, platform: DevicePlatform.WEB },
    });
    if (tokens.length === 0) return;

    const payloadStr = JSON.stringify(payload);
    const staleTokenIds: string[] = [];

    await Promise.all(
      tokens.map(async (dt) => {
        try {
          const subscription = JSON.parse(dt.token) as PushSubscription;
          await webpush.sendNotification(subscription, payloadStr);
          dt.lastUsedAt = new Date();
          await this.deviceTokenRepo.save(dt);
        } catch (err: unknown) {
          // 410 Gone = subscription expired/unsubscribed — clean it up
          if (
            typeof err === 'object' &&
            err !== null &&
            'statusCode' in err &&
            (err as { statusCode: number }).statusCode === 410
          ) {
            staleTokenIds.push(dt.id);
          } else {
            this.logger.error(`Push failed for token ${dt.id}`, err);
          }
        }
      }),
    );

    if (staleTokenIds.length > 0) {
      await this.deviceTokenRepo.delete(staleTokenIds);
    }
  }
}
