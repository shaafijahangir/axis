import { gql } from '@apollo/client';

export const SEND_MESSAGE_MUTATION = gql`
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
`;

export const SEND_MESSAGE_TO_CONVERSATION_MUTATION = gql`
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
`;

export const MARK_AS_READ_MUTATION = gql`
  mutation MarkConversationAsRead($conversationId: String!) {
    markConversationAsRead(conversationId: $conversationId)
  }
`;
