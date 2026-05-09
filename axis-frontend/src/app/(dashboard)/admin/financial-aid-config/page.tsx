'use client';

/**
 * GRAD-004: Admin Financial Aid Configuration Page
 *
 * Admins configure per-semester enrollment intensity thresholds and the
 * SAP (Satisfactory Academic Progress) maximum timeframe rule. Once set,
 * these are applied to every student's graduation plan and appear as
 * yellow (below full-time) or red (approaching SAP limit) warning badges
 * on the /planner/roadmap page.
 *
 * Config is stored in Tenant.settings.financialAidConfig (JSONB).
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import {
  ChevronLeft,
  AlertTriangle,
  ShieldAlert,
  Save,
  Trash2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { GET_FINANCIAL_AID_CONFIG_QUERY } from '@/lib/graphql/queries/graduation-planner';
import {
  UPDATE_FINANCIAL_AID_CONFIG_MUTATION,
  CLEAR_FINANCIAL_AID_CONFIG_MUTATION,
} from '@/lib/graphql/mutations/graduation-planner';

interface FinancialAidConfig {
  fullTimeThreshold?: number | null;
  halfTimeThreshold?: number | null;
  maxTimeframePercent?: number | null;
}

// ─── Preview component ────────────────────────────────────────────────────────

function AidPreview({
  fullTime,
  halfTime,
  maxPct,
}: {
  fullTime: number;
  halfTime: number;
  maxPct: number;
}) {
  const scenarios = [
    {
      credits: 15,
      cumulative: 60,
      totalRequired: 120,
      label: '15 credits (typical full-time)',
    },
    {
      credits: 9,
      cumulative: 90,
      totalRequired: 120,
      label: '9 credits (part-time)',
    },
    {
      credits: 3,
      cumulative: 105,
      totalRequired: 120,
      label: '3 credits (below half-time)',
    },
    {
      credits: 12,
      cumulative: 168,
      totalRequired: 120,
      label: '12 credits at 140% timeframe',
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h3 className="font-semibold text-sm">Preview</h3>
      <p className="text-xs text-muted-foreground">
        How these thresholds appear on graduation plan semesters:
      </p>
      <div className="space-y-3">
        {scenarios.map((s) => {
          const isFullTime = s.credits >= fullTime;
          const isHalfTime = s.credits >= halfTime;
          const sapLimit = s.totalRequired * (maxPct / 100);
          const pct = Math.round((s.cumulative / s.totalRequired) * 100);
          const hasSap =
            s.cumulative >= sapLimit * 0.9 && s.cumulative <= sapLimit * 1.1;
          const aidWarn = !isFullTime;

          return (
            <div
              key={s.label}
              className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                hasSap
                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                  : aidWarn
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                    : 'bg-muted/30'
              }`}
            >
              <span className="text-muted-foreground">{s.label}</span>
              <div className="flex items-center gap-2">
                {hasSap && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-semibold">
                    <ShieldAlert className="h-3 w-3" />
                    SAP Risk ({pct}%)
                  </span>
                )}
                {!hasSap && aidWarn && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">
                    <AlertTriangle className="h-3 w-3" />
                    {isHalfTime ? 'Below Full-Time' : 'Below Half-Time'}
                  </span>
                )}
                {!hasSap && !aidWarn && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    ✓ Full-time
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinancialAidConfigPage() {
  const [fullTime, setFullTime] = useState(12);
  const [halfTime, setHalfTime] = useState(6);
  const [maxPct, setMaxPct] = useState(150);
  const [saved, setSaved] = useState(false);
  const initializedRef = useRef(false);

  const { data, loading } = useQuery<{
    getFinancialAidConfig: FinancialAidConfig | null;
  }>(GET_FINANCIAL_AID_CONFIG_QUERY, { fetchPolicy: 'network-only' });

  // Populate form from existing config (useEffect to avoid onCompleted issue)
  useEffect(() => {
    if (data && !initializedRef.current) {
      initializedRef.current = true;
      const cfg = data.getFinancialAidConfig;
      if (cfg) {
        /* eslint-disable react-hooks/set-state-in-effect */
        if (cfg.fullTimeThreshold != null) setFullTime(cfg.fullTimeThreshold);
        if (cfg.halfTimeThreshold != null) setHalfTime(cfg.halfTimeThreshold);
        if (cfg.maxTimeframePercent != null) setMaxPct(cfg.maxTimeframePercent);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    }
  }, [data]);

  const [updateConfig, { loading: saving }] = useMutation(
    UPDATE_FINANCIAL_AID_CONFIG_MUTATION,
    {
      refetchQueries: [{ query: GET_FINANCIAL_AID_CONFIG_QUERY }],
    },
  );

  const [clearConfig, { loading: clearing }] = useMutation(
    CLEAR_FINANCIAL_AID_CONFIG_MUTATION,
    {
      refetchQueries: [{ query: GET_FINANCIAL_AID_CONFIG_QUERY }],
    },
  );

  async function handleSave() {
    await updateConfig({
      variables: {
        config: {
          fullTimeThreshold: fullTime,
          halfTimeThreshold: halfTime,
          maxTimeframePercent: maxPct,
        },
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleClear() {
    if (
      !confirm(
        'Remove financial aid configuration? Aid warnings will no longer appear on student graduation plans.',
      )
    )
      return;
    await clearConfig();
    setFullTime(12);
    setHalfTime(6);
    setMaxPct(150);
  }

  function numInput(setter: (n: number) => void, min: number, max: number) {
    return (v: string) => {
      const n = parseInt(v);
      if (!isNaN(n) && n >= min && n <= max) setter(n);
    };
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/analytics"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to admin"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Financial Aid Configuration</h1>
          <p className="text-muted-foreground text-sm">
            Set enrollment intensity and SAP thresholds for graduation plan
            warnings
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Enrollment intensity thresholds */}
          <div className="rounded-xl border bg-card p-5 space-y-5">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Enrollment Intensity Thresholds
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Semesters below these thresholds receive warning badges. Federal
                defaults: full-time = 12, half-time = 6.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Full-Time Threshold (credits)</Label>
                <Input
                  type="number"
                  min={1}
                  max={25}
                  value={fullTime}
                  onChange={(e) => numInput(setFullTime, 1, 25)(e.target.value)}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Below this → yellow &quot;may affect aid&quot; badge
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Half-Time Threshold (credits)</Label>
                <Input
                  type="number"
                  min={1}
                  max={25}
                  value={halfTime}
                  onChange={(e) => numInput(setHalfTime, 1, 25)(e.target.value)}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Below this → stronger &quot;significant impact&quot; badge
                </p>
              </div>
            </div>
          </div>

          {/* SAP max timeframe */}
          <div className="rounded-xl border bg-card p-5 space-y-5">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                Satisfactory Academic Progress (SAP) Rule
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Students cannot attempt more than this percentage of total
                required credits. A warning triggers when cumulative credits
                reach 90% of the limit. Federal default: 150%.
              </p>
            </div>

            <div className="space-y-1.5 max-w-xs">
              <Label className="text-sm">
                Maximum Timeframe (% of program credits)
              </Label>
              <Input
                type="number"
                min={100}
                max={300}
                value={maxPct}
                onChange={(e) => numInput(setMaxPct, 100, 300)(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                e.g. 150% → a 120-credit program allows max 180 attempted
                credits
              </p>
            </div>

            {/* SAP info callout */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground">
              <Info
                className="h-3.5 w-3.5 mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>
                The SAP warning appears on plan semesters where the
                student&apos;s cumulative credits exceed 90% of the configured
                limit. A &quot;contact financial aid office immediately&quot;
                warning appears when cumulative credits reach or exceed the full
                limit.
              </span>
            </div>
          </div>

          {/* Preview */}
          <AidPreview fullTime={fullTime} halfTime={halfTime} maxPct={maxPct} />

          <Separator />

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Configuration'}
            </Button>

            {data?.getFinancialAidConfig && (
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={clearing}
                className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {clearing ? 'Clearing…' : 'Clear Configuration'}
              </Button>
            )}
          </div>

          {/* Current config summary */}
          {data?.getFinancialAidConfig && (
            <div className="text-xs text-muted-foreground p-3 rounded-lg border bg-muted/30">
              <strong>Current config:</strong> Full-time ≥{' '}
              {data.getFinancialAidConfig.fullTimeThreshold ?? 12} credits,
              half-time ≥ {data.getFinancialAidConfig.halfTimeThreshold ?? 6}{' '}
              credits, SAP max{' '}
              {data.getFinancialAidConfig.maxTimeframePercent ?? 150}% of
              program credits
            </div>
          )}
        </div>
      )}
    </div>
  );
}
