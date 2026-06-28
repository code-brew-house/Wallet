'use client';

import { Alert, Group, Loader, SimpleGrid, Stack } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { PageHeader } from '../../../../components/header';
import type { EnvelopeSummary } from '../../../../features/dashboard/types';
import { EnvelopeCard } from '../../../../features/envelopes/envelope-card';
import { apiClient } from '../../../../lib/api-client';

export default function GroupEnvelopesPage() {
  const params = useParams<{ groupId: string }>();
  const [envelopes, setEnvelopes] = useState<EnvelopeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEnvelopes() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.request<EnvelopeSummary[]>(`/groups/${params.groupId}/envelopes`);
        if (!cancelled) setEnvelopes(response);
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load envelopes');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadEnvelopes();
    return () => {
      cancelled = true;
    };
  }, [params.groupId]);

  return (
    <AppShell groupId={params.groupId} active="envelopes">
      <PageHeader
        overline="Group envelopes"
        title="Envelopes"
        description="Balances, archived status, and funding needs for every group envelope."
        tone="success"
        tabs={[
          { label: 'Active', active: true },
          { label: 'Archived' },
        ]}
      />
      <Stack gap="lg">
        {error ? <Alert color="red">{error}</Alert> : null}
        {isLoading ? <Group justify="center"><Loader /></Group> : null}
        {!isLoading && envelopes.length === 0 ? (
          <Alert color="blue" title="No envelopes yet">
            Budget categories such as groceries, rent, travel, and subscriptions appear here after they are created.
          </Alert>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {envelopes.map((envelope) => <EnvelopeCard key={envelope.id} envelope={envelope} currency="INR" />)}
        </SimpleGrid>
      </Stack>
    </AppShell>
  );
}
