'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { getNavForRole } from '@/lib/navigation';
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

  const items = getNavForRole(user.roles);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background md:hidden">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/home' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badgeKey === 'messages' && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
