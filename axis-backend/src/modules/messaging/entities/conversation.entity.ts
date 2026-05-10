import { Entity, Column, OneToMany, Index } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { TenantScopedEntity } from '../../../database/entities/base.entity';
import { ConversationParticipant } from './conversation-participant.entity';
import { DirectMessage } from './direct-message.entity';

@ObjectType()
@Entity('conversations')
@Index(['tenantId'])
export class Conversation extends TenantScopedEntity {
  @Field({ nullable: true })
  @Column({ type: 'varchar', nullable: true })
  title: string;

  @OneToMany(() => ConversationParticipant, (p) => p.conversation)
  participants: ConversationParticipant[];

  @OneToMany(() => DirectMessage, (m) => m.conversation)
  messages: DirectMessage[];
}
