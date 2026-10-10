import { graphql } from '@/lib/graphql/__generated__';

export const MY_CONVERSATIONS_QUERY = graphql(`
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
`);

export const CONVERSATION_MESSAGES_QUERY = graphql(`
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
`);

export const MY_CONTACTS_QUERY = graphql(`
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
`);

export const UNREAD_COUNT_QUERY = graphql(`
  query UnreadMessageCount {
    unreadMessageCount
  }
`);
