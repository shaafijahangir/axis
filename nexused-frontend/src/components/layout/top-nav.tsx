'use client';

import { GraduationCap } from 'lucide-react';
import { UserMenu } from './user-menu';

export function TopNav() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2 md:hidden">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">NexusEd</span>
      </div>
      <div className="hidden md:block" />
      <UserMenu />
    </header>
  );
}
