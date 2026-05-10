'use client';

import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  useWidgetPreferences,
  StudentWidgetType,
  InstructorWidgetType,
} from '@/hooks/use-widget-preferences';

/**
 * Human-readable labels for student widgets.
 */
const STUDENT_WIDGET_LABELS: Record<
  StudentWidgetType,
  { label: string; description: string }
> = {
  deadlines: {
    label: 'Upcoming Deadlines',
    description: 'Assignments and quizzes due soon',
  },
  grades: {
    label: 'Recent Grades',
    description: 'Newly posted grades and feedback',
  },
  announcements: {
    label: 'Announcements',
    description: 'Messages from your instructors',
  },
  courseUpdates: {
    label: 'Course Updates',
    description: 'New materials and content',
  },
};

/**
 * Human-readable labels for instructor widgets.
 */
const INSTRUCTOR_WIDGET_LABELS: Record<
  InstructorWidgetType,
  { label: string; description: string }
> = {
  ungraded: {
    label: 'Ungraded Submissions',
    description: 'Assignments waiting for your review',
  },
  upcomingDeadlines: {
    label: 'Upcoming Deadlines',
    description: 'Assignment deadlines in your courses',
  },
  announcements: {
    label: 'Announcements',
    description: 'Recent course announcements',
  },
};

interface WidgetSettingsProps {
  userRole: 'student' | 'instructor';
}

/**
 * Widget settings dialog for customizing dashboard feed.
 */
export function WidgetSettings({ userRole }: WidgetSettingsProps) {
  const { isWidgetEnabled, toggleWidget, loading } = useWidgetPreferences();

  const widgets =
    userRole === 'student' ? STUDENT_WIDGET_LABELS : INSTRUCTOR_WIDGET_LABELS;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Customize</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Customize Your Feed</DialogTitle>
          <DialogDescription>
            Choose which types of updates appear on your dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {Object.entries(widgets).map(([key, config]) => {
            const widgetKey = key as StudentWidgetType | InstructorWidgetType;
            const enabled = isWidgetEnabled(widgetKey);
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <div className="space-y-0.5">
                  <Label htmlFor={key} className="text-sm font-medium">
                    {config.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                </div>
                <Switch
                  id={key}
                  checked={enabled}
                  disabled={loading}
                  onCheckedChange={() => toggleWidget(widgetKey)}
                  aria-label={`Toggle ${config.label}`}
                />
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
