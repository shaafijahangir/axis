'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  CUSTOM_AGENTS_QUERY,
  AVAILABLE_TOOLS_QUERY,
} from '@/lib/graphql/queries/custom-agents';
import {
  CREATE_CUSTOM_AGENT_MUTATION,
  UPDATE_CUSTOM_AGENT_MUTATION,
  DELETE_CUSTOM_AGENT_MUTATION,
} from '@/lib/graphql/mutations/custom-agents';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  Wrench,
  Users,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ──────────────────────────────────────────────────────────────

interface CustomAgent {
  id: string;
  slug: string;
  displayName: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  allowedRoles: string[];
  maxTurns: number;
  model: string;
  isActive: boolean;
  courseId: string | null;
  createdById: string;
  createdBy?: { id: string; firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

interface AvailableTool {
  name: string;
  description: string;
  actionType: string;
  requiredPermissions: string[];
}

// ─── Helper Functions ───────────────────────────────────────────────────

function formatToolName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const roleLabels: Record<string, string> = {
  student: 'Students',
  instructor: 'Instructors',
  admin: 'Admins',
  ta: 'TAs',
  parent: 'Parents',
};

const allRoles = ['student', 'instructor', 'ta', 'admin'];

// ─── Agent Form Dialog ──────────────────────────────────────────────────

function AgentFormDialog({
  open,
  onOpenChange,
  agent,
  availableTools,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: CustomAgent | null; // null = create mode
  availableTools: AvailableTool[];
  onSave: (data: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const isEdit = agent !== null;
  const [displayName, setDisplayName] = useState(agent?.displayName ?? '');
  const [description, setDescription] = useState(agent?.description ?? '');
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? '');
  const [selectedTools, setSelectedTools] = useState<string[]>(
    agent?.tools ?? [],
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    agent?.allowedRoles ?? ['student'],
  );
  const [maxTurns, setMaxTurns] = useState(String(agent?.maxTurns ?? 10));
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    if (!displayName.trim() || displayName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (!description.trim() || description.length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }
    if (!systemPrompt.trim() || systemPrompt.length < 50) {
      setError('System prompt must be at least 50 characters');
      return;
    }
    if (selectedTools.length === 0) {
      setError('Select at least one tool');
      return;
    }
    if (selectedRoles.length === 0) {
      setError('Select at least one role');
      return;
    }

    const turns = parseInt(maxTurns, 10);
    if (isNaN(turns) || turns < 1 || turns > 30) {
      setError('Max turns must be between 1 and 30');
      return;
    }

    const data: Record<string, unknown> = {
      displayName: displayName.trim(),
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      tools: selectedTools,
      allowedRoles: selectedRoles,
      maxTurns: turns,
    };

    if (isEdit) {
      data.id = agent.id;
    }

    onSave(data);
  };

  const toggleTool = (toolName: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolName)
        ? prev.filter((t) => t !== toolName)
        : [...prev, toolName],
    );
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" aria-hidden="true" />
            {isEdit ? 'Edit Agent' : 'Create Agent'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modify your custom AI agent configuration'
              : 'Create a new AI agent for your courses. Define its personality, select tools, and set access controls.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name & Description */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name</Label>
              <Input
                id="agent-name"
                placeholder="e.g. Lab Partner, Writing Tutor"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-description">
                Description{' '}
                <span className="text-muted-foreground font-normal">
                  (shown to students when selecting)
                </span>
              </Label>
              <Textarea
                id="agent-description"
                placeholder="Help students with lab experiments by guiding them through the scientific method..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={500}
              />
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="agent-prompt">
              System Prompt{' '}
              <span className="text-muted-foreground font-normal">
                (instructions that define the agent&apos;s behavior)
              </span>
            </Label>
            <Textarea
              id="agent-prompt"
              placeholder={`You are a Lab Partner for [Course Name].

## Your Role
You help students understand lab procedures and guide them through experiments. You never give direct answers but ask guiding questions...

## What You Can Do
- Look up assignments and student submissions
- Help students interpret their results
- Suggest next steps in their experiments

## What You Must NOT Do
- Never give direct answers
- Never write lab reports for students`}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={10}
              className="font-mono text-sm"
              maxLength={10000}
            />
            <p className="text-xs text-muted-foreground">
              {systemPrompt.length.toLocaleString()} / 10,000 characters
            </p>
          </div>

          {/* Tool Selection */}
          <div className="space-y-2">
            <Label>
              Tools{' '}
              <span className="text-muted-foreground font-normal">
                ({selectedTools.length} selected)
              </span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Select the tools this agent can use. Read-only tools are safe to
              enable; suggest/blocked tools require human review.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
              {availableTools.map((tool) => (
                <label
                  key={tool.name}
                  className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedTools.includes(tool.name)}
                    onCheckedChange={() => toggleTool(tool.name)}
                    aria-label={`Select tool ${formatToolName(tool.name)}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatToolName(tool.name)}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          tool.actionType === 'auto'
                            ? 'text-green-700 border-green-300 text-[10px]'
                            : tool.actionType === 'suggest'
                              ? 'text-yellow-700 border-yellow-300 text-[10px]'
                              : 'text-red-700 border-red-300 text-[10px]'
                        }
                      >
                        {tool.actionType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {tool.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>
              Allowed Roles{' '}
              <span className="text-muted-foreground font-normal">
                (who can interact with this agent)
              </span>
            </Label>
            <div className="flex flex-wrap gap-3">
              {allRoles.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                    aria-label={`Allow ${roleLabels[role] || role}`}
                  />
                  <span className="text-sm">{roleLabels[role] || role}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Max Turns */}
          <div className="space-y-2">
            <Label htmlFor="agent-max-turns">
              Max Turns{' '}
              <span className="text-muted-foreground font-normal">
                (limits conversation depth, 1-30)
              </span>
            </Label>
            <Input
              id="agent-max-turns"
              type="number"
              min={1}
              max={30}
              value={maxTurns}
              onChange={(e) => setMaxTurns(e.target.value)}
              className="w-24"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving
              ? isEdit
                ? 'Saving...'
                : 'Creating...'
              : isEdit
                ? 'Save Changes'
                : 'Create Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Agent Card ─────────────────────────────────────────────────────────

function AgentCard({
  agent,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  agent: CustomAgent;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  return (
    <Card className={!agent.isActive ? 'opacity-60' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
              {agent.displayName}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {agent.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Switch
              checked={agent.isActive}
              onCheckedChange={onToggleActive}
              aria-label={`${agent.isActive ? 'Disable' : 'Enable'} ${agent.displayName}`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
            {agent.tools.length} tools
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {agent.allowedRoles.map((r) => roleLabels[r] || r).join(', ')}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            {agent.maxTurns} max turns
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {agent.isActive ? (
            <Badge variant="default" className="text-[10px]">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              Inactive
            </Badge>
          )}
          {agent.courseId && (
            <Badge variant="outline" className="text-[10px]">
              Course-scoped
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            custom-{agent.slug}
          </Badge>
        </div>

        {/* Creator + actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {agent.createdBy
              ? `Created by ${agent.createdBy.firstName} ${agent.createdBy.lastName}`
              : 'Created by you'}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              aria-label={`Edit ${agent.displayName}`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label={`Delete ${agent.displayName}`}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function AgentBuilderPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CustomAgent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomAgent | null>(null);

  const {
    data: agentsData,
    loading: agentsLoading,
    refetch: refetchAgents,
  } = useQuery<{ customAgents: CustomAgent[] }>(CUSTOM_AGENTS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: toolsData } = useQuery<{
    availableTools: AvailableTool[];
  }>(AVAILABLE_TOOLS_QUERY, { fetchPolicy: 'cache-first' });

  const [createAgent, { loading: creating }] = useMutation(
    CREATE_CUSTOM_AGENT_MUTATION,
    {
      onCompleted: () => {
        setFormOpen(false);
        refetchAgents();
      },
    },
  );

  const [updateAgent, { loading: updating }] = useMutation(
    UPDATE_CUSTOM_AGENT_MUTATION,
    {
      onCompleted: () => {
        setFormOpen(false);
        setEditingAgent(null);
        refetchAgents();
      },
    },
  );

  const [deleteAgent] = useMutation(DELETE_CUSTOM_AGENT_MUTATION, {
    onCompleted: () => {
      setDeleteTarget(null);
      refetchAgents();
    },
  });

  const agents = agentsData?.customAgents ?? [];
  const availableTools = toolsData?.availableTools ?? [];

  const handleSave = async (data: Record<string, unknown>) => {
    try {
      if (data.id) {
        await updateAgent({ variables: { input: data } });
      } else {
        await createAgent({ variables: { input: data } });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save agent';
      console.error(message);
    }
  };

  const handleToggleActive = async (agent: CustomAgent, isActive: boolean) => {
    try {
      await updateAgent({
        variables: { input: { id: agent.id, isActive } },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to toggle agent';
      console.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAgent({ variables: { id: deleteTarget.id } });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete agent';
      console.error(message);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/ai"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Back to AI"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bot className="h-8 w-8" aria-hidden="true" />
              Agent Builder
            </h1>
          </div>
          <p className="text-muted-foreground">
            Create custom AI agents for your courses. Define their personality,
            select tools, and control who can access them.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAgent(null);
            setFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Agent
        </Button>
      </div>

      {/* Agent List */}
      {agentsLoading && agents.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bot
              className="h-12 w-12 text-muted-foreground mb-4"
              aria-hidden="true"
            />
            <h2 className="text-lg font-semibold">No custom agents yet</h2>
            <p className="text-muted-foreground max-w-sm mt-1">
              Create your first AI agent to give your students a custom tutoring
              experience tailored to your course.
            </p>
            <Button
              className="mt-4 gap-2"
              onClick={() => {
                setEditingAgent(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={() => {
                setEditingAgent(agent);
                setFormOpen(true);
              }}
              onDelete={() => setDeleteTarget(agent)}
              onToggleActive={(active) => handleToggleActive(agent, active)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <AgentFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingAgent(null);
        }}
        agent={editingAgent}
        availableTools={availableTools}
        onSave={handleSave}
        saving={creating || updating}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.displayName}
              &quot;? This action cannot be undone. Existing conversations with
              this agent will remain, but new conversations cannot be started.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
