'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { getNavForRole } from '@/lib/navigation';
import { Separator } from '@/components/ui/separator';
import { useUnreadCount } from '@/hooks/use-unread-count';

/**
 * WHY: Role-specific nav pulled from centralised `navigation.ts`.
 * PATTERN: Active state matches exact path OR startsWith for nested routes
 * (e.g. /courses/[id] highlights the Courses item).
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { unreadCount } = useUnreadCount();

  const items = user ? getNavForRole(user.roles) : [];

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">NexusEd</span>
      </div>
      <Separator />
      <nav className="flex flex-col gap-1 p-4">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/home' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.badgeKey === 'messages' && unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
