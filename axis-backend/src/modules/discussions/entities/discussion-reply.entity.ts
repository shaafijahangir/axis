import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { User } from '../../../database/entities/user.entity';

@ObjectType()
@Entity('discussion_replies')
@Index(['tenantId'])
@Index(['discussionId'])
@Index(['discussionId', 'createdAt'])
@Index(['authorId'])
export class DiscussionReply extends TenantScopedEntity {
  @Field()
  @Column()
  discussionId: string;

  @Field()
  @Column()
  authorId: string;

  /**
   * WHY: nullable parentReplyId enables single-level threading.
   * Top-level replies have null parentReplyId. Replies-to-replies reference
   * the immediate parent. We avoid deep recursive trees for simplicity.
   */
  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  parentReplyId: string | null;

  @Field()
  @Column({ type: 'text' })
  body: string;

  @Field()
  @Column({ default: false })
  isInstructorAnswer: boolean;

  @Field(() => User)
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'authorId' })
  author: User;
}
