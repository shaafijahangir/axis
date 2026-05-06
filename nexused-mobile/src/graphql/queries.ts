import { gql } from '@apollo/client';

// ─── Feed ─────────────────────────────────────────────────────────────────────
// studentFeed: [FeedItem!]!
// FeedItemType enum: ANNOUNCEMENT | COURSE_UPDATE | DEADLINE | ENROLLMENT_UPDATE | GRADE_POSTED

export const FEED_QUERY = gql`
  query StudentFeed {
    studentFeed {
      id
      type
      title
      body
      subtitle
      dueAt
      courseTitle
      courseCode
      sectionId
      assignmentId
      pointsPossible
      score
      timestamp
    }
  }
`;

// ─── Courses ──────────────────────────────────────────────────────────────────
// CourseSection has no 'name' field

export const MY_COURSES_QUERY = gql`
  query MyEnrollments {
    myEnrollments {
      id
      status
      section {
        id
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

// ─── Timeline ─────────────────────────────────────────────────────────────────
// sectionTimeline returns flat TimelineEntry type (NOT a GraphQL union)
// TimelineEntryType enum: ANNOUNCEMENT | ASSIGNMENT | CONTENT

export const COURSE_TIMELINE_QUERY = gql`
  query SectionTimeline($sectionId: String!) {
    sectionTimeline(sectionId: $sectionId) {
      id
      type
      title
      body
      dueAt
      pointsPossible
      assignmentType
      authorName
      pinned
      publishedAt
      timestamp
    }
  }
`;

// ─── Assignments ──────────────────────────────────────────────────────────────
// Assignment.type (not assignmentType), Assignment.pointsPossible (not points)
// No mySubmission field — use mySubmissions query separately

export const ASSIGNMENT_QUERY = gql`
  query Assignment($id: String!) {
    assignment(id: $id) {
      id
      title
      description
      type
      dueAt
      pointsPossible
      maxAttempts
      timeLimitMinutes
    }
  }
`;

export const MY_SUBMISSIONS_QUERY = gql`
  query MySubmissions($assignmentId: String!) {
    mySubmissions(assignmentId: $assignmentId) {
      id
      status
      score
      feedback
      submittedAt
    }
  }
`;

export const SUBMIT_ASSIGNMENT_MUTATION = gql`
  mutation SubmitAssignment($input: CreateSubmissionInput!) {
    submitAssignment(input: $input) {
      id
      status
      submittedAt
    }
  }
`;

// ─── Grades ───────────────────────────────────────────────────────────────────
// myGrades: [CourseSectionGrades!]! — course-grouped grade summaries with pre-computed averages

export const MY_GRADES_QUERY = gql`
  query MyGrades {
    myGrades {
      courseCode
      courseTitle
      courseId
      sectionId
      overallPercentage
      totalPointsEarned
      totalPointsPossible
      assignments {
        assignmentId
        assignmentTitle
        score
        pointsPossible
        percentage
        feedback
        gradedAt
      }
    }
  }
`;

// ─── Messaging ────────────────────────────────────────────────────────────────
// DirectMessage uses 'content' (not 'body')
// conversationMessages returns PaginatedMessagesResponse { messages, hasMore, totalCount }
// sendMessageToConversation: for existing thread (conversationId + content)

export const MY_CONVERSATIONS_QUERY = gql`
  query MyConversations {
    myConversations {
      id
      title
      lastMessage {
        id
        content
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
      messages {
        id
        content
        createdAt
        sender {
          id
          firstName
          lastName
        }
      }
      hasMore
    }
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessageToConversation($input: SendMessageToConversationInput!) {
    sendMessageToConversation(input: $input) {
      id
      content
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
// AiConversation: id, agentType, courseId, status, createdAt, updatedAt
//   (no title, no messages, no lastMessage)
// AiMessage: id, role, content, createdAt, tokenCount, toolCalls, toolResults
//   (no toolName, toolInput, toolResult)
// continueConversation: renamed from sendMessage to avoid conflict with messaging module

export const MY_AI_CONVERSATIONS_QUERY = gql`
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
`;

export const AI_MESSAGES_QUERY = gql`
  query AiMessages($conversationId: String!) {
    aiMessages(conversationId: $conversationId) {
      id
      role
      content
      createdAt
    }
  }
`;

export const START_AI_CONVERSATION_MUTATION = gql`
  mutation StartConversation($input: StartConversationInput!) {
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

export const CONTINUE_AI_CONVERSATION_MUTATION = gql`
  mutation ContinueConversation($input: ContinueConversationInput!) {
    continueConversation(input: $input) {
      conversationId
      responseText
    }
  }
`;
