import { graphql } from '@/lib/graphql/__generated__';

export const SEND_MESSAGE_MUTATION = graphql(`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      id
      conversationId
      content
      senderId
      createdAt
      sender {
        id
        firstName
        lastName
      }
    }
  }
`);

export const SEND_MESSAGE_TO_CONVERSATION_MUTATION = graphql(`
  mutation SendMessageToConversation($input: SendMessageToConversationInput!) {
    sendMessageToConversation(input: $input) {
      id
      content
      senderId
      createdAt
      sender {
        id
        firstName
        lastName
      }
    }
  }
`);

export const MARK_AS_READ_MUTATION = graphql(`
  mutation MarkConversationAsRead($conversationId: String!) {
    markConversationAsRead(conversationId: $conversationId)
  }
`);
