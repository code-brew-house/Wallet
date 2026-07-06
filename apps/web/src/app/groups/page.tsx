'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@mantine/core';
import { ApiRequestError, apiClient } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-store';
import { AuthSheetShell } from '../../components/sheet';
import { AlertBanner } from '../../components/alert-banner';

interface GroupListItem {
  id: string;
  name: string;
  currency: string;
}

export default function GroupsIndexPage() {
  const { accessToken, isRefreshing, setAccessToken } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (isRefreshing) return;

    if (!accessToken) {
      void router.replace('/login?next=/groups');
      return;
    }

    let cancelled = false;

    async function loadGroups() {
      setError(null);
      try {
        const groups = await apiClient.request<GroupListItem[]>('/groups');
        if (cancelled) return;
        const firstGroup = groups[0];
        if (firstGroup) {
          void router.replace(`/groups/${firstGroup.id}`);
        } else {
          void router.replace('/groups/new');
        }
      } catch (requestError) {
        if (cancelled) return;
        if (requestError instanceof ApiRequestError && (requestError.status === 401 || requestError.status === 403)) {
          setAccessToken(null);
          void router.replace('/login?next=/groups');
          return;
        }
        setError(requestError instanceof Error ? requestError.message : 'Unable to load groups');
      }
    }

    void loadGroups();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isRefreshing, retryNonce, router, setAccessToken]);

  return (
    <AuthSheetShell
      title="Finding your group"
      description="We could not load your Wallet groups."
      footer={
        <Button
          type="button"
          className="wallet-button-primary"
          onClick={() => setRetryNonce((value) => value + 1)}
        >
          Try again
        </Button>
      }
    >
      {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
    </AuthSheetShell>
  );
}
