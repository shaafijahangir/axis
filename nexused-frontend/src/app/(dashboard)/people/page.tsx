'use client';

import { UsersTable } from '@/components/admin/users-table';

export default function PeoplePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">People</h1>
        <p className="text-muted-foreground">
          Manage students, instructors, and staff across your institution.
        </p>
      </div>
      <UsersTable />
    </div>
  );
}
