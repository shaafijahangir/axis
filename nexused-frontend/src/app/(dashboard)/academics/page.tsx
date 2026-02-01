'use client';

import { GraduationCap } from 'lucide-react';

export default function AcademicsPage() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
      <GraduationCap className="mb-4 h-12 w-12 text-muted-foreground" />
      <h1 className="text-lg font-medium">Academics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage courses, terms, departments, and academic configuration. Coming
        soon.
      </p>
    </div>
  );
}
