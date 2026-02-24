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

  /**
   * Send a push notification to all registered devices for a user.
   * Handles web (VAPID) and mobile (Expo Push API) in parallel.
   */
  async sendToUser(
    userId: string,
    tenantId: string,
    payload: PushPayload,
  ): Promise<void> {
    const allTokens = await this.deviceTokenRepo.find({
      where: [
        { userId, tenantId, platform: DevicePlatform.WEB },
        { userId, tenantId, platform: DevicePlatform.IOS },
        { userId, tenantId, platform: DevicePlatform.ANDROID },
      ],
    });
    if (allTokens.length === 0) return;

    const webTokens = allTokens.filter(
      (dt) => dt.platform === DevicePlatform.WEB,
    );
    const mobileTokens = allTokens.filter(
      (dt) =>
        dt.platform === DevicePlatform.IOS ||
        dt.platform === DevicePlatform.ANDROID,
    );

    await Promise.all([
      this.sendWebPush(webTokens, payload),
      this.sendExpoPush(mobileTokens, payload),
    ]);
  }

  /** Send via VAPID web-push to browser subscriptions. */
  private async sendWebPush(
    tokens: DeviceToken[],
    payload: PushPayload,
  ): Promise<void> {
    if (!this.enabled || tokens.length === 0) return;

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
          // 410 Gone = subscription expired — clean it up
          if (
            typeof err === 'object' &&
            err !== null &&
            'statusCode' in err &&
            (err as { statusCode: number }).statusCode === 410
          ) {
            staleTokenIds.push(dt.id);
          } else {
            this.logger.error(`Web push failed for token ${dt.id}`, err);
          }
        }
      }),
    );

    if (staleTokenIds.length > 0) {
      await this.deviceTokenRepo.delete(staleTokenIds);
    }
  }

  /**
   * Send via Expo Push API to iOS/Android devices.
   * Expo handles FCM/APNs routing transparently.
   * https://docs.expo.dev/push-notifications/sending-notifications/
   */
  private async sendExpoPush(
    tokens: DeviceToken[],
    payload: PushPayload,
  ): Promise<void> {
    if (tokens.length === 0) return;

    const messages = tokens.map((dt) => ({
      to: dt.token,
      title: payload.title,
      body: payload.body,
      data: { url: payload.url, type: payload.type },
      sound: 'default' as const,
    }));

    let result: {
      data: Array<{
        status: string;
        id?: string;
        message?: string;
        details?: { error?: string };
      }>;
    };

    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        this.logger.error(`Expo push HTTP error: ${res.status}`);
        return;
      }

      result = (await res.json()) as typeof result;
    } catch (err) {
      this.logger.error('Expo push network error', err);
      return;
    }

    // Clean up stale tokens (DeviceNotRegistered = app uninstalled)
    const staleTokenIds: string[] = [];
    result.data.forEach((receipt, i) => {
      if (
        receipt.status === 'error' &&
        receipt.details?.error === 'DeviceNotRegistered'
      ) {
        staleTokenIds.push(tokens[i].id);
      } else if (receipt.status === 'error') {
        this.logger.warn(
          `Expo push error for token ${tokens[i].id}: ${receipt.message ?? 'unknown'}`,
        );
      }
    });

    if (staleTokenIds.length > 0) {
      await this.deviceTokenRepo.delete(staleTokenIds);
    }

    // Update lastUsedAt for successful sends
    const successfulTokens = tokens.filter(
      (_, i) => result.data[i]?.status === 'ok',
    );
    if (successfulTokens.length > 0) {
      await this.deviceTokenRepo.update(
        successfulTokens.map((t) => t.id),
        { lastUsedAt: new Date() },
      );
    }
  }
}
