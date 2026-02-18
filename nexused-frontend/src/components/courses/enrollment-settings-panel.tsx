'use client';

/**
 * ENROLL-002: Instructor enrollment settings panel.
 *
 * Displayed on the section page for instructors/admins.
 * Controls:
 *  - Enrollment mode (Open / Invite Only)
 *  - Auto-approve toggle
 *  - Invite code display + copy + regenerate
 *  - Pending enrollments list with approve/reject
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Copy,
  Check,
  RefreshCw,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PENDING_ENROLLMENTS_QUERY } from '@/lib/graphql/queries/courses';
import {
  GENERATE_INVITE_CODE_MUTATION,
  UPDATE_SECTION_ENROLLMENT_SETTINGS_MUTATION,
  APPROVE_ENROLLMENT_MUTATION,
  REJECT_ENROLLMENT_MUTATION,
} from '@/lib/graphql/mutations/enrollment';

interface PendingUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface PendingEnrollment {
  id: string;
  status: string;
  enrolledAt: string;
  user: PendingUser;
}

interface SectionSettings {
  enrollmentMode: 'open' | 'invite_only';
  inviteCode: string | null;
  autoApprove: boolean;
}

interface EnrollmentSettingsPanelProps {
  sectionId: string;
  initialSettings: SectionSettings;
}

export function EnrollmentSettingsPanel({
  sectionId,
  initialSettings,
}: EnrollmentSettingsPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<SectionSettings>(initialSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  // Pending enrollments — only fetched when the panel is expanded
  const { data: pendingData, refetch: refetchPending } = useQuery<{
    pendingEnrollments: PendingEnrollment[];
  }>(PENDING_ENROLLMENTS_QUERY, {
    variables: { sectionId },
    skip: collapsed,
    fetchPolicy: 'network-only',
  });

  const [generateCode, { loading: generating }] = useMutation(
    GENERATE_INVITE_CODE_MUTATION,
    {
      variables: { sectionId },
      onCompleted: (data) => {
        const s = (
          data as {
            generateInviteCode: {
              enrollmentMode: string;
              inviteCode: string;
              autoApprove: boolean;
            };
          }
        ).generateInviteCode;
        setSettings((prev) => ({
          ...prev,
          enrollmentMode: s.enrollmentMode as 'open' | 'invite_only',
          inviteCode: s.inviteCode,
        }));
      },
    },
  );

  const [updateSettings] = useMutation(
    UPDATE_SECTION_ENROLLMENT_SETTINGS_MUTATION,
  );

  const [approveEnrollment] = useMutation(APPROVE_ENROLLMENT_MUTATION);
  const [rejectEnrollment] = useMutation(REJECT_ENROLLMENT_MUTATION);

  async function handleSaveSettings(patch: Partial<SectionSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    setSavingSettings(true);
    try {
      await updateSettings({
        variables: {
          sectionId,
          mode: next.enrollmentMode.toUpperCase(),
          autoApprove: next.autoApprove,
        },
      });
    } finally {
      setSavingSettings(false);
    }
  }

  function handleCopy() {
    if (!settings.inviteCode) return;
    navigator.clipboard.writeText(settings.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleApprove(enrollmentId: string) {
    await approveEnrollment({ variables: { enrollmentId } });
    refetchPending();
  }

  async function handleReject(enrollmentId: string) {
    await rejectEnrollment({ variables: { enrollmentId } });
    refetchPending();
  }

  const pending = pendingData?.pendingEnrollments ?? [];

  return (
    <div className="rounded-lg border">
      {/* Header — always visible */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-controls="enrollment-settings-body"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Enrollment Settings</span>
          {pending.length > 0 && !collapsed && (
            <Badge variant="destructive" className="text-xs">
              {pending.length} pending
            </Badge>
          )}
        </div>
        {collapsed ? (
          <ChevronDown
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <ChevronUp
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Body */}
      {!collapsed && (
        <div id="enrollment-settings-body" className="px-4 pb-4 space-y-5">
          <Separator />

          {/* Mode selector */}
          <div className="space-y-1.5">
            <Label htmlFor="enrollment-mode-select">Enrollment Mode</Label>
            <Select
              value={settings.enrollmentMode}
              onValueChange={(v) =>
                handleSaveSettings({
                  enrollmentMode: v as 'open' | 'invite_only',
                })
              }
              disabled={savingSettings}
            >
              <SelectTrigger id="enrollment-mode-select" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="invite_only">Invite Only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.enrollmentMode === 'open'
                ? 'Any student can self-enroll from the catalog.'
                : 'Students must enter the invite code to enroll.'}
            </p>
          </div>

          {/* Auto-approve toggle */}
          <div className="flex items-center gap-3">
            <Switch
              id="auto-approve-switch"
              checked={settings.autoApprove}
              onCheckedChange={(checked) =>
                handleSaveSettings({ autoApprove: checked })
              }
              disabled={savingSettings}
            />
            <div>
              <Label htmlFor="auto-approve-switch">
                Auto-approve enrollments
              </Label>
              <p className="text-xs text-muted-foreground">
                {settings.autoApprove
                  ? 'Students are enrolled immediately.'
                  : 'Students wait in the pending queue until you approve.'}
              </p>
            </div>
          </div>

          {/* Invite code */}
          {settings.enrollmentMode === 'invite_only' && (
            <div className="space-y-2">
              <Label>Invite Code</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border bg-muted px-4 py-2 font-mono text-lg tracking-widest font-bold text-center select-all">
                  {settings.inviteCode ?? '—'}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  disabled={!settings.inviteCode}
                  aria-label="Copy invite code"
                >
                  {copied ? (
                    <Check
                      className="h-4 w-4 text-green-500"
                      aria-hidden="true"
                    />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => generateCode()}
                  disabled={generating}
                  aria-label="Generate new invite code"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with students. Regenerating invalidates the old
                code.
              </p>
            </div>
          )}

          {/* Pending enrollments */}
          {!settings.autoApprove && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Pending Enrollments
                    {pending.length > 0 && (
                      <span className="ml-2 text-muted-foreground font-normal">
                        ({pending.length})
                      </span>
                    )}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchPending()}
                    aria-label="Refresh pending enrollments"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>

                {pending.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No pending enrollment requests.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pending.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {enrollment.user.firstName}{' '}
                            {enrollment.user.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {enrollment.user.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                            onClick={() => handleApprove(enrollment.id)}
                            aria-label={`Approve ${enrollment.user.firstName} ${enrollment.user.lastName}`}
                          >
                            <UserCheck
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                            onClick={() => handleReject(enrollment.id)}
                            aria-label={`Reject ${enrollment.user.firstName} ${enrollment.user.lastName}`}
                          >
                            <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
