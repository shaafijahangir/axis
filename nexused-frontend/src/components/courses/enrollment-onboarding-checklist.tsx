'use client';

/**
 * ENROLL-004: Onboarding checklist shown on a student's first visit to a
 * newly enrolled section. Dismissable — state stored per-section in
 * localStorage so it persists across page refreshes.
 *
 * Shown only when: enrollment status === 'active' AND not yet dismissed.
 */

import { useState } from 'react';
import { X, BookOpen, ListChecks, Bot } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EnrollmentOnboardingChecklistProps {
  sectionId: string;
}

const CHECKLIST_ITEMS = [
  {
    icon: BookOpen,
    label: 'Review your course timeline',
    description:
      'Scroll down to see assignments, announcements, and course materials.',
    href: null,
  },
  {
    icon: ListChecks,
    label: 'Check your upcoming assignments',
    description:
      'Deadlines and point values are shown on each assignment card.',
    href: null,
  },
  {
    icon: Bot,
    label: 'Meet your Study Coach',
    description:
      'Your AI tutor is ready to help with questions, study plans, and more.',
    href: '/ai',
  },
] as const;

export function EnrollmentOnboardingChecklist({
  sectionId,
}: EnrollmentOnboardingChecklistProps) {
  const storageKey = `Axis_onboarding_dismissed_${sectionId}`;

  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) !== 'true';
  });

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Welcome to your new course!</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Here&apos;s how to get started:
            </p>
            <ul className="mt-3 space-y-2.5">
              {CHECKLIST_ITEMS.map(
                ({ icon: Icon, label, description, href }) => (
                  <li key={label} className="flex items-start gap-2">
                    <Icon
                      className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      {href ? (
                        <Link
                          href={href}
                          className="text-sm font-medium hover:underline"
                        >
                          {label}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">{label}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </li>
                ),
              )}
            </ul>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-muted-foreground"
            onClick={handleDismiss}
            aria-label="Dismiss onboarding checklist"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
