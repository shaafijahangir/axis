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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CREATE_ANNOUNCEMENT_MUTATION } from '@/lib/graphql/mutations/announcements';

type Scope = 'SCHOOL_WIDE' | 'GRADE';

export function SendSchoolAnnouncementDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [scope, setScope] = useState<Scope>('SCHOOL_WIDE');
  const [targetGrade, setTargetGrade] = useState<string>('');

  const [createAnnouncement, { loading }] = useMutation(
    CREATE_ANNOUNCEMENT_MUTATION,
    {
      onCompleted: () => {
        toast.success(
          'Announcement sent to ' +
            (scope === 'SCHOOL_WIDE' ? 'whole school' : `Grade ${targetGrade}`),
        );
        setOpen(false);
        reset();
      },
      onError: (err) => toast.error(err.message),
    },
  );

  const reset = () => {
    setTitle('');
    setBody('');
    setPriority('NORMAL');
    setScope('SCHOOL_WIDE');
    setTargetGrade('');
  };

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return;
    if (scope === 'GRADE' && !targetGrade) {
      toast.error('Please select a grade level');
      return;
    }
    createAnnouncement({
      variables: {
        input: {
          title: title.trim(),
          body: body.trim(),
          priority,
          scope,
          ...(scope === 'GRADE' && { targetGrade: parseInt(targetGrade, 10) }),
        },
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Megaphone className="mr-2 h-4 w-4" />
          School Announcement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send School Announcement</DialogTitle>
          <DialogDescription>
            Post an announcement to the whole school or a specific grade level.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHOOL_WIDE">Whole School</SelectItem>
                <SelectItem value="GRADE">Specific Grade</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === 'GRADE' && (
            <div className="space-y-2">
              <Label>Grade Level</Label>
              <Select value={targetGrade} onValueChange={setTargetGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {[8, 9, 10, 11, 12].map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      Grade {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="school-ann-title">Title</Label>
            <Input
              id="school-ann-title"
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="school-ann-body">Message</Label>
            <Textarea
              id="school-ann-body"
              placeholder="Write your announcement..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as 'NORMAL' | 'URGENT')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
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
            {loading ? 'Sending...' : 'Send Announcement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
