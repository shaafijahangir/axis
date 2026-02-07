import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { Tenant } from '../../../database/entities/tenant.entity';
import { User } from '../../../database/entities/user.entity';
import { AiConversation } from './ai-conversation.entity';

@ObjectType()
@Entity('ai_usage_logs')
@Index(['tenantId'])
@Index(['userId'])
@Index(['createdAt'])
export class AiUsageLog {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

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
  conversationId: string;

  @ManyToOne(() => AiConversation, { nullable: true })
  @JoinColumn({ name: 'conversationId' })
  conversation: AiConversation;

  @Field()
  @Column({ type: 'int' })
  inputTokens: number;

  @Field()
  @Column({ type: 'int' })
  outputTokens: number;

  @Field()
  @Column({ type: 'decimal', precision: 10, scale: 6 })
  estimatedCostUsd: number;

  @Field()
  @Column({ type: 'varchar' })
  model: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
