import { gql } from '@apollo/client';

export const SCHOOL_ANNOUNCEMENTS_QUERY = gql`
  query SchoolAnnouncements($grade: Int) {
    schoolAnnouncements(grade: $grade) {
      id
      title
      body
      scope
      targetGrade
      priority
      pinned
      createdAt
      author {
        id
        firstName
        lastName
      }
    }
  }
`;

/** SPRINT-4: Paginated admin list for /admin/announcements. */
export const ADMIN_ANNOUNCEMENTS_QUERY = gql`
  query AdminAnnouncements(
    $scope: AnnouncementScope
    $page: Int
    $pageSize: Int
  ) {
    adminAnnouncements(scope: $scope, page: $page, pageSize: $pageSize) {
      totalCount
      page
      pageSize
      items {
        id
        title
        body
        scope
        targetGrade
        priority
        pinned
        createdAt
        author {
          id
          firstName
          lastName
          roles
        }
        section {
          id
          course {
            id
            code
            title
          }
        }
      }
    }
  }
`;

/**
 * SPRINT-4: Drives the live "Visible to N students" preview in the
 * composer. Cheap enough to call on every scope/target change.
 */
export const ANNOUNCEMENT_RECIPIENT_COUNT_QUERY = gql`
  query AnnouncementRecipientCount(
    $scope: AnnouncementScope!
    $targetGrade: Int
    $sectionId: String
  ) {
    announcementRecipientCount(
      scope: $scope
      targetGrade: $targetGrade
      sectionId: $sectionId
    )
  }
`;
