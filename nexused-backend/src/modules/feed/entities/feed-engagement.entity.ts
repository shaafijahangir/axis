import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

/**
 * FEAT-014: Feed engagement tracking for ML-based personalization.
 *
 * WHY: To move from rule-based feed ranking (deadline urgency + recency)
 * to behavior-based ranking, we need to know what users interact with.
 * Each row is a single engagement event: a click, impression, or dismiss.
 *
 * PATTERN: Append-only event log. No updates, no deletes. Aggregation
 * happens at query time or via periodic materialization.
 *
 * TRADEOFF: Storing raw events instead of pre-aggregated counters.
 * Raw events give us flexibility to change the scoring model without
 * losing data. The table will grow fast — we'll add a cleanup job
 * for events older than 90 days once volumes justify it.
 */

export enum EngagementEventType {
  CLICK = 'click',
  IMPRESSION = 'impression',
  DISMISS = 'dismiss',
}

registerEnumType(EngagementEventType, { name: 'EngagementEventType' });

@Entity('feed_engagements')
@Index(['tenantId'])
@Index(['userId'])
@Index(['userId', 'feedItemType'])
@Index(['createdAt'])
@ObjectType()
export class FeedEngagement {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  tenantId: string;

  @ManyToOne('Tenant')
  @JoinColumn({ name: 'tenantId' })
  tenant: any;

  @Field()
  @Column()
  userId: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user: any;

  @Field(() => EngagementEventType)
  @Column({ type: 'enum', enum: EngagementEventType })
  eventType: EngagementEventType;

  @Field()
  @Column()
  feedItemType: string;

  @Field()
  @Column()
  feedItemId: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  courseCode?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  sectionId?: string;

  @Field({ nullable: true })
  @Column({ type: 'int', nullable: true })
  dwellTimeMs?: number;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
