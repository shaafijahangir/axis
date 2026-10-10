import { graphql } from '@/lib/graphql/__generated__';

/**
 * Fetch available AI agents for the current user.
 * Returns agents filtered by the user's roles.
 */
export const AVAILABLE_AGENTS_QUERY = graphql(`
  query AvailableAgents {
    availableAgents {
      type
      displayName
      description
      allowedRoles
    }
  }
`);

/**
 * Fetch the user's AI conversations.
 * Returns all conversations ordered by most recent first.
 */
export const MY_AI_CONVERSATIONS_QUERY = graphql(`
  query MyAiConversations {
    myAiConversations {
      id
      agentType
      courseId
      status
      createdAt
      updatedAt
    }
  }
`);

/**
 * Fetch messages for a specific AI conversation.
 * Returns messages in chronological order (oldest first).
 */
export const AI_CONVERSATION_MESSAGES_QUERY = graphql(`
  query AiConversationMessages($conversationId: String!) {
    aiMessages(conversationId: $conversationId) {
      id
      conversationId
      role
      content
      toolCalls
      toolResults
      tokenCount
      createdAt
    }
  }
`);
