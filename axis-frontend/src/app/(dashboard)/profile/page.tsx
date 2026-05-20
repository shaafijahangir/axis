'use client';

import { useQuery, useMutation } from '@apollo/client/react';
import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ME_QUERY } from '@/lib/graphql/queries/user';
import { UPDATE_PROFILE_MUTATION } from '@/lib/graphql/mutations/user';
import { useAuthStore } from '@/stores/auth.store';

interface MeData {
  me: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    createdAt: string;
  };
}

function roleLabel(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function ProfilePage() {
  const { user: storeUser, setUser } = useAuthStore();

  const { data, loading } = useQuery<MeData>(ME_QUERY);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.me) {
      setFirstName(data.me.firstName);
      setLastName(data.me.lastName);
      setDirty(false);
    }
  }, [data?.me]);

  const [updateProfile] = useMutation<{
    updateProfile: { id: string; firstName: string; lastName: string };
  }>(UPDATE_PROFILE_MUTATION, {
    refetchQueries: [ME_QUERY],
  });

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const result = await updateProfile({
        variables: {
          input: { firstName: firstName.trim(), lastName: lastName.trim() },
        },
      });
      const updated = result.data?.updateProfile;
      if (updated && storeUser) {
        setUser({
          ...storeUser,
          firstName: updated.firstName,
          lastName: updated.lastName,
        });
        toast.success('Profile updated');
        setDirty(false);
      }
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const me = data?.me;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <User className="h-7 w-7 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal information.
          </p>
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Your name is visible to instructors and other users in your courses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  value={me?.email ?? ''}
                  readOnly
                  className="bg-muted text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact your administrator if needed.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} disabled={!dirty || saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-24 text-muted-foreground">Role</span>
                <div className="flex flex-wrap gap-1">
                  {me?.roles.map((r) => (
                    <Badge key={r} variant="secondary" className="capitalize">
                      {roleLabel(r)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 text-muted-foreground">Member since</span>
                <span>
                  {me?.createdAt
                    ? new Date(me.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
