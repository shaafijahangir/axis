'use client';

/**
 * GRAD-003: Admin Tuition Configuration
 *
 * Allows admins to configure the institution's tuition pricing model so that
 * financial projections appear on student graduation roadmaps.
 *
 * Two pricing models are supported:
 *   1. Per-credit: student pays N * credits (community colleges, part-time)
 *   2. Flat-rate band: 12-18 credits at the same price (full-time incentive)
 *
 * Changes apply immediately to all future graduation plan views.
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import Link from 'next/link';
import {
  ChevronLeft,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { GET_TUITION_CONFIG_QUERY } from '@/lib/graphql/queries/graduation-planner';
import {
  UPDATE_TUITION_CONFIG_MUTATION,
  CLEAR_TUITION_CONFIG_MUTATION,
} from '@/lib/graphql/mutations/graduation-planner';

interface TuitionFee {
  name: string;
  amount: number;
  type: 'per_semester' | 'per_credit';
}

interface TuitionConfigForm {
  perCreditCost: string;
  flatRateMin: string;
  flatRateMax: string;
  flatRateCost: string;
  summerPerCreditCost: string;
  fees: TuitionFee[];
}

const EMPTY_FORM: TuitionConfigForm = {
  perCreditCost: '',
  flatRateMin: '',
  flatRateMax: '',
  flatRateCost: '',
  summerPerCreditCost: '',
  fees: [],
};

function parseOptionalFloat(val: string): number | undefined {
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

export default function TuitionConfigPage() {
  const [form, setForm] = useState<TuitionConfigForm>(EMPTY_FORM);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load existing config ───────────────────────────────────────────
  const { data: configData, loading } = useQuery<{
    getTuitionConfig: {
      perCreditCost?: number;
      flatRateMin?: number;
      flatRateMax?: number;
      flatRateCost?: number;
      summerPerCreditCost?: number;
      fees?: TuitionFee[];
    } | null;
  }>(GET_TUITION_CONFIG_QUERY, { fetchPolicy: 'cache-and-network' });

  // Populate form once config data arrives
  const initializedRef = useRef(false);
  useEffect(() => {
    if (configData && !initializedRef.current) {
      initializedRef.current = true;
      const cfg = configData.getTuitionConfig;
      if (cfg) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm({
          perCreditCost: cfg.perCreditCost?.toString() ?? '',
          flatRateMin: cfg.flatRateMin?.toString() ?? '',
          flatRateMax: cfg.flatRateMax?.toString() ?? '',
          flatRateCost: cfg.flatRateCost?.toString() ?? '',
          summerPerCreditCost: cfg.summerPerCreditCost?.toString() ?? '',
          fees: cfg.fees ?? [],
        });
      }
    }
  }, [configData]);

  // ── Mutations ─────────────────────────────────────────────────────
  const [updateConfig, { loading: saving }] = useMutation(
    UPDATE_TUITION_CONFIG_MUTATION,
    {
      refetchQueries: [GET_TUITION_CONFIG_QUERY],
    },
  );

  const [clearConfig, { loading: clearing }] = useMutation(
    CLEAR_TUITION_CONFIG_MUTATION,
    {
      refetchQueries: [GET_TUITION_CONFIG_QUERY],
      onCompleted: () => {
        setForm(EMPTY_FORM);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      },
    },
  );

  // ── Handlers ──────────────────────────────────────────────────────
  function handleSave() {
    setError(null);
    setSaved(false);

    const perCreditCost = parseOptionalFloat(form.perCreditCost);
    const flatRateMin = parseOptionalFloat(form.flatRateMin);
    const flatRateMax = parseOptionalFloat(form.flatRateMax);
    const flatRateCost = parseOptionalFloat(form.flatRateCost);
    const summerPerCreditCost = parseOptionalFloat(form.summerPerCreditCost);

    // Validation
    if (!perCreditCost && !flatRateCost) {
      setError(
        'At least one of Per-Credit Cost or Flat-Rate Cost must be set.',
      );
      return;
    }
    if (
      (flatRateCost || flatRateMin || flatRateMax) &&
      !(flatRateCost && flatRateMin && flatRateMax)
    ) {
      setError(
        'Flat-rate billing requires Min Credits, Max Credits, and Cost to all be set.',
      );
      return;
    }

    updateConfig({
      variables: {
        config: {
          perCreditCost,
          flatRateMin,
          flatRateMax,
          flatRateCost,
          summerPerCreditCost,
          fees: form.fees.map((f) => ({
            name: f.name,
            amount: Number(f.amount),
            type: f.type,
          })),
        },
      },
    })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : 'Failed to save config';
        setError(msg);
      });
  }

  function addFee() {
    setForm((prev) => ({
      ...prev,
      fees: [...prev.fees, { name: '', amount: 0, type: 'per_semester' }],
    }));
  }

  function updateFee(index: number, partial: Partial<TuitionFee>) {
    setForm((prev) => {
      const fees = [...prev.fees];
      fees[index] = { ...fees[index], ...partial };
      return { ...prev, fees };
    });
  }

  function removeFee(index: number) {
    setForm((prev) => ({
      ...prev,
      fees: prev.fees.filter((_, i) => i !== index),
    }));
  }

  // ── Example cost calculation ──────────────────────────────────────
  const exampleCredits = 15;
  const exampleCost = (() => {
    const perCredit = parseOptionalFloat(form.perCreditCost);
    const flatMin = parseOptionalFloat(form.flatRateMin);
    const flatMax = parseOptionalFloat(form.flatRateMax);
    const flatCost = parseOptionalFloat(form.flatRateCost);
    const feeTotal = form.fees.reduce((sum, f) => {
      if (f.type === 'per_semester') return sum + Number(f.amount);
      return sum + Number(f.amount) * exampleCredits;
    }, 0);

    if (flatCost && flatMin && flatMax && exampleCredits >= flatMin) {
      const overload = exampleCredits > flatMax ? exampleCredits - flatMax : 0;
      const tuition = flatCost + overload * (perCredit ?? 0);
      return tuition + feeTotal;
    }
    if (perCredit) return perCredit * exampleCredits + feeTotal;
    return null;
  })();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to admin"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Tuition Configuration</h1>
          <p className="text-muted-foreground text-sm">
            Set tuition rates to enable financial projections on graduation
            plans
          </p>
        </div>
      </div>

      {/* Save / error status */}
      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Tuition configuration saved. Financial projections are now active on
          student graduation plans.
        </div>
      )}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Main form */}
      <div className="rounded-xl border bg-card p-6 space-y-6">
        {/* Per-credit rate */}
        <div className="space-y-4">
          <h2 className="font-semibold text-sm">Per-Credit Rate</h2>
          <p className="text-xs text-muted-foreground">
            Applied when a student is enrolled below the flat-rate band, or when
            no flat-rate is configured. Also used for overload credits above the
            flat-rate max.
          </p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 350"
                className="pl-7 pr-3 py-2 rounded-lg border bg-background text-sm w-36 focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.perCreditCost}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    perCreditCost: e.target.value,
                  }))
                }
              />
            </div>
            <span className="text-xs text-muted-foreground">
              per credit hour
            </span>
          </div>
        </div>

        <Separator />

        {/* Flat-rate band */}
        <div className="space-y-4">
          <h2 className="font-semibold text-sm">
            Flat-Rate Band{' '}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">
            When a student is enrolled between Min and Max credits, they pay a
            flat rate (same price regardless of exact credit count). Leave blank
            to use per-credit only.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Min Credits</Label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 12"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.flatRateMin}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, flatRateMin: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Credits</Label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 18"
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.flatRateMax}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, flatRateMax: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Flat Rate Cost</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5400"
                  className="pl-7 pr-3 py-2 rounded-lg border bg-background text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.flatRateCost}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      flatRateCost: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Summer rate override */}
        <div className="space-y-4">
          <h2 className="font-semibold text-sm">
            Summer Override{' '}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">
            If summer tuition differs from the regular rate, set a separate
            per-credit cost here. Summer always uses per-credit (no flat rate).
          </p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 280"
                className="pl-7 pr-3 py-2 rounded-lg border bg-background text-sm w-36 focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.summerPerCreditCost}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    summerPerCreditCost: e.target.value,
                  }))
                }
              />
            </div>
            <span className="text-xs text-muted-foreground">
              per credit hour (summer)
            </span>
          </div>
        </div>

        <Separator />

        {/* Fees */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">Additional Fees</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Technology fees, activity fees, etc. Added on top of tuition.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8"
              onClick={addFee}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Fee
            </Button>
          </div>
          {form.fees.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No fees configured.
            </p>
          )}
          <div className="space-y-3">
            {form.fees.map((fee, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Fee name"
                  className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={fee.name}
                  onChange={(e) => updateFee(i, { name: e.target.value })}
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Amount"
                    className="pl-7 pr-3 py-2 rounded-lg border bg-background text-sm w-28 focus:outline-none focus:ring-2 focus:ring-primary"
                    value={fee.amount || ''}
                    onChange={(e) =>
                      updateFee(i, { amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <select
                  className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={fee.type}
                  onChange={(e) =>
                    updateFee(i, {
                      type: e.target.value as 'per_semester' | 'per_credit',
                    })
                  }
                >
                  <option value="per_semester">per semester</option>
                  <option value="per_credit">per credit</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFee(i)}
                  aria-label={`Remove ${fee.name || 'fee'}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Live preview */}
        {exampleCost !== null && (
          <>
            <Separator />
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
              <p className="font-medium text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Preview — {exampleCredits} credits/semester
              </p>
              <p className="text-base font-bold">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(exampleCost)}{' '}
                / semester
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ≈{' '}
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(exampleCost * 8)}{' '}
                total (8-semester plan)
              </p>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button className="gap-1.5" onClick={handleSave} disabled={saving}>
            <DollarSign className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Saving…' : 'Save Tuition Config'}
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => clearConfig()}
            disabled={clearing}
          >
            {clearing ? 'Clearing…' : 'Clear Config'}
          </Button>
        </div>
      </div>
    </div>
  );
}
