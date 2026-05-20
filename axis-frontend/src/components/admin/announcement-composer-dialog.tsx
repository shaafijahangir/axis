'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { toast } from 'sonner';
import { Megaphone, Users, AlertTriangle, Pin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CREATE_ANNOUNCEMENT_MUTATION } from '@/lib/graphql/mutations/announcements';
import { ANNOUNCEMENT_RECIPIENT_COUNT_QUERY } from '@/lib/graphql/queries/announcements';
import { ADMIN_SECTIONS_QUERY } from '@/lib/graphql/queries/admin-academics';

/**
 * SPRINT-4: Admin announcement composer with all three scopes.
 *  - SCHOOL_WIDE → goes to every active student
 *  - GRADE → goes to active students with matching gradeLevel
 *  - SECTION → goes to active enrollees in that section
 *
 * Drives a live recipient count preview so admins can sanity-check
 * audience before they send.
 */

type Scope = 'SCHOOL_WIDE' | 'GRADE' | 'SECTION';
type Priority = 'NORMAL' | 'URGENT';

interface AdminSectionOption {
  id: string;
  course: { code: string; title: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnnouncementComposerDialog({ open, onOpenChange }: Props) {
  const [scope, setScope] = useState<Scope>('SCHOOL_WIDE');
  const [targetGrade, setTargetGrade] = useState<string>('');
  const [sectionId, setSectionId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [pinned, setPinned] = useState(false);

  const { data: sectionsData } = useQuery<{
    adminSections: AdminSectionOption[];
  }>(ADMIN_SECTIONS_QUERY, { skip: scope !== 'SECTION' });

  const recipientVars = {
    scope,
    targetGrade:
      scope === 'GRADE' && targetGrade ? parseInt(targetGrade) : null,
    sectionId: scope === 'SECTION' ? sectionId || null : null,
  };

  const skipRecipientQuery =
    (scope === 'GRADE' && !targetGrade) || (scope === 'SECTION' && !sectionId);

  const { data: countData, loading: countLoading } = useQuery<{
    announcementRecipientCount: number;
  }>(ANNOUNCEMENT_RECIPIENT_COUNT_QUERY, {
    variables: recipientVars,
    skip: skipRecipientQuery,
    fetchPolicy: 'cache-and-network',
  });

  const [createAnnouncement, { loading: sending }] = useMutation(
    CREATE_ANNOUNCEMENT_MUTATION,
    {
      onCompleted: () => {
        toast.success('Announcement sent');
        reset();
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
      // Refetch by query name so we don't have to know what variables
      // the calling page is using (scope filter, pagination, etc.).
      refetchQueries: ['AdminAnnouncements'],
      awaitRefetchQueries: true,
    },
  );

  const reset = () => {
    setScope('SCHOOL_WIDE');
    setTargetGrade('');
    setSectionId('');
    setTitle('');
    setBody('');
    setPriority('NORMAL');
    setPinned(false);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const canSubmit =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (scope === 'SCHOOL_WIDE' ||
      (scope === 'GRADE' && targetGrade !== '') ||
      (scope === 'SECTION' && sectionId !== ''));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const input: Record<string, unknown> = {
      scope,
      title: title.trim(),
      body: body.trim(),
      priority,
      pinned,
    };
    if (scope === 'GRADE') input.targetGrade = parseInt(targetGrade);
    if (scope === 'SECTION') input.sectionId = sectionId;
    createAnnouncement({ variables: { input } });
  };

  const recipientCount = countData?.announcementRecipientCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
          <DialogDescription>
            Post to the whole school, a specific grade, or one course section.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Audience</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'SCHOOL_WIDE' as const, label: 'School-wide' },
                { v: 'GRADE' as const, label: 'Grade' },
                { v: 'SECTION' as const, label: 'Section' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setScope(opt.v)}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    scope === opt.v
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {scope === 'GRADE' && (
            <div className="space-y-2">
              <Label>Grade Level</Label>
              <Select value={targetGrade} onValueChange={setTargetGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a grade…" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      Grade {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === 'SECTION' && (
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={sectionId} onValueChange={setSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section…" />
                </SelectTrigger>
                <SelectContent>
                  {(sectionsData?.adminSections ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.course.code} — {s.course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!skipRecipientQuery && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {countLoading
                  ? 'Calculating audience…'
                  : `Visible to ${recipientCount ?? 0} ${
                      recipientCount === 1 ? 'student' : 'students'
                    }`}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              placeholder="Short, scannable headline"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ann-body">Message</Label>
            <Textarea
              id="ann-body"
              placeholder="Write your announcement…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Priority)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => setPinned((p) => !p)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors ${
                pinned
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-input hover:bg-accent'
              }`}
            >
              <Pin className="h-3.5 w-3.5" />
              {pinned ? 'Pinned' : 'Pin to top'}
            </button>
            {priority === 'URGENT' && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> Urgent
              </Badge>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={sending || !canSubmit}>
              <Megaphone className="mr-2 h-4 w-4" />
              {sending ? 'Sending…' : 'Send Announcement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
