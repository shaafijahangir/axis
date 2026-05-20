'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Megaphone, Pin, Plus, AlertTriangle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ADMIN_ANNOUNCEMENTS_QUERY } from '@/lib/graphql/queries/announcements';
import { AnnouncementComposerDialog } from '@/components/admin/announcement-composer-dialog';

/**
 * SPRINT-4: Admin /admin/announcements landing — list of every
 * announcement in the tenant + a button to compose a new one.
 */

interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  scope: 'SCHOOL_WIDE' | 'GRADE' | 'SECTION';
  targetGrade: number | null;
  priority: 'NORMAL' | 'URGENT';
  pinned: boolean;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
  section: {
    id: string;
    course: { id: string; code: string; title: string };
  } | null;
}

function scopeLabel(a: AdminAnnouncement): string {
  if (a.scope === 'SCHOOL_WIDE') return 'School-wide';
  if (a.scope === 'GRADE') return `Grade ${a.targetGrade}`;
  return a.section ? `${a.section.course.code}` : 'Section';
}

export default function AdminAnnouncementsPage() {
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [composerOpen, setComposerOpen] = useState(false);

  const { data, loading } = useQuery<{
    adminAnnouncements: {
      items: AdminAnnouncement[];
      totalCount: number;
      page: number;
      pageSize: number;
    };
  }>(ADMIN_ANNOUNCEMENTS_QUERY, {
    variables: {
      scope: scopeFilter === 'all' ? null : scopeFilter,
      page: 1,
      pageSize: 50,
    },
    fetchPolicy: 'cache-and-network',
  });

  const announcements = data?.adminAnnouncements.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Megaphone className="h-6 w-6 text-muted-foreground" />
            Announcements
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage school-wide, grade-level, and section announcements.
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            <SelectItem value="SCHOOL_WIDE">School-wide</SelectItem>
            <SelectItem value="GRADE">Grade-level</SelectItem>
            <SelectItem value="SECTION">Section</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {data?.adminAnnouncements.totalCount ?? 0} total
        </span>
      </div>

      {loading && announcements.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No announcements yet.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setComposerOpen(true)}
            >
              Send the first one →
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{scopeLabel(a)}</Badge>
                      {a.pinned && (
                        <Badge variant="outline" className="gap-1">
                          <Pin className="h-3 w-3" /> Pinned
                        </Badge>
                      )}
                      {a.priority === 'URGENT' && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Urgent
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mt-1.5 text-base">
                      {a.title}
                    </CardTitle>
                    <CardDescription>
                      {a.author.firstName} {a.author.lastName} ·{' '}
                      {new Date(a.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {a.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AnnouncementComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
      />
    </div>
  );
}
