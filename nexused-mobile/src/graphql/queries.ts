import { gql } from '@apollo/client';

// ─── Feed ─────────────────────────────────────────────────────────────────────

export const FEED_QUERY = gql`
  query MyFeedItems {
    myFeedItems {
      id
      itemType
      title
      body
      priority
      dueAt
      courseTitle
      courseSectionId
      referenceId
      isRead
      createdAt
    }
  }
`;

export const MARK_FEED_READ_MUTATION = gql`
  mutation MarkFeedItemRead($feedItemId: String!) {
    markFeedItemRead(feedItemId: $feedItemId)
  }
`;

// ─── Courses ──────────────────────────────────────────────────────────────────

export const MY_COURSES_QUERY = gql`
  query MyEnrollments {
    myEnrollments {
      id
      status
      section {
        id
        name
        course {
          id
          code
          title
          description
        }
        instructor {
          firstName
          lastName
        }
      }
    }
  }
`;

export const COURSE_TIMELINE_QUERY = gql`
  query CourseTimeline($sectionId: String!) {
    courseTimeline(sectionId: $sectionId) {
      ... on Assignment {
        __typename
        id
        title
        description
        assignmentType
        dueAt
        points
      }
      ... on Announcement {
        __typename
        id
        title
        body
        createdAt
      }
      ... on CourseContent {
        __typename
        id
        title
        contentType
        publishedAt
      }
    }
  }
`;

// ─── Assignments ──────────────────────────────────────────────────────────────

export const ASSIGNMENT_QUERY = gql`
  query Assignment($id: String!) {
    assignment(id: $id) {
      id
      title
      description
      assignmentType
      dueAt
      points
      maxAttempts
      timeLimitMinutes
      mySubmission {
        id
        status
        score
        feedback
        submittedAt
      }
    }
  }
`;

export const SUBMIT_ASSIGNMENT_MUTATION = gql`
  mutation CreateSubmission($input: CreateSubmissionInput!) {
    createSubmission(input: $input) {
      id
      status
      submittedAt
    }
  }
`;

// ─── Grades ───────────────────────────────────────────────────────────────────

export const MY_GRADES_QUERY = gql`
  query MyGrades {
    myEnrollments {
      id
      section {
        id
        name
        course {
          id
          code
          title
        }
      }
      submissions {
        id
        status
        score
        submittedAt
        assignment {
          id
          title
          points
          dueAt
        }
      }
    }
  }
`;

// ─── Messaging ────────────────────────────────────────────────────────────────

export const MY_CONVERSATIONS_QUERY = gql`
  query MyConversations {
    myConversations {
      id
      title
      lastMessage {
        id
        body
        createdAt
        sender {
          firstName
          lastName
        }
      }
      otherParticipants {
        id
        firstName
        lastName
      }
      unreadCount
    }
  }
`;

export const CONVERSATION_MESSAGES_QUERY = gql`
  query ConversationMessages($conversationId: String!) {
    conversationMessages(conversationId: $conversationId) {
      id
      body
      createdAt
      sender {
        id
        firstName
        lastName
      }
    }
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      id
      body
      createdAt
      sender {
        id
        firstName
        lastName
      }
    }
  }
`;

// ─── Notifications ────────────────────────────────────────────────────────────

export const REGISTER_DEVICE_TOKEN_MUTATION = gql`
  mutation RegisterDeviceToken($token: String!, $platform: DevicePlatform!) {
    registerDeviceToken(token: $token, platform: $platform)
  }
`;

export const MY_NOTIFICATIONS_QUERY = gql`
  query MyNotifications($limit: Int, $offset: Int) {
    myNotifications(limit: $limit, offset: $offset) {
      id
      type
      title
      body
      data
      read
      createdAt
    }
  }
`;

export const UNREAD_NOTIFICATION_COUNT_QUERY = gql`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const MARK_NOTIFICATION_READ_MUTATION = gql`
  mutation MarkNotificationRead($id: String!) {
    markNotificationRead(id: $id) {
      id
      read
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ_MUTATION = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

// ─── AI ───────────────────────────────────────────────────────────────────────

export const MY_AI_CONVERSATIONS_QUERY = gql`
  query MyAiConversations {
    myAiConversations {
      id
      title
      agentType
      createdAt
      lastMessage {
        role
        content
        createdAt
      }
    }
  }
`;

export const AI_CONVERSATION_QUERY = gql`
  query AiConversation($id: String!) {
    aiConversation(id: $id) {
      id
      title
      agentType
      messages {
        id
        role
        content
        createdAt
        toolName
        toolInput
        toolResult
      }
    }
  }
`;

export const START_AI_CONVERSATION_MUTATION = gql`
  mutation StartAiConversation($input: StartAiConversationInput!) {
    startAiConversation(input: $input) {
      id
      agentType
    }
  }
`;

export const SEND_AI_MESSAGE_MUTATION = gql`
  mutation SendAiMessage($conversationId: String!, $content: String!) {
    sendAiMessage(conversationId: $conversationId, content: $content) {
      id
      role
      content
      createdAt
      toolName
    }
  }
`;
