'use client';

import { GraduationCap } from 'lucide-react';
import { UserMenu } from './user-menu';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function TopNav() {
  return (
    <header
      aria-label="Top navigation bar"
      className="flex h-16 items-center justify-between border-b bg-card px-6"
    >
      <div className="flex items-center gap-2 md:hidden">
        <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
        <span className="text-lg font-bold">NexusEd</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-1">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
