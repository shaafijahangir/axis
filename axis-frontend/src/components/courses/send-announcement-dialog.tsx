'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CREATE_ANNOUNCEMENT_MUTATION } from '@/lib/graphql/mutations/announcements';
import { SECTION_TIMELINE_QUERY } from '@/lib/graphql/queries/timeline';

interface SendAnnouncementDialogProps {
  sectionId: string;
}

export function SendAnnouncementDialog({
  sectionId,
}: SendAnnouncementDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [pinned, setPinned] = useState(false);

  const [createAnnouncement, { loading }] = useMutation(
    CREATE_ANNOUNCEMENT_MUTATION,
    {
      refetchQueries: [
        { query: SECTION_TIMELINE_QUERY, variables: { sectionId } },
      ],
      onCompleted: () => {
        toast.success('Announcement sent');
        setOpen(false);
        resetForm();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const resetForm = () => {
    setTitle('');
    setBody('');
    setPriority('normal');
    setPinned(false);
  };

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return;
    createAnnouncement({
      variables: {
        input: {
          sectionId,
          title: title.trim(),
          body: body.trim(),
          priority,
          pinned,
        },
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Megaphone className="mr-1 h-4 w-4" />
          Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Announcement</DialogTitle>
          <DialogDescription>
            Send an announcement to all students in this section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ann-body">Message</Label>
            <Textarea
              id="ann-body"
              placeholder="Write your announcement..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as 'normal' | 'urgent')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="ann-pinned"
                checked={pinned}
                onCheckedChange={(v) => setPinned(v === true)}
              />
              <Label htmlFor="ann-pinned" className="text-sm">
                Pin to top
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !body.trim()}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
