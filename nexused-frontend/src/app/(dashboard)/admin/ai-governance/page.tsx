'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  AI_GOVERNANCE_CONFIG_QUERY,
  AI_AUDIT_LOGS_QUERY,
  AI_USAGE_TREND_QUERY,
} from '@/lib/graphql/queries/governance';
import {
  UPDATE_AI_GOVERNANCE_CONFIG_MUTATION,
  UPDATE_TOOL_PERMISSION_MUTATION,
  RESET_TOOL_PERMISSION_MUTATION,
} from '@/lib/graphql/mutations/governance';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Sparkles,
  Zap,
  DollarSign,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Activity,
  AlertTriangle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────

type ActionType = 'auto' | 'suggest' | 'blocked';

interface ToolPermission {
  toolName: string;
  description: string;
  defaultActionType: ActionType;
  effectiveActionType: ActionType;
  isOverridden: boolean;
  requiredPermissions: string[];
}

interface GovernanceConfig {
  enabled: boolean;
  effectiveMaxRequestsPerMinute: number;
  effectiveMaxTokensPerDay: number;
  monthlyBudgetUsd: number | null;
  currentMonthCostUsd: number;
  currentDayTokensUsed: number;
  totalToolOverrides: number;
  toolPermissions: ToolPermission[];
}

interface AuditLogEntry {
  id: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  agentType: string;
  conversationId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  model: string;
  createdAt: string;
}

interface AuditLogPage {
  entries: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface DailyUsagePoint {
  date: string;
  requests: number;
  tokens: number;
  costUsd: number;
}

interface UsageTrend {
  dailyUsage: DailyUsagePoint[];
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
}

// ─── Helper Components ──────────────────────────────────────────────────

function ActionTypeBadge({ type }: { type: ActionType }) {
  const styles: Record<ActionType, string> = {
    auto: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    suggest:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    blocked: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  const labels: Record<ActionType, string> = {
    auto: 'Auto',
    suggest: 'Suggest',
    blocked: 'Blocked',
  };

  return (
    <Badge variant="outline" className={styles[type]}>
      {labels[type]}
    </Badge>
  );
}

function formatToolName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatAgentName(agentType: string): string {
  const names: Record<string, string> = {
    'study-coach': 'Study Coach',
    'feedback-copilot': 'Feedback Copilot',
  };
  return names[agentType] || agentType;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

// ─── Loading Skeleton ───────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tool Permissions Tab ───────────────────────────────────────────────

function ToolPermissionsSection({
  tools,
  onUpdatePermission,
  onResetPermission,
}: {
  tools: ToolPermission[];
  onUpdatePermission: (toolName: string, actionType: ActionType) => void;
  onResetPermission: (toolName: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" aria-hidden="true" />
          Tool Permissions
        </CardTitle>
        <CardDescription>
          Control what AI agents can do. &quot;Auto&quot; executes immediately,
          &quot;Suggest&quot; proposes to the instructor, &quot;Blocked&quot;
          prevents the action entirely.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium">Tool</th>
                <th className="text-left py-3 px-2 font-medium hidden md:table-cell">
                  Description
                </th>
                <th className="text-center py-3 px-2 font-medium">Default</th>
                <th className="text-center py-3 px-2 font-medium">Current</th>
                <th className="text-center py-3 px-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.toolName} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2">
                    <div className="font-medium">
                      {formatToolName(tool.toolName)}
                    </div>
                    <div className="text-xs text-muted-foreground md:hidden mt-1">
                      {tool.description}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-muted-foreground hidden md:table-cell max-w-[300px]">
                    {tool.description}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <ActionTypeBadge type={tool.defaultActionType} />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Select
                      value={tool.effectiveActionType}
                      onValueChange={(value: string) =>
                        onUpdatePermission(tool.toolName, value as ActionType)
                      }
                    >
                      <SelectTrigger
                        className="w-[120px] mx-auto"
                        aria-label={`Permission for ${formatToolName(tool.toolName)}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="suggest">Suggest</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {tool.isOverridden && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onResetPermission(tool.toolName)}
                        aria-label={`Reset ${formatToolName(tool.toolName)} to default`}
                      >
                        <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Rate Limits & Budget Section ───────────────────────────────────────

function RateLimitsSection({
  config,
  onUpdate,
}: {
  config: GovernanceConfig;
  onUpdate: (updates: Record<string, unknown>) => void;
}) {
  const [rpmValue, setRpmValue] = useState(
    String(config.effectiveMaxRequestsPerMinute),
  );
  const [tokensValue, setTokensValue] = useState(
    String(config.effectiveMaxTokensPerDay),
  );
  const [budgetValue, setBudgetValue] = useState(
    config.monthlyBudgetUsd !== null ? String(config.monthlyBudgetUsd) : '',
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" aria-hidden="true" />
            Rate Limits
          </CardTitle>
          <CardDescription>
            Control how frequently AI can be used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rpm">Requests per minute (per user)</Label>
            <div className="flex gap-2">
              <Input
                id="rpm"
                type="number"
                min={1}
                value={rpmValue}
                onChange={(e) => setRpmValue(e.target.value)}
              />
              <Button
                onClick={() => {
                  const val = parseInt(rpmValue, 10);
                  if (!isNaN(val) && val >= 1) {
                    onUpdate({ maxRequestsPerMinute: val });
                  }
                }}
                variant="outline"
                size="sm"
              >
                Save
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="daily-tokens">
              Daily token budget (per tenant)
            </Label>
            <div className="flex gap-2">
              <Input
                id="daily-tokens"
                type="number"
                min={1000}
                step={10000}
                value={tokensValue}
                onChange={(e) => setTokensValue(e.target.value)}
              />
              <Button
                onClick={() => {
                  const val = parseInt(tokensValue, 10);
                  if (!isNaN(val) && val >= 1000) {
                    onUpdate({ maxTokensPerDay: val });
                  }
                }}
                variant="outline"
                size="sm"
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Today&apos;s usage: {formatTokens(config.currentDayTokensUsed)} /{' '}
              {formatTokens(config.effectiveMaxTokensPerDay)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" aria-hidden="true" />
            Monthly Budget
          </CardTitle>
          <CardDescription>Set a monthly cost cap for AI usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-budget">Monthly budget (USD)</Label>
            <div className="flex gap-2">
              <Input
                id="monthly-budget"
                type="number"
                min={0}
                step={10}
                placeholder="No limit"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value)}
              />
              <Button
                onClick={() => {
                  const val = budgetValue ? parseFloat(budgetValue) : null;
                  if (val === null || (!isNaN(val) && val >= 0)) {
                    onUpdate({ monthlyBudgetUsd: val });
                  }
                }}
                variant="outline"
                size="sm"
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty for unlimited. Current month:{' '}
              <span className="font-medium">
                ${config.currentMonthCostUsd.toFixed(2)}
              </span>
              {config.monthlyBudgetUsd !== null && (
                <span>
                  {' '}
                  / ${config.monthlyBudgetUsd.toFixed(2)}
                  {config.currentMonthCostUsd >= config.monthlyBudgetUsd && (
                    <span className="text-red-600 ml-1 font-medium">
                      (LIMIT REACHED)
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>

          {/* Budget Progress */}
          {config.monthlyBudgetUsd !== null && config.monthlyBudgetUsd > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget usage</span>
                <span className="font-medium">
                  {(
                    (config.currentMonthCostUsd / config.monthlyBudgetUsd) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    config.currentMonthCostUsd / config.monthlyBudgetUsd > 0.9
                      ? 'bg-red-500'
                      : config.currentMonthCostUsd / config.monthlyBudgetUsd >
                          0.7
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(100, (config.currentMonthCostUsd / config.monthlyBudgetUsd) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Usage Trend Section ────────────────────────────────────────────────

function UsageTrendSection({ trend }: { trend: UsageTrend }) {
  if (trend.dailyUsage.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" aria-hidden="true" />
            Usage Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No AI usage data yet.</p>
        </CardContent>
      </Card>
    );
  }

  const maxTokens = Math.max(...trend.dailyUsage.map((d) => d.tokens), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" aria-hidden="true" />
          Usage Trend (Last 30 Days)
        </CardTitle>
        <CardDescription>
          {trend.totalRequests.toLocaleString()} requests |{' '}
          {formatTokens(trend.totalTokens)} tokens | $
          {trend.totalCostUsd.toFixed(2)} cost
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-[2px] h-32">
          {trend.dailyUsage.map((day) => {
            const height = maxTokens > 0 ? (day.tokens / maxTokens) * 100 : 0;
            return (
              <div
                key={day.date}
                className="flex-1 bg-primary/80 hover:bg-primary rounded-t transition-colors cursor-default"
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${day.date}: ${day.requests} req, ${formatTokens(day.tokens)} tokens, $${day.costUsd.toFixed(4)}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{trend.dailyUsage[0]?.date}</span>
          <span>{trend.dailyUsage[trend.dailyUsage.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Audit Logs Section ─────────────────────────────────────────────────

function AuditLogsSection() {
  const [page, setPage] = useState(1);
  const [agentFilter, setAgentFilter] = useState<string>('all');

  const { data, loading } = useQuery<{
    aiAuditLogs: AuditLogPage;
  }>(AI_AUDIT_LOGS_QUERY, {
    variables: {
      filters: {
        page,
        pageSize: 15,
        agentType: agentFilter !== 'all' ? agentFilter : undefined,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const logs = data?.aiAuditLogs;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" aria-hidden="true" />
              Audit Log
            </CardTitle>
            <CardDescription>
              {logs
                ? `${logs.totalCount.toLocaleString()} total entries`
                : 'Loading...'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="agent-filter" className="sr-only">
              Filter by agent
            </Label>
            <Select
              value={agentFilter}
              onValueChange={(v) => {
                setAgentFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger
                id="agent-filter"
                className="w-[180px]"
                aria-label="Filter by agent type"
              >
                <SelectValue placeholder="All agents" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                <SelectItem value="study-coach">Study Coach</SelectItem>
                <SelectItem value="feedback-copilot">
                  Feedback Copilot
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !logs ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : logs && logs.entries.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-medium">User</th>
                    <th className="text-left py-2 px-2 font-medium">Agent</th>
                    <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">
                      Input
                    </th>
                    <th className="text-right py-2 px-2 font-medium hidden sm:table-cell">
                      Output
                    </th>
                    <th className="text-right py-2 px-2 font-medium">Cost</th>
                    <th className="text-right py-2 px-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.entries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">
                        <div className="font-medium">
                          {entry.userFirstName} {entry.userLastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.userEmail}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline">
                          {formatAgentName(entry.agentType)}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right hidden sm:table-cell">
                        {entry.inputTokens.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right hidden sm:table-cell">
                        {entry.outputTokens.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right">
                        ${entry.estimatedCostUsd.toFixed(4)}
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">
                        {formatRelativeTime(entry.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {logs.page} of {Math.ceil(logs.totalCount / logs.pageSize)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!logs.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            No audit log entries found.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function AiGovernancePage() {
  const {
    data: configData,
    loading: configLoading,
    error: configError,
    refetch: refetchConfig,
  } = useQuery<{ aiGovernanceConfig: GovernanceConfig }>(
    AI_GOVERNANCE_CONFIG_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );

  const { data: trendData } = useQuery<{ aiUsageTrend: UsageTrend }>(
    AI_USAGE_TREND_QUERY,
    { variables: { days: 30 }, fetchPolicy: 'cache-and-network' },
  );

  const [updateConfig] = useMutation(UPDATE_AI_GOVERNANCE_CONFIG_MUTATION, {
    onCompleted: () => refetchConfig(),
  });
  const [updateToolPermission] = useMutation(UPDATE_TOOL_PERMISSION_MUTATION, {
    onCompleted: () => refetchConfig(),
  });
  const [resetToolPermission] = useMutation(RESET_TOOL_PERMISSION_MUTATION, {
    onCompleted: () => refetchConfig(),
  });

  if (configLoading && !configData) {
    return (
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Governance</h1>
          <p className="text-muted-foreground">
            Configure AI behavior for your institution
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (configError) {
    return (
      <div className="container py-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Failed to load governance config: {configError.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // GraphQL returns enum key names (uppercase: "AUTO", "SUGGEST", "BLOCKED").
  // Normalize to lowercase so SelectItem values and ActionTypeBadge keys match.
  const rawConfig = configData?.aiGovernanceConfig;
  const config = rawConfig
    ? {
        ...rawConfig,
        toolPermissions: rawConfig.toolPermissions.map((t) => ({
          ...t,
          defaultActionType: t.defaultActionType.toLowerCase() as ActionType,
          effectiveActionType:
            t.effectiveActionType.toLowerCase() as ActionType,
        })),
      }
    : null;
  if (!config) return null;

  const trend = trendData?.aiUsageTrend;

  const handleUpdateConfig = async (updates: Record<string, unknown>) => {
    try {
      await updateConfig({ variables: { input: updates } });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update config';
      console.error(message);
    }
  };

  const handleUpdatePermission = async (
    toolName: string,
    actionType: ActionType,
  ) => {
    try {
      // GraphQL mutation enum values must be key names (uppercase).
      await updateToolPermission({
        variables: {
          input: { toolName, actionType: actionType.toUpperCase() },
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update permission';
      console.error(message);
    }
  };

  const handleResetPermission = async (toolName: string) => {
    try {
      await resetToolPermission({
        variables: { input: { toolName } },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to reset permission';
      console.error(message);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" aria-hidden="true" />
            AI Governance
          </h1>
          <p className="text-muted-foreground">
            Configure AI behavior, permissions, and budgets for your institution
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="ai-enabled" className="text-sm font-medium">
            AI {config.enabled ? 'Enabled' : 'Disabled'}
          </Label>
          <Switch
            id="ai-enabled"
            checked={config.enabled}
            onCheckedChange={(checked) =>
              handleUpdateConfig({ enabled: checked })
            }
            aria-label="Toggle AI features"
          />
        </div>
      </div>

      {/* AI Disabled Warning */}
      {!config.enabled && (
        <Card className="border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-950">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle
              className="h-5 w-5 text-orange-600"
              aria-hidden="true"
            />
            <p className="text-sm text-orange-800 dark:text-orange-200">
              AI features are currently disabled for your institution. Students
              and instructors cannot access AI agents.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tool Overrides
            </CardTitle>
            <Shield
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {config.totalToolOverrides}
            </div>
            <p className="text-xs text-muted-foreground">
              of {config.toolPermissions.length} tools customized
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limit</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {config.effectiveMaxRequestsPerMinute}
            </div>
            <p className="text-xs text-muted-foreground">
              requests per minute per user
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Tokens
            </CardTitle>
            <Sparkles
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTokens(config.currentDayTokensUsed)}
            </div>
            <p className="text-xs text-muted-foreground">
              of {formatTokens(config.effectiveMaxTokensPerDay)} daily budget
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Month&apos;s Cost
            </CardTitle>
            <DollarSign
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${config.currentMonthCostUsd.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {config.monthlyBudgetUsd !== null
                ? `of $${config.monthlyBudgetUsd.toFixed(2)} budget`
                : 'no budget limit'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <Tabs defaultValue="tools">
        <div className="overflow-x-auto pb-px">
          <TabsList className="w-max">
            <TabsTrigger value="tools">Tool Permissions</TabsTrigger>
            <TabsTrigger value="limits">Rate Limits & Budget</TabsTrigger>
            <TabsTrigger value="usage">Usage Trend</TabsTrigger>
            <TabsTrigger value="logs">Audit Log</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tools" className="mt-4">
          <ToolPermissionsSection
            tools={config.toolPermissions}
            onUpdatePermission={handleUpdatePermission}
            onResetPermission={handleResetPermission}
          />
        </TabsContent>

        <TabsContent value="limits" className="mt-4">
          <RateLimitsSection config={config} onUpdate={handleUpdateConfig} />
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          {trend ? (
            <UsageTrendSection trend={trend} />
          ) : (
            <Card>
              <CardContent className="py-8">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <AuditLogsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
