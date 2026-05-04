import { Entity, Column, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';

export enum DevicePlatform {
  WEB = 'web',
  IOS = 'ios',
  ANDROID = 'android',
}

registerEnumType(DevicePlatform, { name: 'DevicePlatform' });

/**
 * Stores push subscription endpoints per user device.
 * For web: the full PushSubscription JSON (endpoint + keys).
 * For mobile (Phase B): FCM token string.
 *
 * WHY store full subscription JSON for web: The web-push library needs
 * both the endpoint and the p256dh/auth keys to encrypt the payload.
 * Storing as JSONB lets us pass the object directly to web-push.
 */
@ObjectType()
@Entity('device_tokens')
@Index(['tenantId'])
@Index(['userId'])
export class DeviceToken extends TenantScopedEntity {
  @Field()
  @Column()
  userId: string;

  @Field(() => DevicePlatform)
  @Column({ type: 'enum', enum: DevicePlatform })
  platform: DevicePlatform;

  /** For web: JSON string of PushSubscription. For mobile: FCM token. */
  @Field()
  @Column({ type: 'text' })
  token: string;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;
}
