import { Entity, Column, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';

export enum NotificationType {
  SUBMISSION_GRADED = 'submission_graded',
  ASSIGNMENT_CREATED = 'assignment_created',
  ENROLLMENT_CONFIRMED = 'enrollment_confirmed',
  DUE_DATE_REMINDER = 'due_date_reminder',
  NEW_MESSAGE = 'new_message',
  ANNOUNCEMENT = 'announcement',
  DISCUSSION_REPLY = 'discussion_reply',
  DISCUSSION_MENTION = 'discussion_mention',
  SYSTEM = 'system',
}

registerEnumType(NotificationType, { name: 'NotificationType' });

@ObjectType()
@Entity('notifications')
@Index(['tenantId'])
@Index(['userId', 'read'])
@Index(['userId', 'createdAt'])
export class Notification extends TenantScopedEntity {
  @Field()
  @Column()
  userId: string;

  @Field(() => NotificationType)
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', nullable: true, name: 'data' })
  _data: Record<string, string> | null;

  /** Serialized as a JSON string for the GraphQL String scalar. */
  @Field(() => String, { nullable: true })
  get data(): string | null {
    return this._data ? JSON.stringify(this._data) : null;
  }
  set data(value: Record<string, string> | string | null) {
    if (typeof value === 'string') {
      this._data = value ? (JSON.parse(value) as Record<string, string>) : null;
    } else {
      this._data = value;
    }
  }

  @Field()
  @Column({ default: false })
  read: boolean;
}
