'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { BellRing, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { VAPID_PUBLIC_KEY_QUERY } from '@/lib/graphql/queries/notifications';
import { REGISTER_DEVICE_TOKEN_MUTATION } from '@/lib/graphql/mutations/notifications';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushSubscriptionToggle() {
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported'
  >('idle');

  const { data: vapidData } = useQuery<{
    vapidPublicKey: { publicKey: string | null };
  }>(VAPID_PUBLIC_KEY_QUERY);

  const [registerToken] = useMutation(REGISTER_DEVICE_TOKEN_MUTATION);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setStatus('subscribed');
      })
      .catch(() => {});
  }, []);

  const handleEnable = async () => {
    const publicKey = vapidData?.vapidPublicKey?.publicKey;
    if (!publicKey) {
      toast.error('Push notifications are not configured on this server.');
      return;
    }

    setStatus('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        toast.error(
          'Permission denied. Enable notifications in your browser settings.',
        );
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await registerToken({
        variables: {
          token: JSON.stringify(subscription),
          platform: 'WEB',
        },
      });

      setStatus('subscribed');
      toast.success('Browser notifications enabled');
    } catch (err) {
      setStatus('idle');
      const message =
        err instanceof Error ? err.message : 'Failed to enable notifications';
      toast.error(message);
    }
  };

  const handleDisable = async () => {
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setStatus('idle');
      toast.success('Browser notifications disabled');
    } catch {
      setStatus('subscribed');
      toast.error('Failed to disable notifications');
    }
  };

  if (status === 'unsupported') {
    return (
      <p className="text-xs text-muted-foreground">
        Your browser does not support push notifications.
      </p>
    );
  }

  if (status === 'denied') {
    return (
      <p className="text-xs text-muted-foreground">
        Notifications are blocked. Allow them in your browser&apos;s site
        settings, then reload.
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium leading-none">
          Browser notifications
        </p>
        <p className="text-xs text-muted-foreground">
          {status === 'subscribed'
            ? 'You will receive push notifications in this browser.'
            : 'Get instant alerts even when the tab is in the background.'}
        </p>
      </div>
      {status === 'subscribed' ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleDisable()}
          disabled={status === ('loading' as string)}
          className="shrink-0"
        >
          <BellOff className="mr-1.5 h-4 w-4" />
          Disable
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => void handleEnable()}
          disabled={status === 'loading'}
          className="shrink-0"
        >
          {status === 'loading' ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <BellRing className="mr-1.5 h-4 w-4" />
          )}
          Enable
        </Button>
      )}
    </div>
  );
}
