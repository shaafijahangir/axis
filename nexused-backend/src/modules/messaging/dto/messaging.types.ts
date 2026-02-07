import { InputType, ObjectType, Field, Int } from '@nestjs/graphql';
import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';
import { User, UserRole } from '../../../database/entities/user.entity';
import { DirectMessage } from '../entities/direct-message.entity';

// --- Inputs ---

@InputType()
export class SendMessageInput {
  @Field()
  @IsUUID()
  recipientId: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

@InputType()
export class SendMessageToConversationInput {
  @Field()
  @IsUUID()
  conversationId: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

// --- Response types ---

@ObjectType()
export class ConversationWithLatest {
  @Field()
  id: string;

  @Field({ nullable: true })
  title: string;

  @Field(() => DirectMessage, { nullable: true })
  lastMessage: DirectMessage | null;

  @Field(() => Int)
  unreadCount: number;

  @Field(() => [User])
  otherParticipants: User[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class PaginatedMessagesResponse {
  @Field(() => [DirectMessage])
  messages: DirectMessage[];

  @Field(() => Int)
  totalCount: number;

  @Field()
  hasMore: boolean;
}

@ObjectType()
export class ContactUser {
  @Field()
  id: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  email: string;

  @Field(() => [UserRole])
  roles: UserRole[];

  @Field()
  relationship: string;
}
