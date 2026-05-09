'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import {
  getSocket,
  disconnectSocket,
  joinConversation,
  leaveConversation,
  sendTypingIndicator,
  markConversationRead,
  NewMessageEvent,
  ConversationCreatedEvent,
  ConversationUpdatedEvent,
  UserTypingEvent,
} from '@/lib/socket';

/**
 * Hook to manage socket connection lifecycle.
 * Connects when user is authenticated, disconnects on logout.
 *
 * Usage:
 *   const { isConnected } = useSocketConnection();
 */
export function useSocketConnection() {
  const { user, isAuthenticated } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      return () => {
        setIsConnected(false);
      };
    }

    const socket = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Check initial state after subscribing to events
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      setIsConnected(false);
    };
  }, [isAuthenticated, user]);

  return { isConnected };
}

/**
 * Hook to subscribe to conversation events.
 * Joins the conversation room, listens for messages, handles cleanup.
 *
 * Usage:
 *   useConversationSocket({
 *     conversationId: 'abc123',
 *     onNewMessage: (event) => refetch(),
 *     onTyping: (event) => setTypingUsers(...)
 *   });
 */
export function useConversationSocket({
  conversationId,
  onNewMessage,
  onTyping,
}: {
  conversationId: string | null;
  onNewMessage?: (event: NewMessageEvent) => void;
  onTyping?: (event: UserTypingEvent) => void;
}) {
  const { isAuthenticated } = useAuthStore();
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !conversationId) {
      return () => {
        setIsJoined(false);
      };
    }

    const socket = getSocket();

    // Join conversation room
    joinConversation(conversationId).then((result) => {
      if (result.success) {
        setIsJoined(true);
      } else {
        console.error('[Socket] Failed to join conversation:', result.error);
      }
    });

    // Handle new messages
    const handleNewMessage = (event: NewMessageEvent) => {
      if (event.conversationId === conversationId && onNewMessage) {
        onNewMessage(event);
      }
    };

    // Handle typing indicators
    const handleTyping = (event: UserTypingEvent) => {
      if (event.conversationId === conversationId && onTyping) {
        onTyping(event);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('user:typing', handleTyping);

    // Cleanup: leave room and remove listeners
    return () => {
      leaveConversation(conversationId);
      socket.off('message:new', handleNewMessage);
      socket.off('user:typing', handleTyping);
      setIsJoined(false);
    };
  }, [conversationId, isAuthenticated, onNewMessage, onTyping]);

  return { isJoined };
}

/**
 * Hook to listen for global conversation updates.
 * Useful for the conversation list to know when to refetch.
 *
 * Usage:
 *   useConversationUpdates({
 *     onConversationCreated: () => refetch(),
 *     onConversationUpdated: (event) => handleUpdate(event)
 *   });
 */
export function useConversationUpdates({
  onConversationCreated,
  onConversationUpdated,
}: {
  onConversationCreated?: (event: ConversationCreatedEvent) => void;
  onConversationUpdated?: (event: ConversationUpdatedEvent) => void;
}) {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();

    const handleCreated = (event: ConversationCreatedEvent) => {
      onConversationCreated?.(event);
    };

    const handleUpdated = (event: ConversationUpdatedEvent) => {
      onConversationUpdated?.(event);
    };

    socket.on('conversation:created', handleCreated);
    socket.on('conversation:updated', handleUpdated);

    return () => {
      socket.off('conversation:created', handleCreated);
      socket.off('conversation:updated', handleUpdated);
    };
  }, [isAuthenticated, onConversationCreated, onConversationUpdated]);
}

/**
 * Hook for typing indicator with debouncing.
 * Sends typing=true when user types, typing=false after delay.
 *
 * Usage:
 *   const { setTyping } = useTypingIndicator(conversationId);
 *   <textarea onChange={() => setTyping()} />
 */
export function useTypingIndicator(conversationId: string | null) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const setTyping = useCallback(() => {
    if (!conversationId) return;

    // Send typing=true if not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingIndicator(conversationId, true);
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout to send typing=false
    timeoutRef.current = setTimeout(() => {
      if (conversationId && isTypingRef.current) {
        isTypingRef.current = false;
        sendTypingIndicator(conversationId, false);
      }
    }, 2000); // 2 seconds of inactivity = stopped typing
  }, [conversationId]);

  // Cleanup on unmount or conversation change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (conversationId && isTypingRef.current) {
        sendTypingIndicator(conversationId, false);
        isTypingRef.current = false;
      }
    };
  }, [conversationId]);

  return { setTyping };
}

/**
 * Hook to mark conversation as read via WebSocket.
 */
export function useMarkAsRead() {
  const markAsRead = useCallback((conversationId: string) => {
    return markConversationRead(conversationId);
  }, []);

  return { markAsRead };
}
