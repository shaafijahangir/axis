'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { getMobileNavForRole } from '@/lib/navigation';
import { useUnreadCount } from '@/hooks/use-unread-count';

/**
 * WHY: Fixed bottom bar for mobile. Mirrors the sidebar nav items per role.
 * PATTERN: iOS-style tab bar — icon + label, active state uses primary colour.
 * Hidden on md+ via `md:hidden`; the sidebar takes over on desktop.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unreadCount } = useUnreadCount();

  if (!user) return null;

  const items = getMobileNavForRole(user.roles);

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background md:hidden"
    >
      <div className="flex items-center justify-around" role="list">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/home' && pathname.startsWith(item.href));
          const hasUnread = item.badgeKey === 'messages' && unreadCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              role="listitem"
              aria-current={isActive ? 'page' : undefined}
              aria-label={
                hasUnread
                  ? `${item.label}, ${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`
                  : item.label
              }
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {hasUnread && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span aria-hidden="true">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
