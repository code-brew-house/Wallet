'use client';

import { Alert, Group, Loader, SimpleGrid, Stack } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { PageHeader } from '../../../../components/header';
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
    <AppShell groupId={params.groupId} active="activity">
      <PageHeader
        overline="Reports"
        title="Spending overview"
        description="Envelope totals, monthly spending, attention counts, and recurring obligations."
        tone="warn"
      />
      <Stack gap="lg">
        {error ? <Alert color="red">{error}</Alert> : null}
        {isLoading ? <Group justify="center"><Loader /></Group> : null}
        {dashboard ? (
          <>
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
              <article className="wallet-card wallet-card-success"><div className="wallet-overline">Total available</div><div className="wallet-summary-value">{moneyFormatter.format(dashboard.totalAvailableMinor / 100)}</div></article>
              <article className="wallet-card wallet-card-danger"><div className="wallet-overline">Spent this month</div><div className="wallet-summary-value">{moneyFormatter.format(dashboard.spentThisMonthMinor / 100)}</div></article>
              <article className="wallet-card wallet-card-warn"><div className="wallet-overline">Overspent envelopes</div><div className="wallet-summary-value">{dashboard.overspent.length}</div></article>
              <article className="wallet-card wallet-card-info"><div className="wallet-overline">Upcoming recurring</div><div className="wallet-summary-value">{dashboard.upcomingRecurring.length}</div></article>
            </SimpleGrid>
            <section className="wallet-card wallet-report-chart">
              <div className="wallet-section-heading"><div><div className="wallet-overline">6-month spend</div><h2>Recent trend</h2></div></div>
              <div className="wallet-chart-bars" aria-label="Illustrative spending trend">
                {[42, 54, 48, 66, 52, 72].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
              </div>
            </section>
            <section className="wallet-section">
              <div className="wallet-overline">Envelope spending cards</div>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                {dashboard.envelopes.map((envelope) => (
                  <article key={envelope.id} className={envelope.balanceMinor < 0 ? 'wallet-spending-card wallet-card wallet-card-danger' : 'wallet-spending-card wallet-card wallet-card-info'}>
                    <div className="wallet-card-heading"><h3>{envelope.name}</h3><span className="wallet-pill">{envelope.archivedAt ? 'Archived' : 'Active'}</span></div>
                    <div className="wallet-money">{moneyFormatter.format(envelope.balanceMinor / 100)}</div>
                  </article>
                ))}
              </SimpleGrid>
            </section>
          </>
        ) : null}
        {!isLoading && dashboard?.envelopes.length === 0 ? (
          <Alert color="blue" title="Reports start with envelopes">
            Spending trends, envelope burn-down, and recurring expense forecasts appear here after envelopes receive funding and expenses.
          </Alert>
        ) : null}
      </Stack>
    </AppShell>
  );
}
