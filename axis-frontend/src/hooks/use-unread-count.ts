import { useQuery } from '@apollo/client/react';
import { UNREAD_COUNT_QUERY } from '@/lib/graphql/queries/messaging';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@/types/auth';

/**
 * WHY: Polls unread message count for the nav badge.
 * PATTERN: 30s poll interval keeps the badge reasonably fresh without
 * hammering the server. Skipped for admins who don't have a Messages nav item.
 */
export function useUnreadCount() {
  const { user } = useAuthStore();

  const isAdmin = user?.roles[0] === UserRole.ADMIN;

  const { data, loading } = useQuery<{ unreadMessageCount: number }>(
    UNREAD_COUNT_QUERY,
    {
      pollInterval: 30_000,
      skip: !user || isAdmin,
      fetchPolicy: 'network-only',
    },
  );

  return {
    unreadCount: data?.unreadMessageCount ?? 0,
    loading,
  };
}
