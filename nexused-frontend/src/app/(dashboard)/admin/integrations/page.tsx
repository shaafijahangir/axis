'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  LTI_PLATFORMS_QUERY,
  LTI_TOOL_CONFIGURATION_QUERY,
} from '@/lib/graphql/queries/lti';
import {
  CREATE_LTI_PLATFORM_MUTATION,
  DELETE_LTI_PLATFORM_MUTATION,
} from '@/lib/graphql/mutations/lti';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  Settings,
  Link as LinkIcon,
} from 'lucide-react';

interface LtiPlatformInfo {
  id: string;
  name: string;
  issuer: string;
  clientId: string;
  status: string;
  deploymentCount: number;
  userCount: number;
  createdAt: string;
}

interface LtiToolConfiguration {
  issuer: string;
  clientId: string;
  oidcLoginUrl: string;
  launchUrl: string;
  jwksUrl: string;
  deepLinkUrl: string;
  scopes: string[];
}

export default function LtiIntegrationsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    issuer: '',
    clientId: '',
    authorizationEndpoint: '',
    tokenEndpoint: '',
    jwksEndpoint: '',
  });

  const {
    data: platformsData,
    loading: platformsLoading,
    refetch,
  } = useQuery<{
    ltiPlatforms: LtiPlatformInfo[];
  }>(LTI_PLATFORMS_QUERY);
  const { data: configData } = useQuery<{
    ltiToolConfiguration: LtiToolConfiguration;
  }>(LTI_TOOL_CONFIGURATION_QUERY);

  const [createPlatform, { loading: creating }] = useMutation(
    CREATE_LTI_PLATFORM_MUTATION,
    {
      onCompleted: () => {
        setIsAddDialogOpen(false);
        setFormData({
          name: '',
          issuer: '',
          clientId: '',
          authorizationEndpoint: '',
          tokenEndpoint: '',
          jwksEndpoint: '',
        });
        refetch();
      },
    },
  );

  const [deletePlatform] = useMutation(DELETE_LTI_PLATFORM_MUTATION, {
    onCompleted: () => refetch(),
  });

  const platforms: LtiPlatformInfo[] = platformsData?.ltiPlatforms || [];
  const toolConfig: LtiToolConfiguration | undefined =
    configData?.ltiToolConfiguration;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPlatform({
      variables: {
        input: formData,
      },
    });
  };

  const handleDelete = async (id: string) => {
    if (
      confirm('Are you sure you want to delete this platform registration?')
    ) {
      await deletePlatform({ variables: { id } });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-500">Inactive</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LTI Integrations</h1>
          <p className="text-muted-foreground">
            Connect Axis with external learning platforms using LTI 1.3
          </p>
        </div>
      </div>

      {/* Tool Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" aria-hidden="true" />
            Axis Tool Configuration
          </CardTitle>
          <CardDescription>
            Use these values when registering Axis in your LMS (Canvas,
            Brightspace, Moodle, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {toolConfig ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  OIDC Login URL
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-2 py-1 text-sm">
                    {toolConfig.oidcLoginUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(toolConfig.oidcLoginUrl)}
                    aria-label="Copy OIDC Login URL"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Launch URL
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-2 py-1 text-sm">
                    {toolConfig.launchUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(toolConfig.launchUrl)}
                    aria-label="Copy Launch URL"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  JWKS URL
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-2 py-1 text-sm">
                    {toolConfig.jwksUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(toolConfig.jwksUrl)}
                    aria-label="Copy JWKS URL"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Deep Linking URL
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted px-2 py-1 text-sm">
                    {toolConfig.deepLinkUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(toolConfig.deepLinkUrl || '')
                    }
                    aria-label="Copy Deep Linking URL"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Required Scopes
                </Label>
                <div className="flex flex-wrap gap-1">
                  {toolConfig.scopes.map((scope) => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scope.split('/').pop()}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">
              Loading configuration...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Platforms */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" aria-hidden="true" />
              Registered Platforms
            </CardTitle>
            <CardDescription>
              External LMS platforms that can launch Axis via LTI
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Add Platform
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Register LTI Platform</DialogTitle>
                <DialogDescription>
                  Enter the LTI 1.3 configuration from your LMS admin panel
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Platform Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., University Canvas"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issuer">Issuer URL</Label>
                    <Input
                      id="issuer"
                      placeholder="https://canvas.instructure.com"
                      value={formData.issuer}
                      onChange={(e) =>
                        setFormData({ ...formData, issuer: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      placeholder="From platform's LTI registration"
                      value={formData.clientId}
                      onChange={(e) =>
                        setFormData({ ...formData, clientId: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authorizationEndpoint">
                      Authorization Endpoint
                    </Label>
                    <Input
                      id="authorizationEndpoint"
                      placeholder="https://..."
                      value={formData.authorizationEndpoint}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          authorizationEndpoint: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tokenEndpoint">Token Endpoint</Label>
                    <Input
                      id="tokenEndpoint"
                      placeholder="https://..."
                      value={formData.tokenEndpoint}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tokenEndpoint: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jwksEndpoint">JWKS Endpoint</Label>
                    <Input
                      id="jwksEndpoint"
                      placeholder="https://..."
                      value={formData.jwksEndpoint}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          jwksEndpoint: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Registering...' : 'Register Platform'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {platformsLoading ? (
            <div className="text-muted-foreground">Loading platforms...</div>
          ) : platforms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <LinkIcon
                className="mx-auto h-12 w-12 mb-4 opacity-50"
                aria-hidden="true"
              />
              <p>No platforms registered yet</p>
              <p className="text-sm">
                Add a platform to enable LTI launches from external LMS systems
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>Issuer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deployments</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {platforms.map((platform) => (
                  <TableRow key={platform.id}>
                    <TableCell className="font-medium">
                      {platform.name}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{platform.issuer}</code>
                    </TableCell>
                    <TableCell>{getStatusBadge(platform.status)}</TableCell>
                    <TableCell>{platform.deploymentCount}</TableCell>
                    <TableCell>{platform.userCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          aria-label={`View ${platform.name} details`}
                        >
                          <a
                            href={`/admin/integrations/${platform.id}`}
                            aria-label={`Configure ${platform.name}`}
                          >
                            <ExternalLink
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(platform.id)}
                          aria-label={`Delete ${platform.name}`}
                        >
                          <Trash2
                            className="h-4 w-4 text-destructive"
                            aria-hidden="true"
                          />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ol className="space-y-2">
            <li>
              <strong>Configure Axis in your LMS</strong>: Go to your LMS
              admin panel (Canvas Admin → Developer Keys, Brightspace → External
              Learning Tools, etc.) and create a new LTI 1.3 tool using the
              configuration above.
            </li>
            <li>
              <strong>Get platform credentials</strong>: Your LMS will provide
              you with an issuer URL, client ID, and endpoint URLs. Copy these
              values.
            </li>
            <li>
              <strong>Register the platform here</strong>: Click{' '}
              {'"Add Platform"'}
              and enter the credentials from your LMS.
            </li>
            <li>
              <strong>Test the integration</strong>: Create a test assignment in
              your LMS and launch Axis. The first launch will activate the
              platform registration.
            </li>
            <li>
              <strong>Link courses</strong>: Once users launch from the LMS,
              their course contexts will appear here. Link them to Axis
              sections for grade passback and roster sync.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
