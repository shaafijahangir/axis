import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { Conversation } from './conversation.entity';
import { User } from '../../../database/entities/user.entity';

@ObjectType()
@Entity('conversation_participants')
@Unique(['conversationId', 'userId'])
export class ConversationParticipant {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, (c) => c.participants)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Field()
  @Column()
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  lastReadAt: Date;

  @Field()
  @CreateDateColumn()
  joinedAt: Date;
}
