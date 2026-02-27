'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import {
  ChevronLeft,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Calendar,
  BookOpen,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ENROLLMENT_POLICY_QUERY } from '@/lib/graphql/queries/enrollment-policy';
import { UPDATE_ENROLLMENT_POLICY_MUTATION } from '@/lib/graphql/mutations/enrollment-policy';

// ─── Types ──────────────────────────────────────────────────────────────

interface EnrollmentPolicy {
  prerequisiteEnforcement: 'strict' | 'warn' | 'off';
  creditHourLimitPerTerm: number | null;
  enrollmentWindowStart: string | null;
  enrollmentWindowEnd: string | null;
}

interface PolicyForm {
  prerequisiteEnforcement: 'strict' | 'warn' | 'off';
  creditHourLimitPerTerm: string; // string for input binding
  enrollmentWindowStart: string;
  enrollmentWindowEnd: string;
}

const EMPTY_FORM: PolicyForm = {
  prerequisiteEnforcement: 'warn',
  creditHourLimitPerTerm: '18',
  enrollmentWindowStart: '',
  enrollmentWindowEnd: '',
};

function policyToForm(policy: EnrollmentPolicy): PolicyForm {
  return {
    prerequisiteEnforcement: policy.prerequisiteEnforcement,
    creditHourLimitPerTerm:
      policy.creditHourLimitPerTerm != null
        ? String(policy.creditHourLimitPerTerm)
        : '',
    enrollmentWindowStart: policy.enrollmentWindowStart
      ? policy.enrollmentWindowStart.slice(0, 16) // trim to datetime-local format
      : '',
    enrollmentWindowEnd: policy.enrollmentWindowEnd
      ? policy.enrollmentWindowEnd.slice(0, 16)
      : '',
  };
}

// ─── Enforcement Mode Descriptions ──────────────────────────────────────

const ENFORCEMENT_META: Record<
  'strict' | 'warn' | 'off',
  { label: string; description: string; icon: React.ReactNode }
> = {
  strict: {
    label: 'Strict — Block enrollment',
    description:
      'Students cannot enroll if prerequisites are not met. Recommended for programs with strict sequencing requirements.',
    icon: <ShieldCheck className="h-4 w-4 text-red-500" />,
  },
  warn: {
    label: 'Warn — Log but allow',
    description:
      'Enrollment proceeds, but the missing prerequisite is logged. Suitable for flexible programs, transfer students, and late admits.',
    icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  },
  off: {
    label: 'Off — No prerequisite checking',
    description:
      'Prerequisites are not enforced at all. Use for open enrollment institutions or when prerequisite data is incomplete.',
    icon: <BookOpen className="h-4 w-4 text-muted-foreground" />,
  },
};

// ─── Main Page ──────────────────────────────────────────────────────────

export default function EnrollmentPolicyPage() {
  const [form, setForm] = useState<PolicyForm>(EMPTY_FORM);
  const [saved, setSaved] = useState(false);

  const { data, loading } = useQuery<{ enrollmentPolicy: EnrollmentPolicy }>(
    ENROLLMENT_POLICY_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );

  useEffect(() => {
    if (data?.enrollmentPolicy) {
      setForm(policyToForm(data.enrollmentPolicy));
    }
  }, [data]);

  const [updatePolicy, { loading: saving }] = useMutation<{
    updateEnrollmentPolicy: EnrollmentPolicy;
  }>(UPDATE_ENROLLMENT_POLICY_MUTATION, {
    onCompleted: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = async () => {
    const creditLimit = form.creditHourLimitPerTerm
      ? parseInt(form.creditHourLimitPerTerm, 10)
      : null;

    try {
      await updatePolicy({
        variables: {
          input: {
            prerequisiteEnforcement: form.prerequisiteEnforcement,
            creditHourLimitPerTerm: creditLimit,
            enrollmentWindowStart: form.enrollmentWindowStart || null,
            enrollmentWindowEnd: form.enrollmentWindowEnd || null,
          },
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      console.error(msg);
    }
  };

  const selectedMeta = ENFORCEMENT_META[form.prerequisiteEnforcement];

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/analytics"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Admin Dashboard
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          Enrollment Policy
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure rules that apply to all enrollment paths — self-service,
          AI-assisted, and bulk imports.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Prerequisite Enforcement */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Prerequisite Enforcement
              </CardTitle>
              <CardDescription>
                How strictly prerequisite requirements are checked when a
                student attempts to enroll.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Enforcement Mode</Label>
                <Select
                  value={form.prerequisiteEnforcement}
                  onValueChange={(val) =>
                    setForm((f) => ({
                      ...f,
                      prerequisiteEnforcement: val as 'strict' | 'warn' | 'off',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(ENFORCEMENT_META) as [
                        'strict' | 'warn' | 'off',
                        (typeof ENFORCEMENT_META)[keyof typeof ENFORCEMENT_META],
                      ][]
                    ).map(([key, meta]) => (
                      <SelectItem key={key} value={key}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Contextual description of selected mode */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                {selectedMeta.icon}
                <p className="text-muted-foreground">
                  {selectedMeta.description}
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Credit Hour Limit */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" aria-hidden="true" />
                Credit Hour Limit Per Term
              </CardTitle>
              <CardDescription>
                Maximum credits a student may enroll in during a single academic
                term. Leave blank to allow unlimited credits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="credit-limit">Max Credits Per Term</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="credit-limit"
                  type="number"
                  min={1}
                  max={30}
                  placeholder="e.g. 18"
                  className="w-32"
                  value={form.creditHourLimitPerTerm}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      creditHourLimitPerTerm: e.target.value,
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Default is 18. Students trying to enroll beyond this limit will
                see a clear error message with their current credit count.
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Enrollment Window */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Enrollment Window
              </CardTitle>
              <CardDescription>
                Restrict when students can enroll. Leave both fields blank to
                allow enrollment at any time. The window applies across all
                sections for this institution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="window-start">Opens At</Label>
                  <Input
                    id="window-start"
                    type="datetime-local"
                    value={form.enrollmentWindowStart}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        enrollmentWindowStart: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="window-end">Closes At</Label>
                  <Input
                    id="window-end"
                    type="datetime-local"
                    value={form.enrollmentWindowEnd}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        enrollmentWindowEnd: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      enrollmentWindowStart: '',
                      enrollmentWindowEnd: '',
                    }))
                  }
                >
                  Clear window (open enrollment)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Changes take effect immediately for all future enrollment
              attempts.
            </p>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saved ? (
                <>
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  Saved
                </>
              ) : saving ? (
                'Saving...'
              ) : (
                'Save Policy'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
