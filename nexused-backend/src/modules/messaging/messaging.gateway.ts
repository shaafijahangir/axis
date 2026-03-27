import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { UsersService } from '../users/users.service';
import { MessagingService, MESSAGING_EVENTS } from './messaging.service';
import type {
  MessageSentEvent,
  ConversationCreatedEvent,
} from './messaging.service';

interface JwtPayload {
  sub: string;
  tenantId: string;
  [key: string]: unknown;
}

interface SocketData {
  userId: string;
  tenantId: string;
}

/**
 * WebSocket Gateway for real-time messaging.
 *
 * Events emitted TO clients:
 * - `message:new` - New message in a conversation
 * - `conversation:created` - New conversation with this user
 * - `conversation:updated` - Conversation metadata changed (unread count, etc.)
 * - `user:typing` - Another user is typing in a conversation
 *
 * Events received FROM clients:
 * - `join-conversation` - Subscribe to updates for a conversation
 * - `leave-conversation` - Unsubscribe from conversation updates
 * - `typing` - User is typing in a conversation
 * - `mark-read` - Mark conversation as read
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  // Track connected users: Map<userId, Set<socketId>>
  private connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly messagingService: MessagingService,
  ) {}

  /**
   * Handle new WebSocket connection.
   * Authenticates user via JWT from cookie or auth token.
   */
  handleConnection(client: Socket): void {
    try {
      const user = this.authenticateClient(client);

      if (!user) {
        this.logger.warn(`Connection rejected: Invalid auth`);
        client.disconnect(true);
        return;
      }

      // Store user data on socket
      const socketData = client.data as SocketData;
      socketData.userId = user.id;
      socketData.tenantId = user.tenantId;

      // Track connected user
      if (!this.connectedUsers.has(user.id)) {
        this.connectedUsers.set(user.id, new Set());
      }
      this.connectedUsers.get(user.id)!.add(client.id);

      // Join user-specific room for direct notifications
      void client.join(`user:${user.id}`);
      void client.join(`tenant:${user.tenantId}`);

      this.logger.log(
        `Client connected: ${client.id} (user: ${user.id}, tenant: ${user.tenantId})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Connection error: ${message}`);
      client.disconnect(true);
    }
  }

  /**
   * Handle WebSocket disconnection.
   */
  handleDisconnect(client: Socket): void {
    const socketData = client.data as SocketData;
    const userId = socketData.userId;

    if (userId) {
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Extract and validate JWT from client connection.
   */
  private authenticateClient(client: Socket): {
    id: string;
    tenantId: string;
  } | null {
    try {
      // Try multiple auth methods:
      // 1. Auth token in handshake (client sends explicitly)
      // 2. Token in query params (fallback)
      // 3. Cookie (if cookies are forwarded)

      let token: string | null = null;

      // Method 1: Auth object
      const authData = client.handshake.auth as Record<string, unknown>;
      if (typeof authData?.token === 'string') {
        token = authData.token;
      }

      // Method 2: Query param
      if (!token && client.handshake.query?.token) {
        token = client.handshake.query.token as string;
      }

      // Method 3: Cookie (parse from headers)
      if (!token && client.handshake.headers.cookie) {
        const cookies = this.parseCookies(client.handshake.headers.cookie);
        token = cookies['access_token'] ?? null;
      }

      if (!token) {
        return null;
      }

      // Verify JWT
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('auth.jwtSecret'),
      });

      if (!payload.sub || !payload.tenantId) {
        return null;
      }

      // Verify user still exists (optional, adds DB call)
      // const user = await this.usersService.findById(payload.sub, payload.tenantId);
      // if (!user) return null;

      return {
        id: payload.sub,
        tenantId: payload.tenantId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Auth failed: ${message}`);
      return null;
    }
  }

  /**
   * Parse cookie header string into key-value object.
   */
  private parseCookies(cookieHeader: string): Record<string, string> {
    return cookieHeader.split(';').reduce(
      (cookies, cookie) => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name) cookies[name] = rest.join('=');
        return cookies;
      },
      {} as Record<string, string>,
    );
  }

  /**
   * Join a conversation room to receive real-time updates.
   */
  @SubscribeMessage('join-conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): Promise<{ success: boolean; error?: string }> {
    const socketData = client.data as SocketData;
    const { userId, tenantId } = socketData;

    try {
      // Verify user is participant in this conversation
      await this.messagingService.verifyParticipant(
        data.conversationId,
        userId,
        tenantId,
      );

      // Join conversation room
      const room = `conversation:${data.conversationId}`;
      void client.join(room);

      this.logger.debug(
        `User ${userId} joined conversation ${data.conversationId}`,
      );

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Join conversation failed: ${message} (user: ${userId})`,
      );
      return { success: false, error: 'Access denied' };
    }
  }

  /**
   * Leave a conversation room.
   */
  @SubscribeMessage('leave-conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): { success: boolean } {
    const room = `conversation:${data.conversationId}`;
    void client.leave(room);

    const socketData = client.data as SocketData;
    this.logger.debug(
      `User ${socketData.userId} left conversation ${data.conversationId}`,
    );

    return { success: true };
  }

  /**
   * Handle typing indicator from client.
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ): void {
    const socketData = client.data as SocketData;
    const { userId } = socketData;
    const room = `conversation:${data.conversationId}`;

    // Broadcast to other users in conversation (exclude sender)
    client.to(room).emit('user:typing', {
      conversationId: data.conversationId,
      userId,
      isTyping: data.isTyping,
    });
  }

  /**
   * Handle mark-as-read from client.
   */
  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): Promise<{ success: boolean }> {
    const socketData = client.data as SocketData;
    const { userId, tenantId } = socketData;

    try {
      await this.messagingService.markAsRead(
        data.conversationId,
        userId,
        tenantId,
      );
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Mark read failed: ${message}`);
      return { success: false };
    }
  }

  // =====================================================
  // Event listeners (react to MessagingService events)
  // =====================================================

  /**
   * Handle new message event from MessagingService.
   * Broadcasts to all participants in the conversation room.
   */
  @OnEvent(MESSAGING_EVENTS.MESSAGE_SENT)
  handleMessageSent(event: MessageSentEvent): void {
    const { conversationId, message, participantIds } = event;
    const room = `conversation:${conversationId}`;

    // Emit to conversation room (users who have joined)
    this.server.to(room).emit('message:new', {
      conversationId,
      message: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        createdAt: message.createdAt,
        sender: message.sender
          ? {
              id: message.sender.id,
              firstName: message.sender.firstName,
              lastName: message.sender.lastName,
            }
          : null,
      },
    });

    // Also emit to participant user rooms (for unread count updates)
    for (const userId of participantIds) {
      if (userId !== message.senderId) {
        this.server.to(`user:${userId}`).emit('conversation:updated', {
          conversationId,
          hasNewMessage: true,
        });
      }
    }

    this.logger.debug(
      `Emitted message:new to ${room} (${participantIds.length} participants)`,
    );
  }

  /**
   * Handle new conversation event from MessagingService.
   * Notifies all participants that they have a new conversation.
   */
  @OnEvent(MESSAGING_EVENTS.CONVERSATION_CREATED)
  handleConversationCreated(event: ConversationCreatedEvent): void {
    const { conversation, participantIds } = event;

    for (const userId of participantIds) {
      this.server.to(`user:${userId}`).emit('conversation:created', {
        conversationId: conversation.id,
      });
    }

    this.logger.debug(
      `Emitted conversation:created to ${participantIds.length} users`,
    );
  }

  // =====================================================
  // Manual emission methods (for direct gateway calls)
  // =====================================================

  /**
   * Notify users in a conversation that metadata has changed.
   * (e.g., new unread count, last message preview)
   */
  emitConversationUpdated(
    conversationId: string,
    update: {
      lastMessage?: { content: string; createdAt: Date };
      unreadCount?: number;
    },
  ): void {
    const room = `conversation:${conversationId}`;
    this.server.to(room).emit('conversation:updated', {
      conversationId,
      ...update,
    });
  }

  /**
   * Check if a user is currently online.
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get all connected user IDs (for debugging).
   */
  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}
