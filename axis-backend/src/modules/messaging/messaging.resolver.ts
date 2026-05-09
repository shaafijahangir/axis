import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { User } from '../../database/entities/user.entity';
import { DirectMessage } from './entities/direct-message.entity';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { MessagingService } from './messaging.service';
import {
  SendMessageInput,
  SendMessageToConversationInput,
  ConversationWithLatest,
  PaginatedMessagesResponse,
  ContactUser,
} from './dto/messaging.types';

@Resolver()
@UseGuards(JwtAuthGuard)
export class MessagingResolver {
  constructor(private readonly messagingService: MessagingService) {}

  @Query(() => [ConversationWithLatest])
  async myConversations(
    @CurrentUser() user: User,
  ): Promise<ConversationWithLatest[]> {
    return this.messagingService.getConversations(user.id, user.tenantId);
  }

  @Query(() => PaginatedMessagesResponse)
  async conversationMessages(
    @CurrentUser() user: User,
    @Args('conversationId') conversationId: string,
    @Args('cursor', { nullable: true }) cursor?: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<PaginatedMessagesResponse> {
    return this.messagingService.getMessages(
      conversationId,
      user.id,
      user.tenantId,
      cursor,
      limit,
    );
  }

  @Query(() => [ContactUser])
  async myContacts(@CurrentUser() user: User): Promise<ContactUser[]> {
    return this.messagingService.getContacts(user.id, user.tenantId);
  }

  @Query(() => Int)
  async unreadMessageCount(@CurrentUser() user: User): Promise<number> {
    return this.messagingService.getUnreadCount(user.id, user.tenantId);
  }

  @Mutation(() => DirectMessage)
  async sendMessage(
    @CurrentUser() user: User,
    @Args('input') input: SendMessageInput,
  ): Promise<DirectMessage> {
    return this.messagingService.sendMessageToUser(
      user.id,
      input.recipientId,
      user.tenantId,
      input.content,
    );
  }

  @Mutation(() => DirectMessage)
  async sendMessageToConversation(
    @CurrentUser() user: User,
    @Args('input') input: SendMessageToConversationInput,
  ): Promise<DirectMessage> {
    return this.messagingService.sendMessage(
      input.conversationId,
      user.id,
      user.tenantId,
      input.content,
    );
  }

  @Mutation(() => Boolean)
  async markConversationAsRead(
    @CurrentUser() user: User,
    @Args('conversationId') conversationId: string,
  ): Promise<boolean> {
    return this.messagingService.markAsRead(
      conversationId,
      user.id,
      user.tenantId,
    );
  }
}
