import { graphql } from '@/lib/graphql/__generated__';

/**
 * Start a new AI conversation with a specific agent.
 * Returns the conversation ID and initial response.
 */
export const START_AI_CONVERSATION_MUTATION = graphql(`
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
`);

/**
 * Send a message to an existing AI conversation.
 * Returns the AI response with tool usage info.
 */
export const SEND_AI_MESSAGE_MUTATION = graphql(`
  mutation ContinueConversation($input: ContinueConversationInput!) {
    continueConversation(input: $input) {
      conversationId
      responseText
      toolsUsed
      totalInputTokens
      totalOutputTokens
      turns
    }
  }
`);
