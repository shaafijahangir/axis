'use client';

import { useMutation } from '@apollo/client/react';
import { toast } from 'sonner';
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
  DEACTIVATE_USER_MUTATION,
  ACTIVATE_USER_MUTATION,
} from '@/lib/graphql/mutations/admin-users';

interface DeactivateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
  } | null;
  onSuccess: () => void;
}

export function DeactivateUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: DeactivateUserDialogProps) {
  const isActive = user?.status === 'active';

  const [deactivate, { loading: deactivating }] = useMutation(
    DEACTIVATE_USER_MUTATION,
    {
      onCompleted: () => {
        toast.success('User deactivated');
        onOpenChange(false);
        onSuccess();
      },
      onError: (error) => toast.error(error.message),
    },
  );

  const [activate, { loading: activating }] = useMutation(
    ACTIVATE_USER_MUTATION,
    {
      onCompleted: () => {
        toast.success('User activated');
        onOpenChange(false);
        onSuccess();
      },
      onError: (error) => toast.error(error.message),
    },
  );

  const handleConfirm = () => {
    if (!user) return;
    if (isActive) {
      deactivate({ variables: { id: user.id } });
    } else {
      activate({ variables: { id: user.id } });
    }
  };

  const loading = deactivating || activating;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isActive ? 'Deactivate' : 'Activate'} User
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActive
              ? `Are you sure you want to deactivate ${user?.firstName} ${user?.lastName}? They will no longer be able to log in.`
              : `Are you sure you want to reactivate ${user?.firstName} ${user?.lastName}? They will be able to log in again.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={
              isActive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : ''
            }
          >
            {loading
              ? isActive
                ? 'Deactivating...'
                : 'Activating...'
              : isActive
                ? 'Deactivate'
                : 'Activate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
