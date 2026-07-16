import { io, Socket } from 'socket.io-client';

/**
 * Socket.IO client for real-time messaging.
 *
 * Connects to the /messaging namespace with cookie-based authentication.
 * The httpOnly cookie is sent automatically via credentials: 'include'.
 */

let socket: Socket | null = null;

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
  'http://localhost:3002';

/**
 * Get or create the socket connection.
 * Call this once on app mount (typically in a context provider or layout).
 */
export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(`${SOCKET_URL}/messaging`, {
    // Send cookies for httpOnly JWT authentication
    withCredentials: true,
    // Fallback: can also send token in auth if needed
    // auth: { token: getTokenFromSomewhere() },
    // Connection options
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  // Connection lifecycle logging
  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
}

/**
 * Disconnect and clean up the socket.
 * Call this on logout or app unmount.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket] Disconnected and cleaned up');
  }
}

/**
 * Check if socket is currently connected.
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

// =====================================================
// Event types for type safety
// =====================================================

export interface NewMessageEvent {
  conversationId: string;
  message: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  };
}

export interface ConversationCreatedEvent {
  conversationId: string;
}

export interface ConversationUpdatedEvent {
  conversationId: string;
  hasNewMessage?: boolean;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
}

export interface UserTypingEvent {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

// =====================================================
// Socket action emitters
// =====================================================

/**
 * Join a conversation room to receive real-time updates.
 */
export function joinConversation(
  conversationId: string,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const s = getSocket();
    s.emit(
      'join-conversation',
      { conversationId },
      (response: { success: boolean; error?: string }) => {
        resolve(response);
      },
    );
  });
}

/**
 * Leave a conversation room.
 */
export function leaveConversation(
  conversationId: string,
): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    const s = getSocket();
    s.emit(
      'leave-conversation',
      { conversationId },
      (response: { success: boolean }) => {
        resolve(response);
      },
    );
  });
}

/**
 * Send typing indicator to other participants.
 */
export function sendTypingIndicator(
  conversationId: string,
  isTyping: boolean,
): void {
  const s = getSocket();
  s.emit('typing', { conversationId, isTyping });
}

/**
 * Mark conversation as read via WebSocket (faster than GraphQL mutation).
 */
export function markConversationRead(
  conversationId: string,
): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    const s = getSocket();
    s.emit(
      'mark-read',
      { conversationId },
      (response: { success: boolean }) => {
        resolve(response);
      },
    );
  });
}
