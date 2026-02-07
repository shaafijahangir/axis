import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { AiConversation } from './ai-conversation.entity';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
}

registerEnumType(MessageRole, { name: 'MessageRole' });

@ObjectType()
@Entity('ai_messages')
@Index(['conversationId'])
@Index(['createdAt'])
export class AiMessage {
  @Field()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  conversationId: string;

  @ManyToOne(() => AiConversation)
  @JoinColumn({ name: 'conversationId' })
  conversation: AiConversation;

  @Field(() => MessageRole)
  @Column({
    type: 'enum',
    enum: MessageRole,
  })
  role: MessageRole;

  @Field()
  @Column({ type: 'text' })
  content: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  toolCalls: Record<string, any>[];

  @Field(() => String, { nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  toolResults: Record<string, any>[];

  @Field()
  @Column({ type: 'int', default: 0 })
  tokenCount: number;

  @Field()
  @CreateDateColumn()
  createdAt: Date;
}
