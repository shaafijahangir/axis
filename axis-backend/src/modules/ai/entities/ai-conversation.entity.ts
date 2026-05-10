import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { User } from '../../../database/entities/user.entity';
import { Course } from '../../../database/entities/course.entity';

export enum ConversationStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

registerEnumType(ConversationStatus, { name: 'ConversationStatus' });

@ObjectType()
@Entity('ai_conversations')
@Index(['tenantId'])
@Index(['userId'])
@Index(['status'])
export class AiConversation extends TenantScopedEntity {
  @Field()
  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field()
  @Column({ type: 'varchar' })
  agentType: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  courseId: string;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Field(() => ConversationStatus)
  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  contextSnapshot: Record<string, any>;
}
