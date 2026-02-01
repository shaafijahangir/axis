'use client';

import { Users } from 'lucide-react';

export default function PeoplePage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <Users className="mb-4 h-12 w-12 text-muted-foreground" />
      <h1 className="text-lg font-medium">People</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage students, instructors, and staff across your institution. Coming
        soon.
      </p>
    </div>
  );
}
