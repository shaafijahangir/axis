import { gql } from '@apollo/client';

/**
 * Start a new AI conversation with a specific agent.
 * Returns the conversation ID and initial response.
 */
export const START_AI_CONVERSATION_MUTATION = gql`
  mutation StartAiConversation($input: StartConversationInput!) {
    startConversation(input: $input) {
      conversationId
      responseText
      toolsUsed
      totalInputTokens
      totalOutputTokens
      turns
    }
  }
`;

/**
 * Send a message to an existing AI conversation.
 * Returns the AI response with tool usage info.
 */
export const SEND_AI_MESSAGE_MUTATION = gql`
  mutation SendAiMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      conversationId
      responseText
      toolsUsed
      totalInputTokens
      totalOutputTokens
      turns
    }
  }
`;
