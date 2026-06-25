'use client';

import { Alert, Badge, Card, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { DashboardSummary } from '../../../../features/dashboard/types';
import { apiClient } from '../../../../lib/api-client';

export default function GroupActivityPage() {
  const params = useParams<{ groupId: string }>();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const moneyFormatter = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }), []);

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.request<DashboardSummary>(`/groups/${params.groupId}/dashboard`);
        if (!cancelled) setDashboard(response);
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load activity');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadActivity();
    return () => {
      cancelled = true;
    };
  }, [params.groupId]);

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Activity</Title>
          <Text c="dimmed">A chronological ledger of envelope funding, transfers, and expenses.</Text>
        </div>
        {error ? <Alert color="red">{error}</Alert> : null}
        {isLoading ? <Group justify="center"><Loader /></Group> : null}
        {!isLoading && dashboard?.recentActivity.length === 0 ? (
          <Alert color="blue" title="No activity yet">
            Funding entries, envelope transfers, and expense confirmations appear here once your group starts using envelopes.
          </Alert>
        ) : null}
        <Stack gap="sm">
          {dashboard?.recentActivity.map((item) => (
            <Card key={`${item.type}-${item.id}`} withBorder radius="md" padding="md">
              <Group justify="space-between" align="start">
                <div>
                  <Group gap="xs"><Text fw={700}>{item.title}</Text><Badge variant="light">{item.type}</Badge></Group>
                  <Text size="sm" c="dimmed">{new Date(item.occurredAt).toLocaleString()}</Text>
                </div>
                <Text fw={700}>{moneyFormatter.format(item.amountMinor / 100)}</Text>
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
