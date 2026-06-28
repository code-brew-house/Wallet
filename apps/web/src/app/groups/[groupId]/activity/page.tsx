'use client';

import { Alert, Group, Loader, Stack } from '@mantine/core';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../../components/app-shell';
import { PageHeader } from '../../../../components/header';
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

  const todayItems = dashboard?.recentActivity.filter((item) => new Date(item.occurredAt).toDateString() === new Date().toDateString()) ?? [];
  const earlierItems = dashboard?.recentActivity.filter((item) => new Date(item.occurredAt).toDateString() !== new Date().toDateString()) ?? [];

  return (
    <AppShell groupId={params.groupId} active="activity">
      <PageHeader
        overline="Ledger"
        title="Activity"
        description="A chronological ledger of envelope funding, transfers, and expenses."
        tone="info"
      />
      <Stack gap="lg">
        {error ? <Alert color="red">{error}</Alert> : null}
        {isLoading ? <Group justify="center"><Loader /></Group> : null}
        {!isLoading && dashboard?.recentActivity.length === 0 ? (
          <Alert color="blue" title="No activity yet">
            Funding entries, envelope transfers, and expense confirmations appear here once your group starts using envelopes.
          </Alert>
        ) : null}
        <ActivityGroup title="Today" items={todayItems} moneyFormatter={moneyFormatter} />
        <ActivityGroup title="Earlier" items={earlierItems} moneyFormatter={moneyFormatter} />
      </Stack>
    </AppShell>
  );
}

function ActivityGroup({
  title,
  items,
  moneyFormatter,
}: {
  title: string;
  items: NonNullable<DashboardSummary['recentActivity']>;
  moneyFormatter: Intl.NumberFormat;
}) {
  if (items.length === 0) return null;

  return (
    <section className="wallet-section">
      <div className="wallet-overline">{title}</div>
      <div className="wallet-table-card">
        <div className="wallet-table-header"><span /> <span>Item</span><span>Amount</span></div>
        {items.map((item) => {
          const status = item.type === 'expense' ? 'wallet-status-danger' : item.type === 'funding' ? 'wallet-status-success' : '';
          return (
            <div key={`${item.type}-${item.id}`} className="wallet-table-row">
              <span className={`wallet-status-dot ${status}`} aria-hidden="true" />
              <div>
                <strong>{item.title}</strong>
                <div className="wallet-muted">{item.type} · {new Date(item.occurredAt).toLocaleString()}</div>
              </div>
              <strong>{moneyFormatter.format(item.amountMinor / 100)}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
