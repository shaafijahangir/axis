'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TermsTable } from '@/components/admin/terms-table';
import { CoursesTable } from '@/components/admin/courses-table';
import { SectionsTable } from '@/components/admin/sections-table';
import { EnrollmentsTable } from '@/components/admin/enrollments-table';

export default function AcademicsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Academics</h1>
        <p className="text-muted-foreground">
          Manage terms, courses, sections, and enrollments.
        </p>
      </div>

      <Tabs defaultValue="terms">
        <div className="overflow-x-auto pb-px">
          <TabsList className="w-max">
            <TabsTrigger value="terms">Terms</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="terms" className="mt-4">
          <TermsTable />
        </TabsContent>

        <TabsContent value="courses" className="mt-4">
          <CoursesTable />
        </TabsContent>

        <TabsContent value="sections" className="mt-4">
          <SectionsTable />
        </TabsContent>

        <TabsContent value="enrollments" className="mt-4">
          <EnrollmentsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
