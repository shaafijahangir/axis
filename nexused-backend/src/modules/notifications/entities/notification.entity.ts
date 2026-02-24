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

  /**
   * Deep-link data for navigation on click.
   * e.g. { path: '/courses/x/section/y/assignment/z' }
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, string> | null;

  @Field()
  @Column({ default: false })
  read: boolean;
}
