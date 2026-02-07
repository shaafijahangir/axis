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
import { Conversation } from './conversation.entity';
import { User } from '../../../database/entities/user.entity';

@ObjectType()
@Entity('direct_messages')
@Index(['conversationId'])
@Index(['createdAt'])
export class DirectMessage {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  conversationId: string;

  @ManyToOne(() => Conversation, (c) => c.messages)
  @JoinColumn({ name: 'conversationId' })
  conversation: Conversation;

  @Field()
  @Column()
  senderId: string;

  @Field(() => User)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Field()
  @Column({ type: 'text' })
  content: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
