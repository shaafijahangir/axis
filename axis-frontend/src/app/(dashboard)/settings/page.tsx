'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { useEffect, useState } from 'react';
import { Bell, Calendar, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { MY_NOTIFICATION_PREFERENCES_QUERY } from '@/lib/graphql/queries/notifications';
import { UPDATE_NOTIFICATION_PREFERENCES_MUTATION } from '@/lib/graphql/mutations/notifications';
import { PushSubscriptionToggle } from '@/components/notifications/push-subscription-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NotificationPreferences {
  emailOnGrade: boolean;
  emailOnAssignment: boolean;
  emailOnEnrollment: boolean;
  emailOnDueReminder: boolean;
  emailOnMessage: boolean;
}

const PREF_LABELS: {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: 'emailOnGrade',
    label: 'Grades posted',
    description: 'Get an email when an instructor grades your submission.',
  },
  {
    key: 'emailOnAssignment',
    label: 'New assignments',
    description:
      'Get an email when a new assignment is posted in your courses.',
  },
  {
    key: 'emailOnEnrollment',
    label: 'Enrollment confirmed',
    description: 'Get an email when you are successfully enrolled in a course.',
  },
  {
    key: 'emailOnDueReminder',
    label: 'Due date reminders',
    description:
      'Get reminders 24 hours and 2 hours before an unsubmitted assignment is due.',
  },
  {
    key: 'emailOnMessage',
    label: 'New messages',
    description: 'Get an email when someone sends you a direct message.',
  },
];

// ─── Calendar Card ────────────────────────────────────────────────────────────

function CalendarCard() {
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendar/token', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { url: string }) => setCalendarUrl(data.url))
      .catch(() => setCalendarUrl(null))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!calendarUrl) return;
    await navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    toast.success('Calendar URL copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
          <CardTitle>Calendar Subscription</CardTitle>
        </div>
        <CardDescription>
          Subscribe to your Axis schedule in Google Calendar, Apple Calendar, or
          Outlook. Your class times and assignment due dates sync automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating your subscription URL…
          </div>
        ) : calendarUrl ? (
          <>
            <div className="flex gap-2">
              <Input
                readOnly
                value={calendarUrl}
                className="font-mono text-xs"
                aria-label="Calendar subscription URL"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label="Copy URL"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">How to add to Google Calendar:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Copy the URL above</li>
                <li>
                  Open Google Calendar → click <strong>+</strong> next to
                  &ldquo;Other calendars&rdquo;
                </li>
                <li>
                  Choose <strong>From URL</strong>, paste the URL, and click Add
                  Calendar
                </li>
              </ol>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Could not generate calendar URL. Please refresh the page.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data, loading } = useQuery<{
    myNotificationPreferences: NotificationPreferences;
  }>(MY_NOTIFICATION_PREFERENCES_QUERY);

  const [updatePrefs] = useMutation<{
    updateNotificationPreferences: NotificationPreferences;
  }>(UPDATE_NOTIFICATION_PREFERENCES_MUTATION, {
    refetchQueries: [MY_NOTIFICATION_PREFERENCES_QUERY],
  });

  const prefs = data?.myNotificationPreferences;

  const handleToggle = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    try {
      await updatePrefs({ variables: { input: { [key]: value } } });
      toast.success(value ? 'Notification enabled' : 'Notification disabled');
    } catch {
      toast.error('Failed to update preference. Please try again.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences.
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Choose which events trigger an email to{' '}
            <span className="font-medium text-foreground">
              your account email
            </span>
            . You can turn off individual types without disabling all
            notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading preferences…
            </div>
          ) : (
            PREF_LABELS.map((item, i) => (
              <div key={item.key}>
                {i > 0 && <Separator className="my-3" />}
                <div className="flex items-start justify-between gap-4 py-1">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor={`pref-${item.key}`}
                      className="text-sm font-medium leading-none"
                    >
                      {item.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Switch
                    id={`pref-${item.key}`}
                    checked={prefs ? prefs[item.key] : true}
                    onCheckedChange={(checked) =>
                      handleToggle(item.key, checked)
                    }
                    aria-label={item.label}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
            <CardTitle>Push Notifications</CardTitle>
          </div>
          <CardDescription>
            Receive instant alerts in this browser even when the tab is in the
            background. You can disable this at any time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushSubscriptionToggle />
        </CardContent>
      </Card>

      <CalendarCard />
    </div>
  );
}
