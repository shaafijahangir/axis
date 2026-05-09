import { gql } from '@apollo/client';

export const MY_CONVERSATIONS_QUERY = gql`
  query MyConversations {
    myConversations {
      id
      title
      lastMessage {
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
      unreadCount
      otherParticipants {
        id
        firstName
        lastName
      }
      createdAt
      updatedAt
    }
  }
`;

export const CONVERSATION_MESSAGES_QUERY = gql`
  query ConversationMessages(
    $conversationId: String!
    $cursor: String
    $limit: Int
  ) {
    conversationMessages(
      conversationId: $conversationId
      cursor: $cursor
      limit: $limit
    ) {
      messages {
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
      totalCount
      hasMore
    }
  }
`;

export const MY_CONTACTS_QUERY = gql`
  query MyContacts {
    myContacts {
      id
      firstName
      lastName
      email
      roles
      relationship
    }
  }
`;

export const UNREAD_COUNT_QUERY = gql`
  query UnreadMessageCount {
    unreadMessageCount
  }
`;
