'use client';

import { Alert, Card, Container, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { DashboardSummary } from '../../../../features/dashboard/types';
import { apiClient } from '../../../../lib/api-client';

export default function GroupReportsPage() {
  const params = useParams<{ groupId: string }>();
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const moneyFormatter = useMemo(() => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }), []);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.request<DashboardSummary>(`/groups/${params.groupId}/dashboard`);
        if (!cancelled) setDashboard(response);
      } catch (requestError) {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load reports');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadReports();
    return () => {
      cancelled = true;
    };
  }, [params.groupId]);

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Reports</Title>
          <Text c="dimmed">Envelope totals, monthly spending, attention counts, and recurring obligations.</Text>
        </div>
        {error ? <Alert color="red">{error}</Alert> : null}
        {isLoading ? <Group justify="center"><Loader /></Group> : null}
        {dashboard ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            <Card withBorder padding="lg" radius="md"><Text c="dimmed" size="sm">Total available</Text><Title order={2}>{moneyFormatter.format(dashboard.totalAvailableMinor / 100)}</Title></Card>
            <Card withBorder padding="lg" radius="md"><Text c="dimmed" size="sm">Spent this month</Text><Title order={2}>{moneyFormatter.format(dashboard.spentThisMonthMinor / 100)}</Title></Card>
            <Card withBorder padding="lg" radius="md"><Text c="dimmed" size="sm">Overspent envelopes</Text><Title order={2}>{dashboard.overspent.length}</Title></Card>
            <Card withBorder padding="lg" radius="md"><Text c="dimmed" size="sm">Upcoming recurring</Text><Title order={2}>{dashboard.upcomingRecurring.length}</Title></Card>
          </SimpleGrid>
        ) : null}
        {!isLoading && dashboard?.envelopes.length === 0 ? (
          <Alert color="blue" title="Reports start with envelopes">
            Spending trends, envelope burn-down, and recurring expense forecasts appear here after envelopes receive funding and expenses.
          </Alert>
        ) : null}
      </Stack>
    </Container>
  );
}
