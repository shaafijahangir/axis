'use client';

import Link from 'next/link';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UsersTable } from '@/components/admin/users-table';

export default function PeoplePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">People</h1>
          <p className="text-muted-foreground">
            Manage students, instructors, and staff across your institution.
          </p>
        </div>
        {/* SPRINT-5: discoverable bulk import entry point */}
        <Button variant="outline" asChild>
          <Link href="/admin/catalog/import">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Link>
        </Button>
      </div>
      <UsersTable />
    </div>
  );
}
