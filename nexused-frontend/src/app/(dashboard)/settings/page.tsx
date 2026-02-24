'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { Bell, Loader2 } from 'lucide-react';
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
    </div>
  );
}
