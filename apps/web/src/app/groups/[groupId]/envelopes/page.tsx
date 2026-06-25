'use client';

import { Alert, Container, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EnvelopeCard } from '../../../../features/envelopes/envelope-card';
import type { EnvelopeSummary } from '../../../../features/dashboard/types';
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
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Envelopes</Title>
          <Text c="dimmed">Balances, archived status, and funding needs for every group envelope.</Text>
        </div>
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
    </Container>
  );
}
